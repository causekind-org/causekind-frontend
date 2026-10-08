import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DONATE_HREF } from "@/lib/donateScroll";

/**
 * "Ready to help?" — the logged-in donor home's closing choice between giving
 * an item and giving money. Design "B · Two doors" (2026-09-29), in the site's
 * own colours and fonts; replaces DonorCtaSection on the donor home.
 *
 * Each card is one link (no buttons nested inside): the pill inside it is
 * decoration that makes the action obvious. Destinations are unchanged from
 * the section it replaces.
 */
export function DonorTwoDoors() {
  const accent = "var(--ck-home-accent,#b04a15)";

  return (
    <section
      aria-labelledby="donor-two-doors-title"
      className="w-full bg-[#FAF6F1] px-4 py-12 dark:bg-[#0E0C0A] sm:px-8 sm:py-16 lg:px-24 lg:py-20"
    >
      <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-6 sm:gap-10">
        <div className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between md:gap-12 md:px-0">
          <h2
            id="donor-two-doors-title"
            className="m-0 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-stone-900 dark:text-white sm:text-5xl lg:text-[64px] lg:leading-none"
          >
            Ready to help?
          </h2>
          <p className="m-0 max-w-[380px] text-[15px] leading-relaxed text-stone-600 dark:text-stone-300 sm:text-[17px]">
            Pick one way to help today.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* Door 1 — list an item (owner, 2026-10-08: was "Give an item" → /requests) */}
          <Link
            href="/items/new"
            className="group relative flex min-h-[248px] flex-col justify-between gap-[18px] overflow-hidden rounded-[22px] p-6 text-white no-underline transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6F1] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:focus-visible:ring-offset-[#0E0C0A] md:min-h-[320px] md:rounded-[28px] md:p-10"
            style={{ background: accent, ["--tw-ring-color" as string]: accent }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.18}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute -right-3 -top-3 size-28 md:size-40"
            >
              <path d="M21 8l-9-5-9 5 9 5 9-5z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] md:text-[13px]">Items</span>
            <span className="flex flex-col gap-[18px] md:flex-row md:items-end md:justify-between md:gap-6">
              <span className="flex flex-col gap-1.5 md:gap-2.5">
                <span className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[40px]">List an item</span>
                <span className="max-w-[360px] text-[15px] leading-normal text-white/90 md:text-[17px]">
                  Add something you don&apos;t use. We&apos;ll match it with someone near you.
                </span>
              </span>
              <span
                className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 text-[15px] font-semibold md:h-[52px] md:self-auto md:px-[22px]"
                style={{ color: accent }}
              >
                List an item
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none md:size-[18px]" aria-hidden="true" />
              </span>
            </span>
          </Link>

          {/* Door 2 — give money */}
          <Link
            // Land on the donation form, not the top of the page. The page's
            // arrival handler owns the scroll, as for every DonateNowButton.
            href={DONATE_HREF}
            scroll={false}
            className="group relative flex min-h-[248px] flex-col justify-between gap-[18px] overflow-hidden rounded-[22px] border-[1.5px] border-[#EAD9CB] bg-white p-6 text-stone-900 no-underline transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6F1] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus-visible:ring-offset-[#0E0C0A] md:min-h-[320px] md:rounded-[28px] md:p-10"
            style={{ ["--tw-ring-color" as string]: accent }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent}
              strokeOpacity={0.12}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute -right-3 -top-3 size-28 md:size-40"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] md:text-[13px]" style={{ color: accent }}>Money</span>
            <span className="flex flex-col gap-[18px] md:flex-row md:items-end md:justify-between md:gap-6">
              <span className="flex flex-col gap-1.5 md:gap-2.5">
                <span className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[40px]">Give money</span>
                <span className="max-w-[360px] text-[15px] leading-normal text-stone-600 dark:text-stone-300 md:text-[17px]">
                  Help our work with money.
                </span>
              </span>
              <span className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full border-[1.5px] border-stone-900 px-5 text-[15px] font-semibold dark:border-white md:h-[52px] md:self-auto md:px-[22px]">
                Donate
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none md:size-[18px]" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
