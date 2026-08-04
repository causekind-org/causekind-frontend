// One shared "lane" for the floating prompt pills.
//
// Two prompts run for a DONOR at once — DonorListingPrompt ("Got spare items?")
// and DoneeRequestPrompt (a random open request). Staggering their delay
// constants is not enough to keep them apart: DoneeRequestPrompt awaits a
// network call before it shows, and both reschedule themselves when the user is
// already on the route they point at. Those two things make the real cycles
// drift, so any hand-picked offsets eventually line up and the pills merge.
//
// So the mutual exclusion is enforced here rather than assumed: a prompt must
// claim the lane before it becomes visible, and releases it on the way out.
// A prompt that cannot claim simply tries again shortly.

const GAP_MS = 4_000; // quiet beat after one closes before the next may open

let holder: string | null = null;
let freeAt = 0;

/** True if the caller now owns the lane. Re-claiming while you hold it is a no-op. */
export function claimPromptLane(id: string): boolean {
  if (holder === id) return true;
  if (holder !== null) return false;
  if (Date.now() < freeAt) return false; // still inside the gap
  holder = id;
  return true;
}

/** Safe to call unconditionally — only the current holder can release. */
export function releasePromptLane(id: string): void {
  if (holder !== id) return;
  holder = null;
  freeAt = Date.now() + GAP_MS;
}
