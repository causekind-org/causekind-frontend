import type { Metadata } from "next";
import RazorpayPolicyClient from "./RazorpayPolicyClient";

// Server wrapper so the page has its own title, description and canonical.
export const metadata: Metadata = {
  title: "Payments Policy (Razorpay)",
  description: "How CauseKind handles money donations made through Razorpay, including receipts, tax certificates, refunds and cancellations.",
  alternates: { canonical: "/razorpay" },
};

export default function RazorpayPolicyPage() {
  return <RazorpayPolicyClient />;
}
