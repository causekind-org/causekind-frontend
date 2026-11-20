import { FAQ_ITEMS } from "@/app/[locale]/faq/faqItems";

/**
 * The NGO drive questions on /faq ("NGO drives" tab): the `ngo` items of the
 * single FAQ list in app/[locale]/faq/faqItems.ts, so the text lives in one
 * place. Locales without these keys fall back to English.
 */
export const NGO_DRIVE_FAQ_KEYS = FAQ_ITEMS.filter((item) => item.category === "ngo").map(({ q, a }) => ({ q, a }));

export const NGO_DRIVE_FAQ_CATEGORY_KEY = "ngoDrivesCategory";
