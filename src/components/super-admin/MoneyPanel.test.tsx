import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const row = (id: string, kind: string, towards: string, cause: number, platformFee: number, platformSupport: number) => ({
  id, at: "2026-11-05T10:00:00", kind, campaignId: 1, towards, donorName: `Donor ${id}`, donorEmail: `${id}@x.in`,
  anonymous: false, cause, platformFee, platformSupport, paid: cause + platformFee + platformSupport, paymentId: null,
});

vi.mock("@/lib/api", () => ({
  superAdminMoney: { rows: () => Promise.resolve([
    row("D1", "FUNDRAISER", "Surgery", 950, 50, 100),
    row("D2", "SAHAS", "Blankets", 500, 0, 0),
  ]) },
}));

import { MoneyPanel } from "./MoneyPanel";

describe("MoneyPanel", () => {
  it("totals cause, fee and support apart, and the totals follow the filters", async () => {
    render(<MoneyPanel isDark={false} />);
    const totals = await screen.findByLabelText("Money totals");
    expect(within(totals).getByText("₹1,600")).toBeInTheDocument();
    expect(within(totals).getByText("₹1,450")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Money type"), { target: { value: "platformSupport" } });
    expect(screen.queryByText("Donor D2")).not.toBeInTheDocument();
    expect(within(totals).getByText("₹1,100")).toBeInTheDocument();
    expect(within(totals).getByText("₹950")).toBeInTheDocument();
  });
});
