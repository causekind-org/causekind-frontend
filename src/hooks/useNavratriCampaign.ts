"use client";

import { useSyncExternalStore } from "react";

import { hasNavratriPreview, isNavratriCampaignActive } from "@/lib/navratri";

const subscribe = () => () => {};

/**
 * Whether the Navratri hero is showing.
 *
 * <p>The server render and the client's hydration pass both decide from the
 * date (and the env override) alone, so the HTML and the first client render
 * agree and the real campaign never flashes the wrong hero. Only the
 * `?campaign=navratri` preview is read after hydration — a tester sees the swap,
 * a visitor never does.
 */
export function useNavratriCampaign(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isNavratriCampaignActive(new Date(), undefined, hasNavratriPreview(window.location.search)),
    () => isNavratriCampaignActive(),
  );
}
