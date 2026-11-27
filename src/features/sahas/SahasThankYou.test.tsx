import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SahasThankYou } from "@/features/sahas/SahasThankYou";

vi.mock("@/components/AppLink", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const base = {
  donorName: "Asha Rao", amount: 1001, tip: 30, title: "School Kits", imageUrl: null, imageAlt: "",
  shareUrl: "https://example.com/sahas/school-kits", popup: true, leave: <button type="button">Close</button>,
};

describe("SahasThankYou", () => {
  it("thanks the donor by first name and shows what they gave while documents are prepared", () => {
    render(<SahasThankYou {...base} docs={null} />);
    expect(screen.getByRole("heading", { name: "Thank you, Asha!" })).toBeTruthy();
    expect(screen.getByText("₹1,001")).toBeTruthy();
    expect(screen.getByText(/Preparing your documents/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Invite friends on WhatsApp" }).getAttribute("href")).toContain(encodeURIComponent(base.shareUrl));
    expect(screen.queryByRole("link", { name: "Download certificate" })).toBeNull();
  });

  it("offers the documents once they are ready", () => {
    render(<SahasThankYou {...base} donorName="" docs={{ certificate: "/c", receipt: "/r", receiptOwed: true }} />);
    expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download certificate" }).getAttribute("href")).toBe("/c");
    expect(screen.getByRole("link", { name: "Download 80G receipt" }).getAttribute("href")).toBe("/r");
    expect(screen.queryByText(/Preparing your documents/)).toBeNull();
  });
});
