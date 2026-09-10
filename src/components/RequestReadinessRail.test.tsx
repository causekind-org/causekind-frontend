import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestReadinessRail } from "@/components/RequestReadinessRail";
import { progressOf, NEED_PROFILE_CHECKLIST_TOTAL } from "@/lib/needProfileDocs";

const base = {
  pct: 23, remaining: 10, complete: false, failed: false, retrying: false, onRetry: () => {},
};

describe("progressOf", () => {
  /**
   * The regression this exists for: the denominator used to be derived from the
   * missing list, so finishing a field item dropped total and done together and
   * the percentage never moved off 0.
   */
  it("uses the backend's fixed checklist size as the denominator", () => {
    expect(progressOf(Array(10).fill("x"))).toEqual({ total: 13, done: 3, pct: 23 });
    expect(NEED_PROFILE_CHECKLIST_TOTAL).toBe(13);
  });

  it("rises when any one item is completed", () => {
    const before = progressOf(Array(10).fill("x")).pct;
    const after = progressOf(Array(9).fill("x")).pct;
    expect(after).toBeGreaterThan(before);
  });

  it("reads 100% only when nothing is missing", () => {
    expect(progressOf([]).pct).toBe(100);
  });
});

describe("RequestReadinessRail", () => {
  it("shows the remaining count, the next item and the meter value", () => {
    render(<RequestReadinessRail {...base} nextLabel="Proof of address" />);
    expect(screen.getByText(/10 items left/)).toBeInTheDocument();
    expect(screen.getByText(/Next: Proof of address/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "23");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/need-details");
  });

  it("says 'item' not 'items' when one is left", () => {
    render(<RequestReadinessRail {...base} remaining={1} pct={92} />);
    expect(screen.getByText(/1 item left/)).toBeInTheDocument();
    expect(screen.queryByText(/1 items left/)).toBeNull();
  });

  it("reports readiness when complete", () => {
    render(<RequestReadinessRail {...base} complete remaining={0} pct={100} />);
    expect(screen.getByText("Ready to request")).toBeInTheDocument();
    expect(screen.queryByText(/items left/)).toBeNull();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  /** The load-bearing case: an unreachable backend is neither incomplete nor ready. */
  it("shows neither incomplete nor complete state when the check failed", () => {
    render(<RequestReadinessRail {...base} failed />);
    expect(screen.getByText(/Couldn't check your request readiness/)).toBeInTheDocument();
    expect(screen.queryByText(/items left/)).toBeNull();
    expect(screen.queryByText("Ready to request")).toBeNull();
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    // The destination works even when the status fetch did not.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/need-details");
  });

  it("retries on request and disables the button while retrying", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<RequestReadinessRail {...base} failed onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<RequestReadinessRail {...base} failed retrying onRetry={onRetry} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
  });
});
