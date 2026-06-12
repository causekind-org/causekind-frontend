"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { register, googleAuth, googleComplete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

function RegisterContent() {
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSocialFlow = searchParams.get("social") === "google";

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", city: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  // Pre-fill from Google if coming from Google OAuth flow
  useEffect(() => {
    if (isSocialFlow) {
      const token = sessionStorage.getItem("ck_google_token");
      const profile = sessionStorage.getItem("ck_google_profile");
      if (token && profile) {
        const { email, fullName } = JSON.parse(profile);
        setGoogleIdToken(token);
        setForm(f => ({ ...f, email: email ?? "", fullName: fullName ?? "" }));
      } else {
        // No Google data in session — send back to login
        router.replace("/login");
      }
    }
  }, [isSocialFlow, router]);

  if (user) return null;

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSocialFlow && googleIdToken) {
        // Complete Google registration with phone + city
        const res = await googleComplete(googleIdToken, form.phone, form.city);
        if (!res.needsCompletion) {
          sessionStorage.removeItem("ck_google_token");
          sessionStorage.removeItem("ck_google_profile");
          setAuth(res.token);
          toast.success("Account created! Welcome to CauseKind.");
          router.push("/");
        }
      } else {
        const { token } = await register(form);
        setAuth(token);
        toast.success("Account created!");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setGoogleLoading(true);
    try {
      const res = await googleAuth(credentialResponse.credential);
      if (res.needsCompletion) {
        sessionStorage.setItem("ck_google_token", credentialResponse.credential);
        sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
        router.push("/register?social=google");
      } else {
        setAuth(res.token);
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12 overflow-hidden">
      <ParticleBackground className="z-0" />
      <div className="relative z-10 flex flex-col items-center w-full">
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1e3a60] to-[#2d5a96] text-white shadow-md shadow-blue-900/15 shrink-0 anim-scale">
        <Sparkles className="h-6 w-6" />
      </div>

      <Card className="anim-up anim-d1 w-full max-w-xl glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none">
        <CardHeader className="space-y-1.5 pb-5">
          <CardTitle className="text-2xl font-extrabold text-[#963c0d] dark:text-white">
            {isSocialFlow ? "Almost there — finish your profile" : "Create your CauseKind account"}
          </CardTitle>
          <CardDescription className="text-stone-400 dark:text-stone-500 font-medium">
            {isSocialFlow
              ? "Your Google account is linked. Just add your phone and city to complete setup."
              : "Join CauseKind to donate or request local in-kind support."}
          </CardDescription>
        </CardHeader>
        <CardContent>

          {/* Google button — only show on normal registration, not social completion */}
          {!isSocialFlow && (
            <>
              <div className={`mb-5 flex justify-center transition-opacity ${googleLoading ? "opacity-50 pointer-events-none" : ""}`}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error("Google sign-up failed")}
                  width="490"
                  theme="outline"
                  shape="rectangular"
                  text="signup_with"
                  size="large"
                />
              </div>
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-orange-100 dark:border-stone-800" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-stone-400 font-semibold uppercase tracking-wider">or sign up with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-semibold text-stone-700 dark:text-stone-300">Full name</Label>
                <Input id="fullName" type="text" placeholder="Enter your full name"
                  value={form.fullName} onChange={e => set("fullName", e.target.value)} required
                  readOnly={isSocialFlow && !!form.fullName}
                  className={`rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100 ${isSocialFlow && form.fullName ? "opacity-70 cursor-not-allowed" : ""}`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-semibold text-stone-700 dark:text-stone-300">Phone</Label>
                <Input id="phone" type="tel" placeholder="10-digit phone number"
                  value={form.phone} onChange={e => set("phone", e.target.value)} required
                  className="rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="font-semibold text-stone-700 dark:text-stone-300">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email address" autoComplete="email"
                  value={form.email} onChange={e => set("email", e.target.value)} required
                  readOnly={isSocialFlow}
                  className={`rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100 ${isSocialFlow ? "opacity-70 cursor-not-allowed" : ""}`} />
                {isSocialFlow && <p className="text-xs text-stone-400">Linked from your Google account</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="font-semibold text-stone-700 dark:text-stone-300">City</Label>
                <Input id="city" placeholder="Enter your city" value={form.city} onChange={e => set("city", e.target.value)} required
                  className="rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
              </div>
              {!isSocialFlow && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold text-stone-700 dark:text-stone-300">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                      placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} required
                      className="pr-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-stone-800 dark:text-stone-100" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button type="submit" className="btn-3d btn-shine w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl py-5 font-semibold text-sm mt-2" disabled={loading}>
              {loading ? (isSocialFlow ? "Creating account…" : "Creating account…") : (isSocialFlow ? "Complete registration" : "Create account")}
            </Button>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400 font-medium">
              Already have one?{" "}<Link href="/login" className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
