/** Constants and helpers shared by the Mail Center section files. */
import type { McAudience } from "@/lib/api";

export const SEGMENT_LABEL: Record<string, string> = {
  SUBSCRIBERS: "Newsletter subscribers",
  DONORS: "Donors",
  NGO_PARTNERS: "NGO partners",
};

export const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-stone-500/15 text-stone-400",
  SCHEDULED: "bg-sky-500/15 text-sky-400",
  SENDING: "bg-amber-500/15 text-amber-400",
  PAUSED: "bg-orange-500/15 text-orange-400",
  SENT: "bg-emerald-500/15 text-emerald-400",
  FAILED: "bg-red-500/15 text-red-400",
  CANCELLED: "bg-stone-500/15 text-stone-500",
};

export type Draft = {
  id: number | null; name: string; subject: string; preheader: string; html: string; text: string;
  segments: string[]; dailyLimit: string;
  /** Phase 3a: sender Mail ID (null = default) and tracking (false = personal mode). */
  identityId: number | null; tracking: boolean;
};
export const EMPTY: Draft = { id: null, name: "", subject: "", preheader: "", html: "<p>Hello {{first_name}},</p><p></p>", text: "", segments: [], dailyLimit: "", identityId: null, tracking: true };
export const audienceKey = (id: number) => `AUDIENCE:${id}`;

export const errText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

// ------------------------------------------------------------------ saved lists

/** Extra columns of the saved lists chosen for a campaign (usable as variables). */
export function audienceColumns(audiences: McAudience[], chosen: string[]): string[] {
  const out = new Set<string>();
  for (const a of audiences) {
    if (!chosen.includes(audienceKey(a.id)) || !a.columns) continue;
    a.columns.split(",").filter(Boolean).forEach((c) => out.add(c));
  }
  return [...out];
}
