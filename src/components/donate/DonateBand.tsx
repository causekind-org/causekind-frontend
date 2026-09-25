import { DonateNowButton } from "@/components/donate/DonateNowButton";
import { ShieldCheck, ReceiptText } from "lucide-react";

/**
 * The landing page's dedicated money-donation band.
 *
 * <p><b>Why a new section rather than a CTA bolted onto an existing one.</b>
 * HomeClient renders two independent trees and every section has a festival
 * sibling; editing them to make room is how a landing page gets broken. This is
 * additive — one component, dropped in at one line per tree — so the worst a
 * mistake here can do is spoil this band.
 *
 * <p>It also closes a real gap. A logged-out visitor on a phone currently sees
 * Hero → Doors → LiveNeeds → Footer: no CTA section, no Be the Change. This is
 * the only route to the donation form in that column.
 *
 * <p>Server component, no auth read. `.ck-donate-band` is hidden for donees by
 * the same pre-paint CSS rule that hides the button, so a recipient sees neither
 * the band nor an empty gap where it was.
 */
export function DonateBand() {
  return (
    <section
      aria-labelledby="ck-donate-band-title"
      className="ck-donate-band relative isolate overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-[#fff7ed] via-[#fffdf9] to-[#fef3e2] px-6 py-9 dark:border-amber-900/40 dark:from-[#241105] dark:via-[#1c0d04] dark:to-[#2a1408] sm:px-10 sm:py-12"
    >
      {/* Decorative wash. Sized in % rather than px so it cannot become a
          horizontal overflow in the mobile column, which is overflow-x-clip. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[10%] -top-[40%] h-[120%] w-[55%] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.10),transparent_70%)]"
      />

      <div className="relative flex flex-col items-center gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:text-left">
        <div className="max-w-xl">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            Give money
          </p>
          <h2
            id="ck-donate-band-title"
            className="mt-2 text-[clamp(1.5rem,1.1rem+1.6vw,2.15rem)] font-extrabold leading-tight tracking-tight text-stone-900 dark:text-stone-50"
          >
            Not everything can be handed over.
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-stone-600 dark:text-stone-300">
            Medicines, school fees, a bus fare to a hospital — some needs only
            money can meet. Every rupee goes to Sahas Charitable Trust, and your
            80G receipt and certificate reach your inbox within minutes.
          </p>

          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
            <li className="flex items-center gap-1.5 text-[0.8rem] font-bold text-stone-600 dark:text-stone-300">
              <ShieldCheck className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              80G tax deductible
            </li>
            <li className="flex items-center gap-1.5 text-[0.8rem] font-bold text-stone-600 dark:text-stone-300">
              <ReceiptText className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              Receipt emailed instantly
            </li>
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2.5">
          <DonateNowButton size="lg" />
          <p className="text-[0.72rem] font-semibold text-stone-500 dark:text-stone-400">
            Give any amount · no account needed
          </p>
        </div>
      </div>
    </section>
  );
}
