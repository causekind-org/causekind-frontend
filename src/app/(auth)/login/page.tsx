"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving, resolvePostAuthDestination, socialCompletionUrl } from "@/lib/postAuthDestination";
import { login, googleAuth } from "@/lib/api";
import { Check, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { Reveal } from "@/components/Reveal";
import { useReducedMotion } from "framer-motion";
import { isGenericCredentialFailure, validateEmail, validateLoginPassword } from "@/features/auth-validation/authValidation";
import { useTimedFieldValidation } from "@/features/auth-validation/useTimedFieldValidation";
import { ValidatedFieldFeedback, fieldStateClass } from "@/features/auth-validation/ValidatedFieldFeedback";
import { AuthFormAlert } from "@/features/auth-validation/AuthFormAlert";

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
  const { setUser, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to land after sign-in. Guests bounced off a protected destination
  // (`/requests/<id>/offer`, say) arrive with `?next=` and should be returned
  // there rather than dumped on the homepage to find their way back.
  // `safeInternalPath` is what stops that parameter becoming an open redirect —
  // it is attacker-controlled, so anything not plainly a path on this origin is
  // discarded in favour of the role's normal landing page.
  //
  // A donee arriving with an offer destination is redirected to their own
  // requests view with an explanation rather than into the donor wizard —
  // `resolvePostAuthDestination` owns that decision so login and register
  // cannot disagree about it.
  const rawNext = searchParams.get("next");
  const goAfterAuth = (role: string | null, navigate: (p: string) => void) => {
    const { path, notice } = resolvePostAuthDestination(rawNext, role);
    if (notice) toast.error(notice);
    navigate(path);
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const reduced = !!useReducedMotion();

  const tv = useTranslations("auth.validation");
  const v = useTimedFieldValidation();
  const emailField = v.get("email");
  const passwordField = v.get("password");

  // Rebuilt on each render from current values — the hook holds timing state,
  // never a copy of the form values.
  const validators = {
    email: () => validateEmail(email),
    password: () => validateLoginPassword(password),
  };

  const triggerGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const res = await googleAuth(tokenResponse.access_token);
        if (res.needsCompletion) {
          sessionStorage.setItem("ck_google_token", tokenResponse.access_token);
          sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
          // The destination has to survive account completion too — otherwise
          // a guest who signs in with a brand-new Google account finishes
          // registration and lands on the homepage, having lost the request.
          router.push(socialCompletionUrl(rawNext));
        } else {
          // Fix #4: cookie set by server; use role from response directly
          setUser({ email: res.email, role: res.role });
          toast.success("Welcome back!");
          goAfterAuth(res.role, router.push);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Google login failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast.error("Google sign-in failed"),
  });

  // Already signed in and landing on /login — usually a bookmark, or a guest
  // who authenticated in another tab. Still honours `next`, so the round trip
  // completes rather than dumping them on their role's home page.
  useEffect(() => { if (user) goAfterAuth(user.role, router.replace); }, [user, router]);

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
    if (loading || signedIn) return; // no duplicate submissions

    // Safety net for fields never touched. No request leaves until this passes.
    const firstInvalid = v.validateAll(validators);
    if (firstInvalid) {
      const el = document.getElementById(firstInvalid);
      el?.focus();
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password, rememberMe);

      // Brief visual confirmation before routing. Reduced-motion users skip it
      // entirely rather than being held back for an animation they disabled.
      setSignedIn(true);
      const settle = () => {
        setUser({ email: res.email, role: res.role });
        goAfterAuth(res.role, router.push);
      };
      if (reduced) settle();
      else setTimeout(settle, 380);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // A 401 must not say which half was wrong, nor whether the account exists.
      // Operational states (locked, suspended, rate-limited) stay verbatim.
      setFormError(isGenericCredentialFailure(raw) ? tv("invalidCredentials") : raw);
      setLoading(false);
    }
  }

  function goToRegister(e: React.MouseEvent) {
    e.preventDefault();
    // "Create account" is the other half of the same journey — a guest who
    // came here to offer an item and has no account yet must still end up back
    // at the request once they have one.
    router.push(registerUrlPreserving(rawNext));
  }

  return (
    <div className="w-full max-w-[420px] mx-auto space-y-5 sm:space-y-7 relative z-10 bg-white/85 dark:bg-zinc-900/75 backdrop-blur-sm border border-white/60 dark:border-zinc-700/30 rounded-2xl sm:rounded-3xl px-5 py-6 sm:px-8 sm:py-10 shadow-xl">
          {/* Heading */}
          <Reveal>
            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">Welcome back</span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                {t("title")} 👋
              </h1>
              {/* was text-stone-505 — not a real Tailwind shade, so no colour was
                  emitted at all and this inherited instead. */}
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {t("subtitle")}
              </p>
            </div>
          </Reveal>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* Form-level, not per-field: a credential failure belongs to
                neither input, and pinning it to one would leak which was wrong. */}
            <AuthFormAlert message={formError} />

            <Reveal delay={80}>
              {/* Email */}
              <div className="space-y-1 sm:space-y-1.5">
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  {t("email")}
                </label>
                {/* text-base on both inputs is load-bearing: iOS Safari zooms the
                    viewport on focus for anything under 16px and never zooms back
                    out. Shrink the padding on mobile, never the font-size. */}
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={emailField.status === "invalid" || undefined}
                  aria-describedby={emailField.status === "invalid" || emailField.status === "valid" ? "email-feedback" : undefined}
                  onChange={e => {
                    setEmail(e.target.value);
                    setFormError(null);
                    v.onChange("email", () => validateEmail(e.target.value));
                  }}
                  onBlur={() => v.onBlur("email", validators.email)}
                  onCompositionStart={() => v.onCompositionStart("email")}
                  onCompositionEnd={() => v.onCompositionEnd("email", validators.email)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition bg-stone-50 dark:bg-zinc-900 ${fieldStateClass(emailField.status)}`}
                />
                <ValidatedFieldFeedback
                  id="email-feedback"
                  status={emailField.status}
                  errorKey={emailField.errorKey}
                  successKey={emailField.successKey}
                  params={emailField.params}
                  serverText={emailField.serverErrorText}
                />
              </div>
            </Reveal>

            <Reveal delay={120}>
              {/* Password */}
              <div className="space-y-1 sm:space-y-1.5">
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
                    aria-invalid={passwordField.status === "invalid" || undefined}
                    aria-describedby={passwordField.status === "invalid" ? "password-feedback" : undefined}
                    onChange={e => {
                      setPassword(e.target.value);
                      setFormError(null);
                      v.onChange("password", () => validateLoginPassword(e.target.value));
                    }}
                    onBlur={() => v.onBlur("password", validators.password)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 pr-11 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition bg-stone-50 dark:bg-zinc-900 ${fieldStateClass(passwordField.status)}`}
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
                {/* No success state here: a non-empty password is not a correct
                    one, and only the server can say. It stays neutral until
                    authentication actually succeeds. */}
                <ValidatedFieldFeedback
                  id="password-feedback"
                  status={passwordField.status}
                  errorKey={passwordField.errorKey}
                  successKey={null}
                  params={passwordField.params}
                  serverText={passwordField.serverErrorText}
                />
              </div>
            </Reveal>

            <Reveal delay={160}>
              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group mb-3 sm:mb-4">
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
              {/* Disabled only while a request is in flight or after success —
                  never merely because untouched fields are empty, which would
                  remove submit as the safety net that reveals what is missing. */}
              <button
                type="submit"
                disabled={loading || signedIn}
                className={`w-full rounded-xl disabled:opacity-60 text-white font-semibold py-3 sm:py-3.5 text-sm tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  signedIn
                    ? "bg-emerald-600 focus-visible:ring-emerald-600"
                    : "bg-[#b04a15] hover:bg-[#963c0d] focus-visible:ring-[#b04a15] animate-heartbeat"
                }`}
              >
                {signedIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    {tv("signedIn")}
                  </span>
                ) : loading ? t("signingIn") : t("signIn")}
              </button>
            </Reveal>
          </form>

          {/* Social buttons */}
          <div className="space-y-2.5 sm:space-y-3">
            <Reveal delay={240}>
              <button
                type="button"
                disabled={googleLoading}
                onClick={() => {
                  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                    toast.error("Google Sign-In is not configured.");
                    return;
                  }
                  triggerGoogle();
                }}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-3 sm:px-4 sm:py-3.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
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
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-100 dark:border-zinc-800/60 bg-stone-50 dark:bg-zinc-900/60 px-3.5 py-3 sm:px-4 sm:py-3.5 text-sm font-medium text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-70"
                >
                  <FacebookIcon />
                  {t("facebook")}
                </button>
                {/* Coming Soon badge */}
                <span className="absolute -top-2 -right-2 text-4xs font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-[#b04a15] border border-[#e07b3a]/40 shadow-sm pointer-events-none select-none">
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
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
