import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { NgoApplicationStatusResponse } from "@/lib/api";
import { correctionFieldInfo, firstCorrectionStep } from "@/features/ngo-registration/ngoCorrectionFields";

/** /profile: what the reviewer asked to change, with one way in ("Fix and resubmit"). */
export function ChangesRequestedCard({ application }: {
  application: Pick<NgoApplicationStatusResponse, "status" | "correctionItems" | "overallNote" | "needsInformationDetails" | "correctionRound">;
}) {
  if (application.status !== "NEEDS_INFORMATION") return null;
  const items = application.correctionItems ?? [];
  const note = application.overallNote || application.needsInformationDetails || "";
  const step = firstCorrectionStep(items.map((i) => i.field));
  const href = step ? `/profile/ngo-details?step=${step}` : "/profile/ngo-details";
  return (
    <section aria-label="Changes requested" data-testid="changes-requested-card"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
      <h3 className="flex items-center gap-2 text-base font-black">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> What our team asked you to change
        {application.correctionRound ? <span className="text-xs font-semibold opacity-70">· round {application.correctionRound}</span> : null}
      </h3>
      {note && <p className="mt-2 whitespace-pre-wrap">{note}</p>}
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.field}><span className="font-semibold">{correctionFieldInfo(i.field).label}:</span> {i.note}</li>
          ))}
        </ul>
      )}
      <Link href={href} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-ngo-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-ngo-600">
        Fix and resubmit <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  );
}
