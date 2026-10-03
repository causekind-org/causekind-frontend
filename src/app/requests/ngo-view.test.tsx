import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { NgoRequestsPage } from "./ngo-view";
import RedirectToNgoDrivesNew from "../ngo/requests/new/page";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("@/lib/api", () => ({
  getItemRequests: vi.fn().mockResolvedValue([]),
  getMyItemRequests: vi.fn().mockResolvedValue([]),
  getAvailableDonorListings: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/Reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useDynamicTranslation", () => ({
  TranslatedText: ({ text, children }: { text?: string; children?: ReactNode }) => <>{text ?? children}</>,
}));

/**
 * NGOs ask for items by starting a drive. The shared /requests/new form is the
 * donee's, built around a household need profile; an NGO sent there lands in a flow
 * it cannot complete.
 */
describe("NGO request entry points", () => {
  it("never links an NGO to the donee request form", async () => {
    const { container } = render(<NgoRequestsPage />);
    await waitFor(() => expect(container.querySelectorAll("a").length).toBeGreaterThan(0));

    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.filter((href) => href.startsWith("/requests/new"))).toEqual([]);
    expect(hrefs).toContain("/ngo/drives/new");
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("sends the old /ngo/requests/new address to the drive form", () => {
    RedirectToNgoDrivesNew();
    expect(mockRedirect).toHaveBeenCalledWith("/ngo/drives/new");
  });
});
