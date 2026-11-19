import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * NGO drives live only in "Real organisations. Real impact." on the home page:
 * the donee "Real people. Real needs." grid shows requests only, and the drives
 * section follows the home theme tokens (the drive card keeps green elsewhere).
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

  it("the drives section follows the home theme, with the verified dot kept green", () => {
    expect(drives).toContain("ck-drives-theme");
    expect(drives).not.toContain("emerald");
    expect(css).not.toContain("ck-drives-donor-tone");
    expect(drives).not.toContain("DiwaliSeam");
    expect(css).toMatch(/\.ck-drives-theme\s*\{[\s\S]*?--color-emerald-700: var\(--ck-home-accent/);
    expect(card).toMatch(/rounded-full bg-ngo-400" aria-hidden="true" \/>\s*(<UiText>)?Verified by CauseKind/);
  });

  it("NGO drives come right after the donee board, for guests and donors only", () => {
    const home = readFileSync(resolve(__dirname, "../../app/[locale]/HomeClient.tsx"), "utf8");
    expect(home).toContain('const showNgoDrives = !user || roleStr === "DONOR";');
    // HomeClient has a single render path since the home-layouts merge (1e62f724), so the
    // board-then-drives pair appears once (it used to appear in two branches).
    expect(home.match(/<LiveNeedsComponent [^\n]*\/>\s*\{showNgoDrives && <NgoDrivesSection \/>\}/g)).toHaveLength(1);
    const role = readFileSync(resolve(__dirname, "RoleHome.tsx"), "utf8");
    // RoleHome's 2026-11-16 layout (merged in 1e62f724) puts "Two ways to give" and the
    // support gallery between the board and the drives, so only the order is checked.
    const board = role.indexOf("<LiveNeedsSection ");
    const drives = role.indexOf("<NgoDrivesSection />");
    expect(board).toBeGreaterThan(-1);
    expect(drives).toBeGreaterThan(board);
  });

  it("is a static check only (no render needed)", () => { expect(vi).toBeDefined(); });
});
