/** Shared by server, browser and the manual cache warmer. */
export const TRANSLATION_CHUNK_LENGTH = 4_000;

export function splitTranslationText(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > TRANSLATION_CHUNK_LENGTH) {
    let end = rest.lastIndexOf(" ", TRANSLATION_CHUNK_LENGTH - 1);
    if (end < TRANSLATION_CHUNK_LENGTH / 2) end = TRANSLATION_CHUNK_LENGTH;
    else end += 1;
    const last = rest.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end--;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  chunks.push(rest);
  return chunks;
}
