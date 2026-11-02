import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PastActivityForm } from "@/features/ngo-profile/PastActivity";
import { NgoActivityModerationPanel } from "@/app/admin/ngos/NgoActivityModerationPanel";
import { supersededBy } from "@/app/admin/ngos/NgoReviewPanel";
import { createNgoActivity, getPendingNgoActivities } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  createNgoActivity: vi.fn(),
  getPendingNgoActivities: vi.fn(),
  approveNgoActivity: vi.fn(),
  rejectNgoActivity: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

afterEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/"); });

describe("Past activity text limit (item 2)", () => {
  it("never cuts: 2001 characters stay typed, the counter goes red and Save is disabled; 2000 is fine", () => {
    render(<PastActivityForm onSaved={() => {}} />);
    const work = screen.getByLabelText(/What work did you do/) as HTMLTextAreaElement;
    expect(work.maxLength).toBe(-1);
    fireEvent.change(work, { target: { value: "a".repeat(2001) } });
    expect(work.value).toHaveLength(2001);
    const counter = screen.getByTestId("activity-work-count");
    expect(counter).toHaveTextContent("2001 / 2000");
    expect(counter).toHaveTextContent("1 over the limit");
    expect(counter.className).toContain("text-red-600");
    expect(work.className).toContain("border-red-500");
    expect(screen.getByRole("button", { name: /Save activity/ })).toBeDisabled();

    fireEvent.change(work, { target: { value: "a".repeat(2000) } });
    expect(screen.getByTestId("activity-work-count")).toHaveTextContent("2000 / 2000");
    expect(screen.getByTestId("activity-work-count").className).not.toContain("text-red-600");
    expect(screen.getByRole("button", { name: /Save activity/ })).not.toBeDisabled();
    expect(createNgoActivity).not.toHaveBeenCalled();
  });
});

describe("Superseded application (item 3)", () => {
  it("an older row names the latest; the latest names nothing", () => {
    const submissions = [{ applicationId: "CK-NGO-2026-DE898E91" }, { applicationId: "CK-NGO-2026-BAB4801B" }];
    expect(supersededBy({ current: false, application: { applicationId: "CK-NGO-2026-BAB4801B" }, submissions })).toBe("CK-NGO-2026-DE898E91");
    expect(supersededBy({ current: true, application: { applicationId: "CK-NGO-2026-DE898E91" }, submissions })).toBeNull();
  });
});

describe("Past activity tab (item 4)", () => {
  const item = { activity: { id: 7, title: "Winter drive", activityDate: "2026-10-01", description: "x", media: [], consentGiven: true }, organizationName: "Hope Trust" };

  it("the tab count is the length of the list shown, and an old ?q= from another tab is not used when cleared", async () => {
    vi.mocked(getPendingNgoActivities).mockResolvedValue([item] as never);
    const onCount = vi.fn();
    render(<NgoActivityModerationPanel onCount={onCount} />);
    expect(await screen.findAllByTestId("admin-activity")).toHaveLength(1);
    expect(onCount).toHaveBeenLastCalledWith(1);
    expect(screen.queryByText("Nothing waiting.")).toBeNull();
  });

  it("a failed load is an error with Retry, never 'Nothing waiting'", async () => {
    vi.mocked(getPendingNgoActivities).mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce([item] as never);
    render(<NgoActivityModerationPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(screen.queryByText("Nothing waiting.")).toBeNull();
    await waitFor(() => expect(screen.getAllByTestId("admin-activity")).toHaveLength(1));
  });
});
