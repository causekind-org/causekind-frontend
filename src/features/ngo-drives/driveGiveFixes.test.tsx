import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DRIVE_CONDITIONS, driveAcceptedConditions } from "./driveConditions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));

import { BackButton } from "@/components/BackButton";
import { NgoDriveCard } from "./components/NgoDriveCard";

const src = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("drive conditions", () => {
  it("each drive rule accepts every condition the backend's NgoDriveCondition lists", () => {
    expect(Object.fromEntries(DRIVE_CONDITIONS.map(c => [c.value, driveAcceptedConditions(c.value)]))).toEqual({
      NEW_ONLY: ["Unused", "Like New"],
      NEW_OR_GENTLY_USED: ["Unused", "Like New", "Good"],
      SEALED_ONLY: ["Unused"],
      USED_WORKING: ["Unused", "Like New", "Good", "Fair"],
      ANY_USABLE: ["Unused", "Like New", "Good", "Fair", "Needs Minor Repair"],
    });
    expect(driveAcceptedConditions("SOMETHING_ELSE")).toBeNull();
  });
});

describe("drive card", () => {
  it("shows no short description and no days-left line", () => {
    const drive = { id: 1, title: "Winter blankets", tagline: "Warmth for elders this winter", neededBy: "2030-01-01",
      quantityNeeded: 10, quantityPledged: 0, quantityReceived: 0, unit: "PIECES", status: "LIVE", ngoOrganizationName: "Hope Trust" };
    render(<NgoDriveCard drive={drive as never} />);
    expect(screen.getByText("Winter blankets")).toBeInTheDocument();
    expect(screen.queryByText("Warmth for elders this winter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drive-days-left")).not.toBeInTheDocument();
  });
});

describe("back button", () => {
  it("is white inside the green hero on the drive and NGO pages; plain elsewhere", () => {
    const { unmount } = render(<BackButton onDark />);
    expect(screen.getByTestId("back-button").className).toContain("text-white");
    unmount();
    render(<BackButton />);
    expect(screen.getByTestId("back-button").className).toContain("text-stone-700");
    const detail = src("features/ngo-drives/components/DriveDetailView.tsx");
    expect(detail.indexOf("<BackButton onDark")).toBeGreaterThan(detail.indexOf("{/* ── Hero ── */}"));
    expect(src("features/ngo-profile/NgoPublicPage.tsx")).toMatch(/to-emerald-800 text-white">\s*<div[^>]*><BackButton onDark \/>/);
  });

  it("the give page shares one draft request and keys the wizard by offer id", () => {
    const page = src("app/drives/[id]/give/page.tsx");
    expect(page).toContain("draftRequest.current?.driveId === drive.id");
    expect(page).toContain("key={offer.id}");
  });
});
