"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { TranslatedText, useDynamicTranslation } from "@/hooks/useDynamicTranslation";
import { DONOR_CATEGORY_EVENT } from "@/components/DonorCategoryModal";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, MapPin, Bell } from "lucide-react";
import type { ItemRequest } from "@/lib/api";

type CategoryEntry = { category: string; requests: ItemRequest[] };

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const VISIBLE_PER_CATEGORY = 4;

/* ─── Titles decode into place instead of a plain fade — the whole point of ── */
/* dropping images was to let the words themselves carry the "cool" moment. ── */
function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const started = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => { setDisplay(text); started.current = false; }, [text]);

  function start() {
    if (started.current || reduceMotion) return;
    started.current = true;
    let frame = 0;
    const totalFrames = 12;
    const timer = setInterval(() => {
      frame++;
      const revealCount = Math.ceil((frame / totalFrames) * text.length);
      setDisplay(
        text
          .split("")
          .map((ch, i) => (ch === " " || i < revealCount ? ch : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]))
          .join("")
      );
      if (frame >= totalFrames) {
        setDisplay(text);
        clearInterval(timer);
      }
    }, 32);
  }

  return (
    <motion.span className={className} onViewportEnter={start} viewport={{ once: true, amount: 0.6 }}>
      {display}
    </motion.span>
  );
}

export function DoneeRequestsSection({ itemRequests }: { itemRequests: ItemRequest[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mounted, setMounted] = useState(false);

  function openRequest(id: number) {
    if (!user) { router.push("/login"); return; }
    router.push(`/requests/${id}/offer`);
  }

  useEffect(() => {
    setSelected(readSelectedDonorCategories());
    setMounted(true);
    function onChange(e: Event) {
      // The modal always dispatches an array (possibly empty = "all"), never null —
      // this event only fires after an explicit apply(), so there's no ambiguity here.
      setSelected((e as CustomEvent<string[]>).detail ?? []);
    }
    window.addEventListener(DONOR_CATEGORY_EVENT, onChange);
    return () => window.removeEventListener(DONOR_CATEGORY_EVENT, onChange);
  }, []);

  // Avoid an SSR/client mismatch — localStorage only exists client-side
  if (!mounted) return null;

  // Never chosen anything → nothing to personalize, hide the section.
  // Explicitly chose "all" (empty array from an actual apply()) → show every category.
  // Chose specific categories → show only those.
  const categoriesToShow = selected === null
    ? []
    : selected.length > 0
      ? selected.filter(c => ALL_REQUEST_CATEGORIES.includes(c))
      : ALL_REQUEST_CATEGORIES;
  if (categoriesToShow.length === 0) return null;

  const categoryData: CategoryEntry[] = categoriesToShow.map(cat => ({
    category: cat,
    requests: itemRequests.filter(r => r.category === cat),
  }));
  const hasAnyRequests = categoryData.some(c => c.requests.length > 0);

  return (
    <section className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 py-20 border-t border-stone-200/60 dark:border-stone-800">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <Reveal className="mb-14">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
                Requests near your focus
              </h2>
              <p className="text-stone-500 dark:text-stone-400 mt-2 max-w-xl">
                {selected && selected.length > 0
                  ? "Scoped to the categories you picked. Change them anytime."
                  : "You chose to see everything. Narrow this to specific focus areas anytime."}
              </p>
            </div>
            <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#b04a15] dark:text-[#e07b3a] hover:underline shrink-0">
              Browse all requests <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {!hasAnyRequests ? (
          <EmptyBoard categories={categoriesToShow} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-14 gap-y-10">
            {categoryData.map((entry, i) => (
              <CategoryGroup key={entry.category} category={entry.category} requests={entry.requests} delay={i * 100} onOpen={openRequest} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryGroup({
  category, requests, delay, onOpen,
}: { category: string; requests: ItemRequest[]; delay: number; onOpen: (id: number) => void }) {
  const col = CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS["Medical aid"];
  const visible = requests.slice(0, VISIBLE_PER_CATEGORY);
  const overflow = requests.length - visible.length;

  return (
    <Reveal delay={delay}>
      <div className="mb-4 flex items-center gap-3">
        <col.Icon className={`h-4 w-4 shrink-0 ${col.text}`} strokeWidth={2} />
        <h3 className={`shrink-0 text-xs font-black uppercase tracking-widest ${col.text}`}>
          <TranslatedText text={category} />
        </h3>
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        <span className="shrink-0 text-xs font-semibold text-stone-400 dark:text-stone-500">
          {requests.length} open
        </span>
      </div>

      {visible.length > 0 ? (
        <div className="divide-y divide-stone-200/70 dark:divide-stone-800">
          {visible.map(req => (
            <RequestRow key={req.id} request={req} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <EmptyCategoryRow category={category} />
      )}

      {overflow > 0 && (
        <Link
          href="/requests"
          className="group mt-1 flex items-center gap-2 pt-4 text-sm font-bold text-[#b04a15] dark:text-[#e07b3a]"
        >
          +{overflow} more in <TranslatedText text={category} />
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </Reveal>
  );
}

function RequestRow({ request, onOpen }: { request: ItemRequest; onOpen: (id: number) => void }) {
  const title = useDynamicTranslation(request.title) ?? request.title;
  const city = useDynamicTranslation(request.city) ?? request.city;
  const urgent = request.urgency === "CRITICAL" || request.urgency === "HIGH";

  return (
    <button
      type="button"
      onClick={() => onOpen(request.id)}
      className="group flex w-full items-center justify-between gap-4 py-4 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        {urgent && (
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${request.urgency === "CRITICAL" ? "bg-[#b04a15]" : "bg-[#b04a15]/45"}`}
          />
        )}
        <ScrambleText
          text={title}
          className="truncate text-lg font-bold text-stone-800 transition-colors dark:text-stone-100 sm:text-xl group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
        />
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-stone-400 dark:text-stone-500">
        <MapPin className="h-3 w-3" />
        <span className="hidden sm:inline">{city}</span>
        <ArrowRight className="h-3.5 w-3.5 text-stone-300 transition-all dark:text-stone-600 group-hover:translate-x-0.5 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]" />
      </span>
    </button>
  );
}

function EmptyCategoryRow({ category }: { category: string }) {
  return (
    <p className="flex items-center gap-2 py-4 text-sm text-stone-400 dark:text-stone-500">
      <Bell className="h-3.5 w-3.5 shrink-0" />
      Nothing open here yet. You&apos;ll be the first to know about <TranslatedText text={category} />.
    </p>
  );
}

function EmptyBoard({ categories }: { categories: string[] }) {
  return (
    <Reveal>
      <div className="flex max-w-xl flex-col items-start gap-4 py-6">
        <Bell className="h-6 w-6 text-[#b04a15]" strokeWidth={1.5} />
        <div>
          <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">
            No open requests in your focus areas right now.
          </p>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            We&apos;ll keep watching{" "}
            {categories.map((c, i) => (
              <span key={c}>
                {i > 0 && ", "}
                <TranslatedText text={c} />
              </span>
            ))}{" "}
            and notify you the moment something comes in.
          </p>
        </div>
      </div>
    </Reveal>
  );
}
