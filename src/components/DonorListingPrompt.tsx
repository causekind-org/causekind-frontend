"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

const SHOW_DELAY_MS = 30_000; // 30 sec before first appearance
const VISIBLE_MS    = 10_000;  // 10 sec on screen
const SLIDE_MS      = 420;
const DISMISS_KEY   = "ck_list_prompt_dismissed";

export function DonorListingPrompt() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading || !user || user.role !== "DONOR") return;
    if (pathname === "/items/new") return;
    // Permanently dismissed by user clicking X
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function cycle() {
      t1.current = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
        t2.current = setTimeout(() => {
          setEntered(false);
          t3.current = setTimeout(() => {
            setVisible(false);
            cycle();
          }, SLIDE_MS);
        }, VISIBLE_MS);
      }, SHOW_DELAY_MS);
    }

    cycle();
    return () => { [t1, t2, t3, t4].forEach(r => r.current && clearTimeout(r.current)); };
  }, [isLoading, user, pathname]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    [t1, t2, t3, t4].forEach(r => r.current && clearTimeout(r.current));
    setEntered(false);
    t4.current = setTimeout(() => setVisible(false), SLIDE_MS);
  }

  // Guard in render too — effect alone doesn't reset `visible` if user switches role
  if (!visible || !user || user.role !== "DONOR") return null;

  return (
    <div className="fixed left-0 z-[60] pointer-events-none" style={{ top: "calc(4rem + 22vh)" }}>
      <div className={`pointer-events-auto transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${entered ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="relative bg-white dark:bg-zinc-900 border border-[#e5e2d5] dark:border-zinc-700 rounded-r-2xl shadow-[4px_8px_32px_rgba(0,0,0,0.13)] dark:shadow-[4px_8px_32px_rgba(0,0,0,0.5)] py-4 pl-4 pr-5 w-[288px] max-w-[82vw]" style={{ borderLeft: "3px solid #b04a15" }}>
          <button onClick={dismiss} aria-label="Dismiss" className="absolute top-2.5 right-2.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-xl bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] mt-0.5">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div className="space-y-1 pr-3">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">Got spare items?</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">List something you no longer need — books, clothes, electronics — and help someone nearby.</p>
            </div>
          </div>
          <div className="mt-3.5 pl-11">
            <Link href="/items/new" onClick={() => { [t1, t2, t3].forEach(r => r.current && clearTimeout(r.current)); setVisible(false); }} className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-white bg-[#b04a15] hover:bg-[#963c0d] px-4 py-2 rounded-full transition-colors">
              List an Item
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
