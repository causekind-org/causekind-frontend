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
    expect(drives).toContain("<DiwaliSeam");
    expect(css).toMatch(/\.ck-drives-theme\s*\{[\s\S]*?--color-emerald-700: var\(--ck-home-accent/);
    expect(card).toMatch(/rounded-full bg-ngo-400" aria-hidden="true" \/>\s*(<UiText>)?Verified by CauseKind/);
  });

  it("NGO drives come right after the donee board, for guests and donors only", () => {
    const home = readFileSync(resolve(__dirname, "../../app/HomeClient.tsx"), "utf8");
    expect(home).toContain('const showNgoDrives = !user || roleStr === "DONOR";');
    expect(home.match(/<LiveNeedsComponent [^\n]*\/>\s*\{showNgoDrives && <NgoDrivesSection \/>\}/g)).toHaveLength(2);
    const role = readFileSync(resolve(__dirname, "RoleHome.tsx"), "utf8");
    expect(role).toMatch(/<LiveNeedsSection [^\n]*\/>\s*<\/div>\s*<div[^>]*>\s*<NgoDrivesSection \/>/);
  });

  it("the drives section shares the Live board's Diwali ground, desktop and phone", () => {
    for (const file of ["diwaliDesktop.css", "diwaliMobile.css"]) {
      const diwali = readFileSync(resolve(__dirname, file), "utf8");
      expect(diwali).toMatch(/#live-needs-section, #ngo-drives-section,[^{]*\{ background-color: var\(--dw-cream\); \}/);
    }
  });

  it("is a static check only (no render needed)", () => { expect(vi).toBeDefined(); });
});
