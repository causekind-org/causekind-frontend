"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { initiateDonation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

type Props = {
  campaignId: number;
  campaignTitle: string;
  amount: number;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function DonateButton({ campaignId, campaignTitle, amount }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDonate() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!amount || isNaN(amount) || amount < 1) {
      toast.error("Enter a valid amount (minimum ₹1)");
      return;
    }
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay. Check your connection.");
        return;
      }
      const order = await initiateDonation(campaignId, amount);
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: "CauseKind",
        description: campaignTitle,
        order_id: order.razorpayOrderId,
        prefill: { email: user.email },
        theme: { color: "#0f172a" },
        handler: () => {
          toast.success("Payment successful! Thank you for your donation.");
          router.refresh();
        },
        modal: { ondismiss: () => toast.info("Payment cancelled.") },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" size="lg" onClick={handleDonate} disabled={loading}>
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
      ) : user ? (
        `Donate ₹${amount.toLocaleString("en-IN")}`
      ) : (
        "Log in to donate"
      )}
    </Button>
  );
}
