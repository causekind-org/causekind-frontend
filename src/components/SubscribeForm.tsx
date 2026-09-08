"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { subscribe, type SubscribeAudience } from "@/lib/api";

/**
 * The one email capture on the site.
 *
 * <p>Shared rather than copied because the two places that capture an address —
 * the blog newsletter and a magnet landing page — must agree on the parts that
 * are not cosmetic: that consent is a separate unticked box, that the exact
 * wording shown is what gets stored, and that success never reveals whether an
 * address was already on the list. Two forms drift; one cannot.
 *
 * <p><b>The success line is the same whatever happened server-side.</b> The
 * endpoint deliberately answers identically for a new address, one already
 * pending, one already confirmed, and one being rate limited, because any
 * difference would make an unauthenticated endpoint an email-enumeration oracle.
 * So this cannot distinguish them either, and "check your email" is true in every
 * case that matters.
 *
 * <p>Copy is passed in rather than looked up here: the two surfaces promise
 * different things, and the promise belongs next to the offer, not in a shared
 * component that would have to know about both.
 */
export function SubscribeForm({
  audience,
  source,
  consentText,
  submitLabel,
  sendingLabel,
  successText,
  errorText,
  emailPlaceholder,
  className = "",
}: {
  audience: SubscribeAudience;
  /** Which magnet or page this signup came from — drives what gets delivered. */
  source: string;
  /** Shown beside the checkbox AND stored verbatim as the consent evidence. */
  consentText: string;
  submitLabel: string;
  sendingLabel: string;
  successText: string;
  errorText: string;
  emailPlaceholder: string;
  className?: string;
}) {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !consented || state === "sending") return;
    setState("sending");
    try {
      await subscribe({ email: email.trim(), audience, source, locale, consentText });
      setState("sent");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p className={`text-sm font-semibold text-emerald-700 dark:text-emerald-400 max-w-sm ${className}`}>
        {successText}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] w-full sm:w-64"
          placeholder={emailPlaceholder}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={emailPlaceholder}
        />
        <button
          type="submit"
          disabled={!email.trim() || !consented || state === "sending"}
          className="bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
        >
          {state === "sending" ? sendingLabel : submitLabel}
        </button>
      </div>

      {/* Never pre-ticked, and never bundled into pressing the button: the
          privacy policy promises newsletters go out "only with Your consent",
          and a box the user did not tick is not consent. */}
      <label className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-400 max-w-sm cursor-pointer">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 accent-[#b04a15]"
        />
        <span>{consentText}</span>
      </label>

      {state === "error" && (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{errorText}</p>
      )}
    </form>
  );
}
