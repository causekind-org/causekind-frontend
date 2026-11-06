/** A guest's proof that a fundraiser donation is theirs, kept for this tab so the result page can read its status. */
const key = (donationId: number) => `ck:guest-donation:${donationId}`;

export function rememberGuestToken(donationId: number, token: string) {
  try { sessionStorage.setItem(key(donationId), token); } catch { /* storage unavailable: the documents still arrive by email */ }
}

export function guestTokenFor(donationId: number): string | null {
  try { return sessionStorage.getItem(key(donationId)); } catch { return null; }
}
