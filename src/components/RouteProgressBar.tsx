"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar across the top of the viewport during a route change.
 *
 * <p>Written rather than pulled in: NProgress is a dependency, a global
 * singleton and a jQuery-era API, for what is a width and an opacity.
 *
 * <p>**It is deliberately a fake.** A client-side navigation gives no real
 * completion fraction — the router does not report bytes or milestones — so the
 * bar eases toward 90% on a decaying curve and only jumps to 100% when the new
 * path actually commits. That is honest about what it is: an indication that
 * *something is happening*, which is the job. What it must never do is sit at
 * 100% while the page is still resolving, so it never reaches the end on its
 * own.
 *
 * <p>The 120ms arming delay matters. Most navigations in this app are instant,
 * and a bar that flashes on every click is worse than no bar — so nothing is
 * shown unless the transition is slow enough to be perceived as a wait.
 *
 * <p>Accessibility: the bar is `aria-hidden` decoration; the announcement is a
 * separate polite live region, so a screen reader hears "Loading page" once
 * rather than tracking a percentage. Under `prefers-reduced-motion` the CSS in
 * `styles.css` strips the transition, leaving it as a plain appearing bar.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);

  // The route this bar last settled on. A change means the navigation committed.
  const settledKey = useRef<string | null>(null);
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    // First mount is not a navigation.
    if (settledKey.current === null) {
      settledKey.current = key;
      return;
    }
    if (settledKey.current === key) return;

    settledKey.current = key;

    // The new route has committed. Finish, then clear — the short delay lets
    // the full bar register instead of vanishing mid-stride.
    setValue(100);
    const done = setTimeout(() => {
      setVisible(false);
      setValue(0);
    }, 220);
    return () => clearTimeout(done);
  }, [key]);

  // Arm on any link click or history navigation. `usePathname` only updates
  // once the route commits, which is the end of the wait, not the start — so
  // the start has to come from the interaction itself.
  useEffect(() => {
    let armTimer: ReturnType<typeof setTimeout> | undefined;
    let creep: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      clearTimeout(armTimer);
      armTimer = setTimeout(() => {
        setVisible(true);
        setValue(8);
        clearInterval(creep);
        // Decaying approach to 90%: fast at first, then slower, so a long wait
        // still looks like progress without ever claiming to be finished.
        creep = setInterval(() => {
          setValue(v => (v >= 90 ? v : v + Math.max(0.4, (90 - v) * 0.06)));
        }, 120);
      }, 120);
    };

    const onClick = (e: MouseEvent) => {
      // Only plain left-clicks on same-origin links navigate in-app. Modified
      // clicks open a new tab and leave this document alone.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      // Same page, or a pure hash change — no route resolution to wait on.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      clearTimeout(armTimer);
      clearInterval(creep);
    };
  }, []);

  // Stop the creep as soon as the bar is finishing or hidden.
  useEffect(() => {
    if (!visible) setValue(0);
  }, [visible]);

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {visible ? "Loading page" : ""}
      </span>

      {visible && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
        >
          <div
            className="ck-route-progress h-full origin-left bg-[var(--ck-role-accent)] shadow-[0_0_8px_var(--ck-role-accent)]"
            style={{
              width: `${value}%`,
              transition: "width 200ms ease-out, opacity 200ms ease-out",
              opacity: value >= 100 ? 0 : 1,
            }}
          />
        </div>
      )}
    </>
  );
}
