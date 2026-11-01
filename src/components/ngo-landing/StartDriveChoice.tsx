"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Where "Items drive" goes: the drive form, past the type page. */
export const ITEMS_DRIVE_HREF = "/ngo/drives/new?type=items";
const OPEN_EVENT = "ck:open-start-drive-choice";

export function openStartDriveChoice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * "What kind of drive?" — the choice every enabled "Start a Drive" link opens, in the
 * look of the donor "How would you like to give?" popup, in NGO green. Mounted once;
 * it catches clicks on links to /ngo/drives/new (exactly, no query) by delegation, so
 * every such link (hero, dashboard, empty states, menus) opens it. Locked "Start a
 * Drive" buttons are not links and keep their own behaviour; modified clicks and
 * opening /ngo/drives/new directly still go to the page.
 */
export function StartDriveChoice() {
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("data-start-drive-direct")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/ngo/drives/new" || url.search) return;
      e.preventDefault();
      router.push(ITEMS_DRIVE_HREF);
    };
    const onOpen = () => router.push(ITEMS_DRIVE_HREF);
    document.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [router]);

  return null;
}
