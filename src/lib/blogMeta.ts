/**
 * Localisation for the two blog metadata strings that live in blogData.ts as
 * pre-formatted English — `readTime` ("8 min read") and `publishedDate`
 * ("January 2026").
 *
 * Both are baked into the post data rather than stored as numbers, and neither
 * goes through the blog-translations JSON (which only carries title,
 * description, category and content). So a fully translated Gujarati article
 * still showed "12 min read · JANUARY 2026" in English underneath its Gujarati
 * headline.
 *
 * Month names come from Intl rather than the message catalogues on purpose:
 * ICU already knows them in every locale we ship, and hand-maintaining 12
 * months x 13 locales is 156 strings that can only ever drift.
 */

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * "8 min read" -> t("readTime", { minutes: 8 }).
 *
 * Falls back to the original string if the shape is unexpected, so a hand-typed
 * readTime that doesn't start with a number degrades to English instead of
 * rendering something wrong.
 */
export function formatReadTime(
  readTime: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
  const minutes = parseInt(readTime, 10);
  if (Number.isNaN(minutes)) return readTime;
  return t("readTime", { minutes });
}

/**
 * "January 2026" -> "જાન્યુઆરી 2026" for gu, "يناير 2026" for ar, and so on.
 *
 * Returns the input unchanged if it isn't a recognised "<Month> <year>" pair,
 * or if the runtime's ICU data is trimmed down (some minimal Node builds ship
 * English-only), which is a visible-but-correct fallback rather than a crash.
 */
export function formatPublishedDate(publishedDate: string, locale: string): string {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(publishedDate.trim());
  if (!match) return publishedDate;

  const monthIndex = MONTHS.indexOf(match[1].toLowerCase());
  if (monthIndex === -1) return publishedDate;

  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })
      .format(new Date(Date.UTC(Number(match[2]), monthIndex, 1)));
  } catch {
    return publishedDate;
  }
}
