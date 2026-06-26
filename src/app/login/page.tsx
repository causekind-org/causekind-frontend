"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { login, googleAuth } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { Reveal } from "@/components/Reveal";

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

// Role-based landing destination after auth.
function homeForRole(role: string | null): string {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/";
}

// ── Main content ───────────────────────────────────────────────────────────────
function LoginContent() {
  const t = useTranslations("auth.login");
  const { setUser, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  // Start with no animation class — set AFTER mount so the correct direction is known
  const [panelAnimClass, setPanelAnimClass] = useState("");

  const triggerGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const res = await googleAuth(tokenResponse.access_token);
        if (res.needsCompletion) {
          sessionStorage.setItem("ck_google_token", tokenResponse.access_token);
          sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
          router.push("/register?social=google");
        } else {
          // Fix #4: cookie set by server; use role from response directly
          setUser({ email: res.email, role: res.role });
          toast.success("Welcome back!");
          router.push(homeForRole(res.role));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Google login failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast.error("Google sign-in failed"),
  });

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  useEffect(() => {
    const dir = sessionStorage.getItem("ck_auth_direction");
    // Set direction-aware class AFTER mount so animation plays with correct direction
    setPanelAnimClass(dir === "register-to-login" ? "auth-panel-from-right" : "auth-panel-from-left");
    if (dir) sessionStorage.removeItem("ck_auth_direction");
  }, []);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error(t("sessionExpired"));
      // Remove ?expired=1 from URL so re-submitting wrong password doesn't re-trigger this toast
      const url = new URL(window.location.href);
      url.searchParams.delete("expired");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, t]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Fix #4: backend sets httpOnly cookie; we only use email+role from response
      const res = await login(email, password, rememberMe);
      setUser({ email: res.email, role: res.role });
      toast.success("Welcome back!");
      router.push(homeForRole(res.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  function goToRegister(e: React.MouseEvent) {
    e.preventDefault();
    // flag so register page plays the slide-in-from-right animation
    sessionStorage.setItem("ck_auth_direction", "login-to-register");
    router.push("/register");
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">

      {/* ── LEFT: Brand/Image panel — slides in from direction of navigation ── */}
      <div className={`hidden lg:flex lg:w-[40%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] border-r border-stone-850 shrink-0 ${panelAnimClass}`}>
        {/* Warmth glows */}
        <div className="absolute -top-24 left-1/4 h-[350px] w-[350px] rounded-full bg-[#b04a15]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-[350px] w-[350px] rounded-full bg-[#1e3a60]/15 blur-3xl pointer-events-none" />
        
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1">
            Verified In-Kind
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-4">
            <p className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif">
              &ldquo;The smallest act of kindness is worth more than the grandest intention.&rdquo;
            </p>
            <footer className="flex items-center gap-2">
              <span className="block h-px w-8 bg-[#e07b3a]" />
              <cite className="text-[#f0b97a] text-sm not-italic font-bold">Oscar Wilde</cite>
            </footer>
          </blockquote>
        </div>

        {/* Decorative graphic / background image */}
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none mix-blend-luminosity">
          <Image
            src="/images/hero-4.webp"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120c04] via-transparent to-[#120c04]" />
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India · 2026
        </div>
      </div>

      {/* ── RIGHT: Form panel — fades in ── */}
      <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-950 px-6 py-10 lg:px-16 overflow-y-auto relative overflow-hidden auth-form-appear">
        {/* Breathing warmth glows representing community light & hope */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#b04a15]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#1e3a60]/5 blur-3xl pointer-events-none" />

        <div />

        <div className="w-full max-w-[400px] mx-auto space-y-7 relative z-10">
          {/* Heading */}
          <Reveal>
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Welcome back</span>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-55">
                {t("title")} 👋
              </h1>
              <p className="text-sm text-stone-505 dark:text-stone-400">
                {t("subtitle")}
              </p>
            </div>
          </Reveal>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Reveal delay={80}>
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
            </Reveal>

            <Reveal delay={120}>
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
            </Reveal>

            <Reveal delay={160}>
              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group mb-4">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 accent-[#b04a15] cursor-pointer"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors">
                  Remember me
                </span>
                <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
                  {rememberMe ? "Stay logged in" : "Log out on close"}
                </span>
              </label>
            </Reveal>

            <Reveal delay={200}>
              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-60 text-white font-semibold py-3.5 text-sm tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 animate-heartbeat"
              >
                {loading ? t("signingIn") : t("signIn")}
              </button>
            </Reveal>
          </form>

          {/* Social buttons */}
          <div className="space-y-3">
            <Reveal delay={240}>
              <button
                type="button"
                disabled={googleLoading}
                onClick={() => triggerGoogle()}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading ? t("signingIn") : t("google")}
              </button>
            </Reveal>
            <Reveal delay={280}>
              <div className="relative">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-100 dark:border-zinc-800/60 bg-stone-50 dark:bg-zinc-900/60 px-4 py-3.5 text-sm font-medium text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-70"
                >
                  <FacebookIcon />
                  {t("facebook")}
                </button>
                {/* Coming Soon badge */}
                <span className="absolute -top-2 -right-2 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-[#b04a15] border border-[#e07b3a]/40 shadow-sm pointer-events-none select-none">
                  Coming Soon
                </span>
              </div>
            </Reveal>
          </div>

          {/* Cross-link */}
          <Reveal delay={320}>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400">
              {t("noAccount")}{" "}
              <a
                href="/register"
                onClick={goToRegister}
                className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2 cursor-pointer"
              >
                {t("signUp")}
              </a>
            </p>
          </Reveal>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-stone-400 dark:text-zinc-600">
          &copy; 2026 CauseKind
        </p>
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
