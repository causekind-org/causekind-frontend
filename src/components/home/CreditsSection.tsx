import Image from "next/image";

/**
 * "The people behind CauseKind": the trust that runs the platform and the firm
 * that funds it. Sits below the final CTA on the home page (design B, chosen
 * 2026-10-06). Two columns split by a hairline; they stack on phones.
 *
 * <p>Server component, English-only copy (proper names, not in messages/*.json).
 * The RMH logo has a white background, so in dark mode it sits on a white tile.
 *
 * <p>`variant="donee"` scopes the donee role tokens onto the section so the accent
 * labels turn navy (sky blue in dark mode); the logos keep their own colours.
 */
export function CreditsSection({ variant = "donor" }: { variant?: "donor" | "donee" } = {}) {
  return (
    <section
      aria-labelledby="credits-heading"
      data-ck-role-theme={variant === "donee" ? "donee" : undefined}
      className="w-full bg-[#F8F6F2] dark:bg-[#0E0C0A] px-5 py-12 sm:py-16 lg:px-[120px]"
    >
      <p
        id="credits-heading"
        className="mb-6 text-center text-xs font-extrabold uppercase tracking-[0.28em] text-[var(--ck-role-accent,#B04A15)] dark:text-[var(--ck-role-accent,#F4A25B)] sm:mb-8"
      >
        The people behind CauseKind
      </p>

      <div className="mx-auto grid max-w-[1040px] grid-cols-1 border-y border-[#E2D6C8] dark:border-stone-800 md:grid-cols-2">
        <div className="flex items-center gap-5 border-b border-[#E2D6C8] py-8 dark:border-stone-800 md:border-b-0 md:border-r md:py-10 md:pr-10">
          <Image
            src="/images/money-donation/sahas-logo-transparent.png"
            alt="Sahas Charitable Trust logo"
            width={84}
            height={84}
            className="h-16 w-16 shrink-0 object-contain sm:h-[84px] sm:w-[84px]"
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--ck-role-accent,#B04A15)] dark:text-[var(--ck-role-accent,#F4A25B)]">
              An initiative by
            </p>
            <p className="text-xl font-extrabold tracking-tight text-[#1C1410] dark:text-stone-100 sm:text-[26px]">
              Sahas Charitable Trust
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 py-8 md:py-10 md:pl-12">
          <span className="flex shrink-0 items-center rounded-xl dark:bg-white dark:px-2 dark:py-1">
            <Image
              src="/images/partners/rmh-advisors-logo.png"
              alt="RMH Advisors logo"
              width={150}
              height={70}
              className="h-14 w-auto object-contain sm:h-[70px]"
            />
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--ck-role-accent,#B04A15)] dark:text-[var(--ck-role-accent,#F4A25B)]">
              Funded by
            </p>
            <p className="text-xl font-extrabold tracking-tight text-[#1C1410] dark:text-stone-100 sm:text-[26px]">
              RMH Advisors Pvt Ltd.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
