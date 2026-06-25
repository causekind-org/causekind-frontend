"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)ck_locale=([^;]+)/);
    const saved = match?.[1] as Locale | undefined;
    if (saved && LANGUAGE_OPTIONS.some((o) => o.code === saved)) setLocale(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(code: Locale) {
    document.cookie = `ck_locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(code);
    setOpen(false);
    router.refresh();
  }

  const current = LANGUAGE_OPTIONS.find((o) => o.code === locale) ?? LANGUAGE_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-8 rounded-full px-2.5 text-xs font-bold border border-stone-200 dark:border-stone-700 hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors text-stone-700 dark:text-stone-300"
        title="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3 w-3 text-stone-400 shrink-0" />
        <span className="max-w-[4rem] truncate">{current.nativeName}</span>
        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 z-[9999] w-44 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
        >
          <div className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {LANGUAGE_OPTIONS.map(({ code, nativeName }) => (
              <button
                key={code}
                role="option"
                aria-selected={locale === code}
                onClick={() => select(code)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  locale === code
                    ? "bg-orange-50 dark:bg-zinc-800 text-[#b04a15] dark:text-[#e07b3a] font-semibold"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800"
                }`}
              >
                {nativeName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
