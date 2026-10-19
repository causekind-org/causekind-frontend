import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { fromStoredPhone, phoneError, toStoredPhone } from "@/features/ngo-drives/phoneCountries";
import { handoverModeInWords } from "@/app/ngo/drives/new/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const src = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("file preview popup", () => {
  it("shows an image, a PDF in a viewer, and moves between files", () => {
    const files = [{ name: "Logo", url: "https://x.test/logo.png" }, { name: "80G", url: "https://x.test/80g.pdf" }];
    let index = 0;
    const { rerender } = render(<FilePreviewDialog files={files} index={index} onIndexChange={i => { index = i; }} onClose={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Logo" })).toHaveAttribute("src", "https://x.test/logo.png");
    fireEvent.click(screen.getByRole("button", { name: "Next file" }));
    expect(index).toBe(1);
    rerender(<FilePreviewDialog files={files} index={1} onIndexChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTitle("80G")).toHaveAttribute("src", "https://x.test/80g.pdf");
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});

describe("drive form", () => {
  it("validates the contact phone per country and keeps India's 10-digit format", () => {
    expect(phoneError("+91", "9876543210")).toBeNull();
    expect(phoneError("+91", "12345")).toMatch(/India/);
    expect(phoneError("+971", "501234567")).toBeNull();
    expect(toStoredPhone("+91", "9876543210")).toBe("9876543210");
    expect(toStoredPhone("+44", "7123456789")).toBe("+447123456789");
    expect(fromStoredPhone("+447123456789")).toEqual({ code: "+44", digits: "7123456789" });
    expect(fromStoredPhone("9876543210")).toEqual({ code: "+91", digits: "9876543210" });
  });

  it("does not prefill the contact phone, shows handover details in words, and the submitted popup blocks a second drive", () => {
    const page = src("app/ngo/drives/new/page.tsx");
    expect(page).not.toMatch(/setContactPhone\(ngoContactPhone\)/);
    expect(handoverModeInWords("BOTH", 20)).toBe("I pick up from donors within 20 km; donors farther away drop off at the drive address");
    expect(handoverModeInWords("DROP_OFF", 20)).toMatch(/drop the items off/);
    expect(page).toContain('data-testid="drive-submitted"');
    expect(page).toMatch(/disabled aria-describedby="one-drive-note"/);
    expect(page).toContain("You can start another drive once this one is completed with proof.");
    expect(page).toContain("Reference photos: how you&apos;d like the items to look");
    expect(page).toContain('data-testid="drive-cover-field"');
  });
});

describe("FAQ and landing", () => {
  it("/faq no longer has 'Which cities are you in?' or 'Is CauseKind free to use?'", () => {
    const en = JSON.parse(src("../messages/en.json")).faq;
    expect(en.q12).toBeUndefined();
    expect(en.ngoDriveQ6).toBeUndefined();
    expect(src("app/faq/FaqPageClient.tsx")).not.toContain('t("q12")');
  });

  it("an approved NGO does not see the closing 'Get verified. Post. Deliver.' section", () => {
    expect(src("components/ngo-landing/NgoHowItWorksSection.tsx")).toContain("if (isVerified) return null;");
  });
});
