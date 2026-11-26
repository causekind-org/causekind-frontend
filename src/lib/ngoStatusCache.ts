/**
 * Last-known NGO status for the signed-in account, kept for this browser tab.
 *
 * NGO pages used to start from defaults ("Profile incomplete", "Your Organization", zero
 * counts, "Checking Application…") on every refresh and page change, and only filled in
 * once the server answered. With this snapshot they render what the NGO last saw at once
 * and refresh it quietly in the background.
 *
 * Display only: the backend still checks every action, and a failed fresh load never
 * falls back to a cached approval (useNgoStatus resets to "incomplete" in that case).
 */
const KEY = "ck_ngo_status_v1";

export type NgoStatusSnapshot = {
  account: string;
  status: string;
  ngoName: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  overview: unknown;
  /** Navbar pill: the raw application status ("APPROVED", "UNDER_REVIEW", …). */
  applicationStatus?: string;
  /** The NGO's drives (dashboard counts and Your Drives), so they don't read 0 while reloading. */
  drives?: unknown[];
  savedAt: number;
};

const memory = new Map<string, NgoStatusSnapshot>();

export function readNgoStatus(account: string): NgoStatusSnapshot | null {
  if (!account) return null;
  const hit = memory.get(account);
  if (hit) return hit;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as NgoStatusSnapshot;
    if (snap?.account !== account) return null;
    memory.set(account, snap);
    return snap;
  } catch { return null; }
}

export function writeNgoStatus(account: string, patch: Partial<Omit<NgoStatusSnapshot, "account" | "savedAt">>) {
  if (!account) return;
  const prev = readNgoStatus(account);
  const next: NgoStatusSnapshot = {
    status: "incomplete", ngoName: "", verifiedAt: null, rejectionReason: null, overview: null,
    ...prev, ...patch, account, savedAt: Date.now(),
  };
  memory.set(account, next);
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
}

export function clearNgoStatus() {
  memory.clear();
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
