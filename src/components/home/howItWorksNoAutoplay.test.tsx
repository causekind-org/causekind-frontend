import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { HowItWorksSection } from "./HowItWorksSection";
import { HowItWorksDesktop } from "./desktop/HowItWorksDesktop";

/**
 * How It Works used to rotate roles every 2s, which is not long enough to read
 * four steps. The selected role now stays put until the reader changes it.
 * These tests fail if a timer starts moving it again.
 */

const selected = () => screen.getByRole("tab", { selected: true });

describe.each([
  ["phone", HowItWorksSection],
  ["desktop", HowItWorksDesktop],
])("How It Works (%s)", (_name, Section) => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps the first role selected no matter how long the reader waits", () => {
    render(<Section />);
    const first = selected();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(selected()).toBe(first);
  });

  it("changes role on click and on arrow keys", () => {
    render(<Section />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);
    expect(selected()).toBe(screen.getAllByRole("tab")[1]);
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(selected()).toBe(screen.getAllByRole("tab")[2]);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(selected()).toBe(screen.getAllByRole("tab")[2]);
  });
});
