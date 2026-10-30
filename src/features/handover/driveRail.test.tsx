import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { HandoverJourneyRail } from "./HandoverJourneyRail";

const current = (c: HTMLElement) => c.querySelector('[aria-current="step"]')?.textContent ?? null;

describe("drive handover progress bar", () => {
  it("code confirmed, no photo: Photo is current; complete: no current step (all ticked); 6 steps", () => {
    const a = render(<HandoverJourneyRail state="photo_pending" flow="NGO_OFFER" />);
    expect(current(a.container)).toMatch(/Photo/);
    expect(a.container.textContent).not.toMatch(/Certificate|Fulfilled/);
    a.unmount();
    for (const s of ["issue_window", "completed", "issue_raised"] as const) {
      const r = render(<HandoverJourneyRail state={s} flow="NGO_OFFER" />);
      expect(current(r.container)).toBeNull();
      expect(r.container.querySelectorAll("li")).toHaveLength(6);
      r.unmount();
    }
  });
});
