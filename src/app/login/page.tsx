"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error("Your session has expired. Please log in again.");
    }
  }, [searchParams]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { const { token } = await login(email, password); setAuth(token); toast.success("Welcome back!"); router.push("/"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12 overflow-hidden">
      <ParticleBackground className="z-0" />
      <div className="relative z-10 flex flex-col items-center w-full">
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
          <path d="M12 10.5C12 10.5 9.2 8 9.2 6.2C9.2 5.1 10.2 4.5 11.1 4.9C11.6 5.2 12 5.7 12 5.7C12 5.7 12.4 5.2 12.9 4.9C13.8 4.5 14.8 5.1 14.8 6.2C14.8 8 12 10.5 12 10.5Z" fill="white"/>
          <path d="M12 11.2 L12 12.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.55"/>
          <path d="M6.5 16.5C6.5 14.2 8 12.8 9.8 12.8L14.2 12.8C16 12.8 17.5 14.2 17.5 16.5C17.5 18.2 15.2 19.5 12 19.5C8.8 19.5 6.5 18.2 6.5 16.5Z" fill="white" fillOpacity="0.82"/>
        </svg>
      </div>

      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none">
        <CardHeader className="space-y-1.5 pb-5">
          <CardTitle className="text-2xl font-extrabold text-[#1c1108] dark:text-white">Welcome back</CardTitle>
          <CardDescription className="text-stone-400 dark:text-stone-500 font-medium">Log in to your CauseKind account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-stone-700 dark:text-stone-300">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)} required
                className="rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-stone-700 dark:text-stone-300">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  className="pr-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-[#b04a15] dark:text-[#ff8a65] hover:underline underline-offset-2">Forgot password?</Link>
            </div>
            <Button type="submit" className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl py-5 font-semibold text-sm" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400 font-medium">
              New here?{" "}<Link href="/register" className="font-semibold text-[#b04a15] dark:text-[#ff8a65] hover:underline underline-offset-2">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
