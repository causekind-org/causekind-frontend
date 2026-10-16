/**
 * The NGO drive FAQ: one list of translation keys (the `faq` namespace) shared by
 * the drive page and the "NGO drives" category on /faq, so the text lives in one
 * place. Locales without these keys fall back to English.
 */
export const NGO_DRIVE_FAQ_KEYS = [1, 2, 3, 4, 5, 6].map(n => ({ q: `ngoDriveQ${n}`, a: `ngoDriveA${n}` })) as readonly { q: string; a: string }[];

export const NGO_DRIVE_FAQ_CATEGORY_KEY = "ngoDrivesCategory";
