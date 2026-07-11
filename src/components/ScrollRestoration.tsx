"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "ck_scroll_positions";
const RESTORE_ATTEMPTS = 8;
const RESTORE_INTERVAL_MS = 120;

function readStore(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePosition(path: string) {
  try {
    const store = readStore();
    store[path] = window.scrollY;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage unavailable (private mode etc.) — scroll memory just won't persist
  }
}

/**
 * Remembers each page's scroll position (per pathname, per browser tab) and restores
 * it when the user navigates back — resets on tab close since it's sessionStorage,
 * not a permanent "resume reading" bookmark across days/devices.
 */
export function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Restore this page's saved position. Retries briefly since client-fetched
  // data/images can still be growing the page height right after mount —
  // stops early the moment the user scrolls on their own.
  useEffect(() => {
    const y = readStore()[pathname];
    if (!y) return;

    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchmove", stop, { once: true, passive: true });

    let attempts = 0;
    function tick() {
      if (cancelled) return;
      window.scrollTo(0, y);
      attempts++;
      if (attempts < RESTORE_ATTEMPTS) setTimeout(tick, RESTORE_INTERVAL_MS);
    }
    tick();

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, [pathname]);

  // Keep saving this page's position while the user is on it (scroll + tab close).
  useEffect(() => {
    let frame: number | null = null;
    function onScroll() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        savePosition(pathname);
        frame = null;
      });
    }
    const onBeforeUnload = () => savePosition(pathname);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (frame !== null) cancelAnimationFrame(frame);
      savePosition(pathname);
    };
  }, [pathname]);

  return null;
}
