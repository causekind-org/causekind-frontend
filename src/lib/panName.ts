/** Same rule as the server's PAN screening: the two names share a word. */
export function sameName(a: string, b: string) {
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1);
  const card = words(b);
  return words(a).some((w) => card.includes(w));
}
