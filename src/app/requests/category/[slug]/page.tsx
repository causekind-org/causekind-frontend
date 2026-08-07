import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X, ClipboardCheck } from "lucide-react";
import { categoryBySlug, IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
import CategoryNeedsBoard from "@/components/CategoryNeedsBoard";
import CategoryExplorer from "@/components/CategoryExplorer";

type Params = { params: Promise<{ slug: string }> };

// Nine known slugs. Note the app is already dynamically rendered end-to-end
// because src/i18n/request.ts calls cookies(), so this is correctness and
// future-proofing rather than a measurable win today.
export function generateStaticParams() {
  return IN_KIND_CATEGORIES.map((c) => ({ slug: c.slug }));
}

// Metadata is built purely from the editorial registry. No request, donee or
// location data goes anywhere near it — these pages are public and indexable.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return { title: "Category not found — CauseKind" };
  const title = `Donating ${cat.name} — CauseKind`;
  return {
    title,
    description: cat.tagline,
    alternates: { canonical: `/requests/category/${cat.slug}` },
    openGraph: { title, description: cat.tagline, type: "article" },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const visual = CATEGORY_VISUALS[cat.name];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition-colors hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] rounded dark:text-stone-400"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        All needs
      </Link>

      {/* ── Hero ── */}
      <header className="mt-5">
        <span className={`inline-flex rounded-2xl p-3 ${visual.iconBg} ${visual.text}`}>
          <AnimatedCategoryIcon category={cat.name} iconClassName="w-7 h-7" />
        </span>
        <h1 className="mt-4 text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] font-bold leading-tight text-stone-900 dark:text-stone-50">
          {cat.name}
        </h1>
        <p className="mt-2 text-[clamp(0.95rem,0.9rem+0.25vw,1.1rem)] font-medium text-[var(--ck-role-accent)]">
          {cat.tagline}
        </p>
        <p className="mt-4 max-w-2xl text-[clamp(0.9rem,0.87rem+0.15vw,1rem)] leading-relaxed text-stone-600 dark:text-stone-300">
          {cat.intro}
        </p>
      </header>

      {/* ── Quote ── */}
      <figure className="mt-8 rounded-2xl border-s-4 border-[var(--ck-role-accent)] bg-stone-50/80 p-5 dark:bg-white/[0.03]">
        <blockquote className="text-[clamp(1rem,0.95rem+0.35vw,1.25rem)] font-medium leading-relaxed text-stone-800 dark:text-stone-100">
          “{cat.quote.text}”
        </blockquote>
        <figcaption className="mt-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {cat.quote.attribution}
        </figcaption>
      </figure>

      {/* ── Good to donate / avoid ── */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <GuidanceCard
          tone="good"
          icon={<Check className="w-4 h-4" aria-hidden="true" />}
          title="Good to donate"
          items={cat.goodToDonate}
        />
        <GuidanceCard
          tone="avoid"
          icon={<X className="w-4 h-4" aria-hidden="true" />}
          title="Please avoid"
          items={cat.avoid}
        />
      </div>

      {/* ── Preparation ── */}
      <section className="mt-8 rounded-2xl border border-stone-200/80 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="flex items-center gap-2 text-lg font-bold text-stone-800 dark:text-stone-100">
          <ClipboardCheck className="w-5 h-5 text-[var(--ck-role-accent)]" aria-hidden="true" />
          Before you hand it over
        </h2>
        <ol className="mt-3 space-y-2.5">
          {cat.preparation.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ck-role-accent)]/10 text-[11px] font-bold text-[var(--ck-role-accent)]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Live needs ── */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
          Open {cat.name} needs near you
        </h2>
        <CategoryNeedsBoard categoryName={cat.name} />
      </section>

      {/* ── Cross-navigation ── */}
      <div className="mt-12">
        <CategoryExplorer
          exclude={cat.name}
          heading="Other categories"
          blurb="Each one has its own guidance on what genuinely helps."
        />
      </div>
    </main>
  );
}

function GuidanceCard({ tone, icon, title, items }: {
  tone: "good" | "avoid";
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  const good = tone === "good";
  return (
    <section
      className={`rounded-2xl border p-5 ${
        good
          ? "border-emerald-500/25 bg-emerald-500/[0.04]"
          : "border-red-500/25 bg-red-500/[0.04]"
      }`}
    >
      <h2 className="flex items-center gap-2 text-base font-bold text-stone-800 dark:text-stone-100">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
            good
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/15 text-red-700 dark:text-red-400"
          }`}
        >
          {icon}
        </span>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <span
              aria-hidden="true"
              className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${
                good ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
