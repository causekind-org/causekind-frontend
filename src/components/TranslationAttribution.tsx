"use client";

import { useLocale } from "next-intl";

export function TranslationAttribution() {
  const locale = useLocale();
  if (locale === "en") return null;
  return (
    <p className="px-4 py-3 text-center text-xs text-stone-500" lang="en" translate="no">
      Some content is automatically translated by{" "}
      <a href="https://translate.google.com" className="underline underline-offset-2">
        Google Translate
      </a>.
    </p>
  );
}
