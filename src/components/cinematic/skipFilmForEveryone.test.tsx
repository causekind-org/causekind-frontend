import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";

/**
 * Skip intro used to appear only for returning visitors. It now shows to
 * everyone while the film plays, including a first visit with empty storage,
 * and still lands on (and focuses) the section after the film.
 */

const loadGsap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/gsapLoader", () => ({
  loadGsap,
  refreshScrollTrigger: () => {},
  gsapIfLoaded: () => null,
}));
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
  it("retires a film that has scrolled past without loading GSAP", async () => {
    sessionStorage.clear();
    window.scrollTo = vi.fn();
    render(<Page />);
    const film = document.querySelector<HTMLElement>(".ck-cinematic")!;
    vi.spyOn(film, "getBoundingClientRect").mockReturnValue({
      top: -101, bottom: -1, left: 0, right: 400,
      width: 400, height: 100, x: 0, y: -101, toJSON: () => ({}),
    });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise(resolve => requestAnimationFrame(resolve));
    });
    expect(film.style.display).toBe("none");
    expect(sessionStorage.getItem("ck:landing-film:collapsed")).toBe("1");
    expect(loadGsap).not.toHaveBeenCalled();
  });

  it("shows on a first visit while the film plays, and skips to the next section", async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    render(<Page />);
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    // Initial setup must not fetch GSAP just to monitor the film's bounds.
    await act(async () => { await Promise.resolve(); });
    expect(loadGsap).not.toHaveBeenCalled();

    // Active state follows live geometry; completed-film collapse does too.
    const film = document.querySelector<HTMLElement>(".ck-cinematic") ??
      document.querySelector<HTMLElement>("[data-cinematic-root]");
    expect(film).not.toBeNull();
    vi.spyOn(film!, "getBoundingClientRect").mockReturnValue({
      top: -1, bottom: window.innerHeight + 100, left: 0, right: 400,
      width: 400, height: window.innerHeight + 101, x: 0, y: -1,
      toJSON: () => ({}),
    });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise(resolve => requestAnimationFrame(resolve));
    });
    const button = screen.getByRole("button", { name: /skip/i });

    fireEvent.click(button);
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Who we are" }));
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
  });
});
