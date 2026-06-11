"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resetPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!token) { toast.error("Invalid reset link."); router.replace("/forgot-password"); } }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error("Passwords do not match."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    try { await resetPassword(token, newPassword); toast.success("Password reset! Please log in."); router.push("/login"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Invalid or expired reset link."); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {[
        { id:"newPassword", label:"New password",         placeholder:"Min. 8 characters",       value:newPassword, onChange:setNewPassword },
        { id:"confirm",     label:"Confirm new password", placeholder:"Repeat your new password", value:confirm,      onChange:setConfirm },
      ].map(f => (
        <div key={f.id} className="space-y-2">
          <Label htmlFor={f.id} className="font-semibold text-stone-700 dark:text-stone-300">{f.label}</Label>
          <Input id={f.id} type="password" placeholder={f.placeholder} autoComplete="new-password"
            value={f.value} onChange={e => f.onChange(e.target.value)} required
            className="rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
        </div>
      ))}
      <Button type="submit" className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl py-5 font-semibold text-sm" disabled={loading}>
        {loading ? "Resetting…" : "Reset password"}
      </Button>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400 font-medium">
        <Link href="/login" className="font-semibold text-[#b04a15] dark:text-[#ff8a65] hover:underline underline-offset-2">Back to login</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12">
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <KeyRound className="h-6 w-6" />
      </div>
      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none">
        <CardHeader className="space-y-1.5 pb-5">
          <CardTitle className="text-2xl font-extrabold text-[#1c1108] dark:text-white">Set a new password</CardTitle>
          <CardDescription className="text-stone-400 dark:text-stone-500 font-medium">Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
