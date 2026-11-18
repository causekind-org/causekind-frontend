import Link from "@/components/AppLink";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

/**
 * Branded 404, rendered inside the locale layout (navbar + footer). Reached by
 * notFound() in any page and by unmatched paths via [...rest]/page.tsx, which
 * covers the proxy's /__not-found__ rewrite too.
 */
export default function NotFound() {
  return (
    <main className="relative overflow-hidden min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="pointer-events-none absolute -top-32 left-[20%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
      <div className="relative max-w-md text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b04a15]/10 text-[#b04a15] text-xs font-bold">
          404
        </span>
        <h1 className="mt-4 text-3xl font-bold text-stone-900 dark:text-stone-100">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">
          The link may be old, or the campaign may have ended. There are still plenty of ways to help.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-xl px-6 py-3 font-semibold text-sm bg-[#b04a15] text-white hover:opacity-90 transition-all"
          >
            Go home
          </Link>
          <Link
            href="/campaigns"
            className="rounded-xl px-6 py-3 font-semibold text-sm border border-orange-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-zinc-900 transition-all"
          >
            Browse campaigns
          </Link>
        </div>
      </div>
    </main>
  );
}
