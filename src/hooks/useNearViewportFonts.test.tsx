import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useNearViewportFonts } from "./useNearViewportFonts";

afterEach(() => vi.unstubAllGlobals());

it("defers font classes until the section approaches and disconnects its observer", () => {
  let notify: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  });
  function Section() {
    const ref = useRef<HTMLElement>(null);
    useNearViewportFonts(ref, "serif-variable handwriting-variable");
    return <section ref={ref} data-testid="section" className="layout" />;
  }
  const { unmount } = render(<Section />);
  const section = screen.getByTestId("section");
  expect(section).not.toHaveClass("serif-variable");
  act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(section).toHaveClass("layout", "serif-variable", "handwriting-variable");
  expect(disconnect).toHaveBeenCalledOnce();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(2);
});
