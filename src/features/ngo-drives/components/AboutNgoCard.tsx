import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { UiText, useUiText } from "@/components/UiText";
export type AboutNgo = {
  organizationName: string;
  founderName?: string | null;
  founderDesignation?: string | null;
  yearOfEstablishment?: string | null;
  verified?: boolean;
  aboutUs?: string | null;
  slug?: string | null;
  /** Shown on /profile's About card when known. */
  logoUrl?: string | null;
  legalStructure?: string | null;
};

/**
 * "About the NGO": name, founder / trustee (the first authorized representative),
 * the year it was formed, "Verified by CauseKind", About us, and a link to its
 * public page. Used on the NGO profile and the drive page.
 */
export function AboutNgoContent({ ngo, emptyAboutUs }: { ngo: AboutNgo; emptyAboutUs?: React.ReactNode }) {
  const ui = useUiText();
  return (
    <div className="space-y-3" data-testid="about-ngo">
      {/* The NGO's name in the accent colour, so it reads apart from the card heading. */}
      {ngo.slug ? (
        <Link href={`/ngos/${ngo.slug}`} data-testid="about-ngo-name"
          className="block text-lg font-extrabold text-ngo-700 underline-offset-4 hover:underline dark:text-ngo-300">{ngo.organizationName}</Link>
      ) : (
        <h3 data-testid="about-ngo-name" className="text-lg font-extrabold text-ngo-700 dark:text-ngo-300">{ngo.organizationName}</h3>
      )}
      {ngo.verified && (
        <p className="inline-flex items-center gap-2 text-xs font-bold text-ngo-800 dark:text-ngo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-ngo-600 dark:bg-ngo-400" aria-hidden />
          <UiText>Verified by CauseKind</UiText>
        </p>
      )}
      {(ngo.founderName || ngo.yearOfEstablishment) && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {ngo.founderName && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {ngo.founderDesignation ? ngo.founderDesignation : ui("Founder / trustee")}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-stone-800 dark:text-stone-200">{ngo.founderName}</dd>
            </div>
          )}
          {ngo.yearOfEstablishment && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"><UiText>Formed in</UiText></dt>
              <dd className="mt-0.5 text-sm font-semibold text-stone-800 dark:text-stone-200">{ngo.yearOfEstablishment}</dd>
            </div>
          )}
        </dl>
      )}
      {ngo.aboutUs?.trim()
        ? <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-300">{ngo.aboutUs}</p>
        : emptyAboutUs ?? null}
      {ngo.slug && (
        <Link href={`/ngos/${ngo.slug}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ngo-700 px-4 text-sm font-semibold text-ngo-800 hover:bg-ngo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 dark:border-ngo-400 dark:text-ngo-300 dark:hover:bg-ngo-950/40">
          <UiText>Know more about the organization</UiText> <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
