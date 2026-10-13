import { NextRequest } from "next/server";
import {
  isTranslationLocale, translateWithGoogle,
  MAX_TRANSLATION_BATCH_SIZE, MAX_TRANSLATION_REQUEST_LENGTH, MAX_TRANSLATION_TEXT_LENGTH,
} from "@/lib/translation/server";
import {
  guardTranslationRequest, readTranslationBody, takeFreeTextAllowance, translationResponseHeaders as headers,
  MAX_FREE_TEXT_ITEMS, MAX_FREE_TEXT_LENGTH,
} from "@/lib/translation/request";
import { isKnownSiteText } from "@/lib/translation/known";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const rejected = guardTranslationRequest(request);
  if (rejected) return rejected;
  try {
    const payload = await readTranslationBody(request);
    if (!payload || typeof payload !== "object") throw new Error("Invalid body");
    const { texts, target } = payload as { texts?: unknown; target?: unknown };
    if (!isTranslationLocale(target) || !Array.isArray(texts) || !texts.length ||
        texts.length > MAX_TRANSLATION_BATCH_SIZE ||
        !texts.every((text): text is string => typeof text === "string" && text.length <= MAX_TRANSLATION_TEXT_LENGTH) ||
        texts.reduce((sum, text) => sum + text.length, 0) > MAX_TRANSLATION_REQUEST_LENGTH) {
      return Response.json({ error: "Invalid translation request" }, { status: 400, headers });
    }
    // Site text (blog) is translated and cached permanently. Anything else is
    // free text: short items only, a few per request, a stricter per-visitor
    // limit, and a cache that expires. A refused item stays in its original
    // language; the rest of the batch still translates.
    const known = texts.map((text) => isKnownSiteText(text));
    const freeIndexes = known.flatMap((isKnown, index) => isKnown ? [] : [index]);
    const freeAllowed = freeIndexes.length === 0 || takeFreeTextAllowance(request);
    const acceptedFree = new Set(freeAllowed
      ? freeIndexes.filter((index) => texts[index].length <= MAX_FREE_TEXT_LENGTH).slice(0, MAX_FREE_TEXT_ITEMS)
      : []);
    const results = await Promise.all(texts.map(async (text, index) => {
      if (!known[index] && !acceptedFree.has(index)) return { text, translated: false };
      try {
        return { text: await translateWithGoogle(text, target, "auto", known[index] ? "permanent" : "temporary"), translated: true };
      } catch { return { text, translated: false }; }
    }));
    return Response.json({ results }, { headers });
  } catch {
    return Response.json({ error: "Invalid translation request" }, { status: 400, headers });
  }
}
