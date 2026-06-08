"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ThankYouContent() {
  const params = useSearchParams();
  const campaign = params.get("campaign") ?? "this campaign";
  const amount = Number(params.get("amount") ?? 0);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="pt-10 pb-8 space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Thank you for your donation!</h1>
            <p className="text-muted-foreground">
              Your donation of{" "}
              <span className="font-semibold text-foreground">
                ₹{amount.toLocaleString("en-IN")}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">{campaign}</span>{" "}
              is confirmed.
            </p>
          </div>

          <div className="rounded-lg bg-accent/40 p-4 text-sm text-muted-foreground flex items-start gap-2">
            <Heart className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
            <span>Your generosity makes a real difference. The campaign organiser has been notified of your donation.</span>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full">View my donations</Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" className="w-full">Browse more campaigns</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
