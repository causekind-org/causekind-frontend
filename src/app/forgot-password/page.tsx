"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { forgotPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await forgotPassword(email); setSent(true); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12">
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <Mail className="h-6 w-6" />
      </div>
      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none">
        <CardHeader className="space-y-1.5 pb-5">
          <CardTitle className="text-2xl font-extrabold text-[#1c1108] dark:text-white">Forgot your password?</CardTitle>
          <CardDescription className="text-stone-400 dark:text-stone-500 font-medium">Enter your email and we&apos;ll send you a link to reset it.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                If <span className="font-semibold text-stone-800 dark:text-stone-200">{email}</span> is registered, you&apos;ll receive a reset link shortly.
              </p>
              <Link href="/login" className="text-sm font-semibold text-[#b04a15] dark:text-[#ff8a65] hover:underline underline-offset-2">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-stone-700 dark:text-stone-300">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  className="rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
              </div>
              <Button type="submit" className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl py-5 font-semibold text-sm" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-stone-500 dark:text-stone-400 font-medium">
                Remembered it?{" "}<Link href="/login" className="font-semibold text-[#b04a15] dark:text-[#ff8a65] hover:underline underline-offset-2">Log in</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
