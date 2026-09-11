"use client";

import { ComingSoonMagnets } from "@/components/ComingSoonMagnets";

/**
 * ComingSoonMagnetsGanpati
 * Reverts the 3 "coming soon" cards exactly to their original production design
 * (same colors, layout, card style, "tap any card to explore" text, tape/sticker visuals),
 * with only the heading updated to: "More ways to bless & give — coming soon".
 */
export function ComingSoonMagnetsGanpati() {
  return (
    <ComingSoonMagnets
      heading={
        <>
          More ways to bless &amp; give —{" "}
          <span style={{ color: "var(--ck-home-ink,#b04a15)" }}>coming soon</span>
        </>
      }
    />
  );
}
