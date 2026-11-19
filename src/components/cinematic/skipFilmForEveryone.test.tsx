import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";

/**
 * Skip intro used to appear only for returning visitors. It now shows to
 * everyone while the film plays, including a first visit with empty storage,
 * and still lands on (and focuses) the section after the film.
 */

const triggers: { onToggle: (self: { isActive: boolean }) => void }[] = [];
// gsap now arrives through lib/gsapLoader (after idle); resolve it at once here.
vi.mock("@/lib/gsapLoader", () => {
  const ScrollTrigger = {
    create: (opts: { onToggle: (self: { isActive: boolean }) => void }) => {
      triggers.push(opts);
      return { kill: () => {} };
    },
    refresh: () => {},
  };
  return {
    loadGsap: () => Promise.resolve({ gsap: {}, ScrollTrigger }),
    refreshScrollTrigger: () => {},
    gsapIfLoaded: () => null,
  };
});
vi.mock("@/components/SmoothScroll", () => ({ getLenis: () => null }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import { CinematicOrchestrator } from "./CinematicOrchestrator";

function Page() {
  const dest = useRef<HTMLElement>(null);
  return (
    <>
      <CinematicOrchestrator destinationRef={dest} />
      <section ref={dest} tabIndex={-1} aria-label="Who we are" />
    </>
  );
}

describe("Skip intro", () => {
  it("shows on a first visit while the film plays, and skips to the next section", async () => {
    window.localStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    render(<Page />);
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    // Let the (mocked) gsap load resolve so the triggers are created.
    await act(async () => { await Promise.resolve(); });

    act(() => triggers.at(-1)!.onToggle({ isActive: true }));
    const button = screen.getByRole("button", { name: /skip/i });

    fireEvent.click(button);
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Who we are" }));
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
  });
});
