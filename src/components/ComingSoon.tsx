import Link from "next/link";
import { Clock, HandHeart, ArrowRight } from "lucide-react";

const COPY = {
  campaigns: {
    title: "Fundraising Campaigns",
    blurb:
      "Monetary campaigns are on the way. CauseKind is launching with verified in-kind giving first — matching real, usable items to nearby verified needs. Money campaigns will arrive as a separate, fully-compliant module.",
  },
  donate: {
    title: "Online Donations",
    blurb:
      "Online money donations are coming soon. For now, you can make a real difference by giving usable items to verified people who need them through CauseKind's in-kind network.",
  },
} as const;

/** Branded "Coming Soon" screen shown for postponed money features (see FEATURES.money). */
export function ComingSoon({ feature }: { feature: keyof typeof COPY }) {
  const c = COPY[feature];
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-20 bg-[#faf8f5] dark:bg-zinc-950">
      <div className="max-w-xl w-full text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#b04a15]/10 text-[#b04a15] dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" /> Coming Soon
        </span>
        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          {c.title}
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400 leading-relaxed">{c.blurb}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold transition-colors btn-3d"
          >
            <HandHeart className="w-4 h-4" /> Join CauseKind <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-700 dark:text-stone-300 font-bold hover:bg-white dark:hover:bg-zinc-900 transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
