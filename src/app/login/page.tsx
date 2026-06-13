"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { login, googleAuth } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

// ── Inline brand SVGs ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2"/>
    </svg>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────
function LoginContent() {
  const t = useTranslations("auth.login");
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  function triggerGoogle() {
    const btn = googleBtnRef.current?.querySelector<HTMLElement>('div[role="button"], button');
    btn?.click();
  }

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error(t("sessionExpired"));
    }
  }, [searchParams, t]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await login(email, password);
      setAuth(token);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
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
      toast.error(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex">

      {/* ── LEFT: Form panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-950 px-6 py-8 sm:py-10 lg:max-w-[480px] lg:px-12 overflow-y-auto">

        <div />

        <div className="w-full max-w-[400px] mx-auto space-y-7">

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {t("title")} 👋
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t("subtitle")}
            </p>
          </div>

          {/* Hidden Google SSO */}
          <div ref={googleBtnRef} aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google sign-in failed")}
              width="300"
            />
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  {t("password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 pr-11 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-60 text-white font-semibold py-3 text-sm tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2"
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>

          {/* Social buttons */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={googleLoading}
              onClick={triggerGoogle}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
            >
              <GoogleIcon />
              {googleLoading ? t("signingIn") : t("google")}
            </button>
            <button
              type="button"
              onClick={() => toast.info("Social sign-in coming soon")}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              <FacebookIcon />
              {t("facebook")}
            </button>
          </div>

          {/* Cross-link */}
          <p className="text-center text-sm text-stone-500 dark:text-stone-400">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2">
              {t("signUp")}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-stone-400 dark:text-zinc-600">
          &copy; 2026 CauseKind
        </p>
      </div>

      {/* ── RIGHT: Image panel (hidden on mobile) ──────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative p-6">
        <div className="relative w-full h-full rounded-3xl overflow-hidden">
          <Image
            src="/images/hero-4.jpg"
            alt="People helping each other in the community"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <blockquote className="space-y-3">
              <p className="text-white text-2xl font-bold leading-snug" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                &ldquo;The smallest act of kindness is worth more than the grandest intention.&rdquo;
              </p>
              <footer className="flex items-center gap-2">
                <span className="block h-px w-8 bg-white/50" />
                <cite className="text-white/70 text-sm not-italic font-medium">Oscar Wilde</cite>
              </footer>
            </blockquote>
          </div>
        </div>
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
