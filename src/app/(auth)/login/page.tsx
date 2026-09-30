"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving, resolvePostAuthDestination, socialCompletionUrl } from "@/lib/postAuthDestination";
import { login, googleAuth } from "@/lib/api";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useReducedMotion } from "framer-motion";
import { isGenericCredentialFailure, validateEmail, validateLoginPassword } from "@/features/auth-validation/authValidation";
import { useTimedFieldValidation } from "@/features/auth-validation/useTimedFieldValidation";
import { ValidatedFieldFeedback, fieldStateClass } from "@/features/auth-validation/ValidatedFieldFeedback";
import { AuthFormAlert } from "@/features/auth-validation/AuthFormAlert";
import { useAuthOperation } from "@/features/auth-validation/useAuthOperation";

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



// ── Editorial card styles (scoped to this card; no global input overrides) ─────
const LABEL = "mb-1.5 block text-[13px] font-semibold text-stone-700 dark:text-stone-300";
/** Opaque surface, 1px border, small radius; text-base (16px) avoids iOS zoom. */
const INPUT =
  "block w-full min-w-0 min-h-12 rounded-lg border bg-white dark:bg-zinc-900 px-3.5 text-base " +
  "text-stone-900 dark:text-stone-100 placeholder:text-[14px] placeholder:text-stone-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 transition-colors";

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const reduced = !!useReducedMotion();

  // One lock for password and Google sign-in: they must never overlap, or two
  // sessions / two redirects could race. See useAuthOperation.
  const auth = useAuthOperation();
  const googleOpId = useRef(0);

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
      const id = googleOpId.current;
      // A popup that resolves after its attempt was cancelled/replaced is ignored.
      if (!auth.isCurrent(id)) return;
      try {
        const res = await googleAuth(tokenResponse.access_token);
        if (!auth.succeed(id)) return;
        if (res.needsCompletion) {
          sessionStorage.setItem("ck_google_token", tokenResponse.access_token);
          sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
          // The destination has to survive account completion too — otherwise
          // a guest who signs in with a brand-new Google account finishes
          // registration and lands on the homepage, having lost the request.
          router.push(socialCompletionUrl(rawNext));
        } else {
          // Fix #4: cookie set by server; use role from response directly
          setUser({ email: res.email, role: res.role, fullName: res.fullName });
          toast.success(t("welcomeBackToast"));
          goAfterAuth(res.role, router.push);
        }
      } catch (err) {
        auth.release(id);
        toast.error(err instanceof Error ? err.message : t("googleFailed"));
      }
    },
    onError: () => {
      auth.release(googleOpId.current);
      toast.error(t("googleFailed"));
    },
    // Popup closed / blocked. Closing is a normal choice, not an error, so it
    // only unlocks the form; a blocked popup says what to do about it.
    onNonOAuthError: (err) => {
      auth.release(googleOpId.current);
      if (err.type === "popup_failed_to_open") toast.error(t("googlePopupBlocked"));
      else if (err.type !== "popup_closed") toast.error(t("googleFailed"));
    },
  });

  function startGoogle() {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      toast.error("Google Sign-In is not configured.");
      return;
    }
    const id = auth.begin("google");
    if (id === null) return;
    googleOpId.current = id;
    setFormError(null);
    try {
      triggerGoogle();
    } catch {
      auth.release(id);
      toast.error(t("googleFailed"));
    }
  }

  // Already signed in and landing on /login — usually a bookmark, or a guest
  // who authenticated in another tab. Still honours `next`. Skipped when this
  // page itself just signed the user in: that path has already navigated, and
  // a second (replace) navigation would compete with it.
  useEffect(() => {
    if (user && !auth.isAuthenticated()) goAfterAuth(user.role, router.replace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, rawNext]);

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
    // Cheap pre-check; the real guard is auth.begin below (synchronous ref).
    if (auth.busy) return;

    // Safety net for fields never touched. No request leaves until this passes.
    const firstInvalid = v.validateAll(validators);
    if (firstInvalid) {
      const el = document.getElementById(firstInvalid);
      el?.focus();
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      return;
    }

    const id = auth.begin("password");
    if (id === null) return; // another sign-in is already running

    setFormError(null);
    try {
      const res = await login(email.trim(), password, rememberMe);
      if (!auth.succeed(id)) return;
      // No artificial delay: set the session and go. The page stays locked
      // (auth.op === "authenticated") until the navigation unmounts it.
      setUser({ email: res.email, role: res.role, fullName: res.fullName });
      goAfterAuth(res.role, router.push);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // A 401 must not say which half was wrong, nor whether the account exists.
      // Operational states (locked, suspended, rate-limited) stay verbatim.
      setFormError(isGenericCredentialFailure(raw) ? tv("invalidCredentials") : raw);
      auth.release(id);
    }
  }

  // Real, safe destination on the href itself (not only in the click handler),
  // so middle-click / "open in new tab" also keep a guest's offer destination.
  const registerHref = registerUrlPreserving(rawNext);

  return (
    <div className="w-full max-w-[420px] mx-auto relative z-10 bg-white/85 dark:bg-zinc-900/75 backdrop-blur-sm border border-white/60 dark:border-zinc-700/30 rounded-2xl sm:rounded-3xl px-5 py-6 sm:px-8 sm:py-9 shadow-xl">
      {/* ── Editorial heading ── */}
      <header>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#b04a15] dark:text-[#e07b3a]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-serif text-[30px] sm:text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-stone-900 dark:text-stone-50">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
          {t("subtitle")}
        </p>
      </header>

      {/* Email / Password form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
        {/* Form-level, not per-field: a credential failure belongs to
            neither input, and pinning it to one would leak which was wrong. */}
        <AuthFormAlert message={formError} />

        {/* Email */}
        <div>
          <label htmlFor="email" className={LABEL}>{t("email")}</label>
          {/* text-base is load-bearing: iOS Safari zooms the viewport on focus
              for anything under 16px and never zooms back out. */}
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
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
            className={`${INPUT} ${fieldStateClass(emailField.status)}`}
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

        {/* Password */}
        <div>
          {/* Wraps rather than colliding when a translation runs long. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <label htmlFor="password" className={LABEL}>{t("password")}</label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#b04a15] dark:text-[#e07b3a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] rounded-sm"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
              // pr-12 reserves the 44px toggle, so typed text never runs under it.
              className={`${INPUT} pr-12 ${fieldStateClass(passwordField.status)}`}
            />
            <button
              type="button"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]"
            >
              {showPassword ? <EyeOff className="h-[17px] w-[17px]" aria-hidden="true" /> : <Eye className="h-[17px] w-[17px]" aria-hidden="true" />}
            </button>
          </div>
          {/* No success state here: a non-empty password is not a correct
              one, and only the server can say. */}
          <ValidatedFieldFeedback
            id="password-feedback"
            status={passwordField.status}
            errorKey={passwordField.errorKey}
            successKey={null}
            params={passwordField.params}
            serverText={passwordField.serverErrorText}
          />
        </div>

        {/* Remember me — same default (on) and same value sent to login(). */}
        <label className="-my-1 flex min-h-11 w-fit cursor-pointer select-none items-center gap-2.5">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-[#b04a15]"
          />
          <span className="text-[13px] text-stone-600 dark:text-stone-400">{t("rememberMe")}</span>
        </label>

        {/* Disabled only while a request is in flight or after success —
            never merely because untouched fields are empty, which would
            remove submit as the safety net that reveals what is missing. */}
        <button
          type="submit"
          disabled={auth.busy}
          aria-busy={auth.op === "password" || undefined}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold text-white transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
            auth.op === "authenticated"
              ? "bg-emerald-600 focus-visible:ring-emerald-600"
              : "bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-70 focus-visible:ring-[#b04a15]"
          }`}
        >
          {auth.op === "authenticated" ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              {tv("signedIn")}
            </>
          ) : auth.op === "password" ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" aria-hidden="true" />
              {t("signingIn")}
            </>
          ) : (
            <>
              {t("signIn")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* ── Social ── Facebook is omitted: it has no implementation, and a
          permanently disabled "coming soon" button is not a real option. */}
      <div className="mt-5 flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400" aria-hidden="true">
        <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-700" />
        {t("or")}
        <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-700" />
      </div>
      {/* Locked from the moment the popup is requested — not only once Google
          answers — so repeated clicks cannot open repeated attempts. */}
      <button
        type="button"
        disabled={auth.busy}
        aria-busy={auth.op === "google" || undefined}
        onClick={startGoogle}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-[14px] font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] disabled:opacity-60"
      >
        <GoogleIcon />
        {auth.op === "google" ? t("googleOpening") : t("google")}
      </button>

      {/* Cross-link — keeps `next` through sign-up. */}
      <p className="mt-5 border-t border-stone-200 dark:border-zinc-700/70 pt-3 text-center text-[13px] text-stone-500 dark:text-stone-400">
        {t("noAccount")}{" "}
        <Link
          href={registerHref}
          className="inline-flex min-h-11 items-center font-semibold text-[#b04a15] dark:text-[#e07b3a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] rounded-sm"
        >
          {t("signUp")}
        </Link>
      </p>
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
