import { useTranslations } from "next-intl";
import type { CancellationOption } from "@/lib/api";

/**
 * Cancellation copy in the user's language, chosen by the stable codes the
 * backend sends beside its English (`CancellationCopy` on the server).
 *
 * - A known code with a `cancellation.<CODE>` entry → the translation.
 * - A missing code, an unknown code (newer backend) or a code with no entry
 *   (admin wording is deliberately not in the catalogue) → the server's English.
 *
 * Never matches English sentences. Call it during render only; the options
 * fetch must not depend on it, so a language change re-renders the copy
 * without refetching.
 */
export function useCancellationCopy() {
  let t: ReturnType<typeof useTranslations> | null;
  try {
    t = useTranslations("cancellation");
  } catch {
    t = null; // no intl provider (tests): server English
  }
  const pick = (code: string | null | undefined, english: string | null): string | null => {
    if (code && t && typeof t.has === "function" && t.has(code)) return t(code);
    return english;
  };
  return {
    label: (o: CancellationOption) => pick(o.labelCode, o.actionLabel),
    warning: (o: CancellationOption) => pick(o.warningCode, o.warning),
    blockedReason: (o: CancellationOption) => pick(o.blockedReasonCode, o.blockedReason),
  };
}
