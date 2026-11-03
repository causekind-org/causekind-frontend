import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { ngoDriveBackHref, ngoHandoverBackHref, NGO_HANDOVERS_HREF } from "@/features/ngo-drives/ngoBackLinks";
import { WizardNavigation } from "@/features/wizard-kit/WizardNavigation";

describe("NGO back navigation (item 3)", () => {
  it("handover Back: ?from= (internal only), else the dashboard's handovers", () => {
    expect(ngoHandoverBackHref("/ngo/drives/5?from=activity")).toBe("/ngo/drives/5?from=activity");
    expect(ngoHandoverBackHref(null)).toBe(NGO_HANDOVERS_HREF);
    expect(NGO_HANDOVERS_HREF).toBe("/dashboard/ngo?tab=activity&filter=handovers");
    expect(ngoHandoverBackHref("https://evil.test")).toBe(NGO_HANDOVERS_HREF);
    expect(ngoHandoverBackHref("//evil.test")).toBe(NGO_HANDOVERS_HREF);
  });

  it("drive page 'Back to dashboard': the previous tab, never a handover page (no loop)", () => {
    expect(ngoDriveBackHref("activity")).toBe("/dashboard/ngo?tab=activity");
    expect(ngoDriveBackHref(null)).toBe("/dashboard/ngo");
    expect(ngoDriveBackHref("/ngo/drives/5/offers/9/handover")).toBe("/dashboard/ngo");
    expect(ngoDriveBackHref("/dashboard/ngo?tab=drives")).toBe("/dashboard/ngo?tab=drives");
  });

  it("the drive page no longer goes back through history", () => {
    const src = readFileSync(resolve(__dirname, "../../app/[locale]/ngo/drives/[id]/page.tsx"), "utf8");
    expect(src).not.toMatch(/router\.back\(\)/);
  });
});

describe("Wizard bottom bar on phones (item 4)", () => {
  it("the bar is marked, and the CSS pads the page by bar + dock + safe area and hides the chat bubble", () => {
    const { container } = render(<WizardNavigation canGoBack onBack={() => {}} onContinue={() => {}} onSaveExit={() => {}}
      continueLabel="Continue" isLast={false} submitting={false} submitted={false} savingExit={false} avoidBottomChrome />);
    const bar = container.querySelector("[data-ck-wizard]") as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.className).toContain("bottom-[var(--ck-bottom-chrome)]");
    const css = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");
    expect(css).toMatch(/body:has\(\[data-ck-wizard\]\) main \{\s*padding-bottom: calc\(var\(--ck-wizard-bar-h\) \+ var\(--ck-bottom-chrome\) \+ env\(safe-area-inset-bottom\)\)/);
    expect(css).toMatch(/html:has\(\[data-ck-wizard\]\) \{\s*scroll-padding-bottom/);
    expect(css).toMatch(/body:has\(\[data-ck-wizard\]\) \.ck-support-fab/);
  });

  it("Start a drive marks its action rows too", () => {
    const src = readFileSync(resolve(__dirname, "../../app/[locale]/ngo/drives/new/page.tsx"), "utf8");
    expect(src.match(/data-ck-wizard="actions"/g)).toHaveLength(3);
    expect(src).toContain("useFocusAboveBar()");
  });
});
