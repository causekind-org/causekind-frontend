import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * NGO drives live only in "Real organisations. Real impact." on the home page:
 * the donee "Real people. Real needs." grid shows requests only, and the drives
 * section uses the donor terracotta (the drive card keeps green elsewhere).
 */
describe("home drive sections", () => {
  const live = readFileSync(resolve(__dirname, "LiveNeedsSection.tsx"), "utf8");
  const drives = readFileSync(resolve(__dirname, "../../features/ngo-drives/components/NgoDrivesSection.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");
  const card = readFileSync(resolve(__dirname, "../../features/ngo-drives/components/NgoDriveCard.tsx"), "utf8");

  it("the donee needs grid no longer fetches or mixes in NGO drives", () => {
    expect(live).not.toContain("getNgoDrives");
    expect(live).not.toContain("interleave(");
    expect(live).toContain("const allNeeds: NeedCard[] = useMemo(() => initialRequests ?? [], [initialRequests]);");
  });

  it("the drives section is donor terracotta, with the verified dot kept green", () => {
    expect(drives).toContain("ck-drives-donor-tone");
    expect(css).toMatch(/\.ck-drives-donor-tone \{[^}]*--color-emerald-700: var\(--color-brand-500\)/);
    expect(card).toMatch(/rounded-full bg-ngo-400" aria-hidden="true" \/>\s*(<UiText>)?Verified by CauseKind/);
  });

  it("is a static check only (no render needed)", () => { expect(vi).toBeDefined(); });
});
