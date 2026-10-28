import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostDeliveryIssue } from "@/lib/api";

/** Purchase delivery problems resolve with purchase outcomes, never a bare note. */

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({
  superAdminListDisputes: vi.fn(),
  superAdminResolveDispute: vi.fn(() => Promise.resolve()),
  adminResolvePurchaseIssue: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/api", () => api);

import { DisputesPanel } from "./DisputesPanel";

const dispute = (p: Partial<PostDeliveryIssue>): PostDeliveryIssue => ({
  id: 7, offerId: 4, itemTitle: "School bags", donorName: "Ravi", doneeName: "Asha", reportedByName: "Asha",
  reportedByIsDonor: false, issueType: "ITEM_NOT_RECEIVED", description: "Nothing arrived", windowCategory: "GENERAL",
  windowExpiresAt: null, evidenceUrls: [], adminResolution: null, resolvedAt: null, createdAt: "2026-10-16T10:00:00",
  purchase: false, affectedQuantity: null, counterpartyResponse: null, ...p,
});

describe("DisputesPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers redelivery or closing the remainder for a purchase problem", async () => {
    api.superAdminListDisputes.mockResolvedValue([dispute({ purchase: true, affectedQuantity: 3, counterpartyResponse: "Courier photo shows the gate" })]);
    render(<DisputesPanel isDark={false} />);
    await screen.findByText(/Courier photo shows the gate/);
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    const redeliver = screen.getByRole("button", { name: /Expect redelivery/ }) as HTMLButtonElement;
    expect(redeliver.disabled).toBe(true);
    await userEvent.type(screen.getByRole("textbox"), "Donor will reship via a new courier");
    await userEvent.click(redeliver);
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, {
      action: "RETRY_DELIVERY", reason: "Donor will reship via a new courier",
    }));
    expect(api.superAdminResolveDispute).not.toHaveBeenCalled();
  });

  it("keeps the plain resolve note for handover disputes", async () => {
    api.superAdminListDisputes.mockResolvedValue([dispute({ purchase: false })]);
    render(<DisputesPanel isDark={false} />);
    expect(await screen.findByRole("button", { name: "Resolve" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Expect redelivery/ })).toBeNull();
  });
});
