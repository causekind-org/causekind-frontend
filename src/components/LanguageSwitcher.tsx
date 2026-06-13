"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type Locale = "en" | "hi";

export function LanguageSwitcher() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)ck_locale=([^;]+)/);
    const saved = match?.[1] as Locale | undefined;
    if (saved === "en" || saved === "hi") setLocale(saved);
  }, []);

  function toggle() {
    const next: Locale = locale === "en" ? "hi" : "en";
    document.cookie = `ck_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(next);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="h-8 min-w-[2.75rem] rounded-full px-2.5 text-xs font-bold tracking-wide border border-stone-200 dark:border-stone-700 hover:bg-orange-50 dark:hover:bg-zinc-800"
      title={locale === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      {locale === "en" ? "हिं" : "EN"}
    </Button>
  );
}
