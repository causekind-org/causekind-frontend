import { NextRequest } from "next/server";
import { interfaceMessageSources, staticInterfaceMessage, translateInterfaceMessage } from "@/lib/translation/messages";
import { isTranslationLocale } from "@/lib/translation/server";
import { guardTranslationRequest, readTranslationBody, translationResponseHeaders as headers } from "@/lib/translation/request";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Bounded cache warming for known interface keys; never accepts arbitrary ICU. */
export async function POST(request: NextRequest) {
  const rejected = guardTranslationRequest(request);
  if (rejected) return rejected;
  try {
    const body = await readTranslationBody(request);
    if (!body || typeof body !== "object") throw new Error("Invalid body");
    const { keys, target } = body as { keys?: unknown; target?: unknown };
    if (!isTranslationLocale(target) || !Array.isArray(keys) || !keys.length || keys.length > 16 ||
        !keys.every((key): key is string => typeof key === "string" && Object.hasOwn(interfaceMessageSources, key))) {
      return Response.json({ error: "Invalid message keys or language" }, { status: 400, headers });
    }
    const results = await Promise.all(keys.map(async (key) => {
      // Keys already in messages/<locale>.json need no Google call.
      const existing = await staticInterfaceMessage(key, target);
      if (existing) return { key, text: existing, translated: true };
      try { return { key, text: await translateInterfaceMessage(interfaceMessageSources[key], target), translated: true }; }
      catch { return { key, text: interfaceMessageSources[key], translated: false }; }
    }));
    return Response.json({ results }, { headers });
  } catch {
    return Response.json({ error: "Invalid translation request" }, { status: 400, headers });
  }
}
