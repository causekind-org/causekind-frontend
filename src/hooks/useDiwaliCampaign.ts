"use client";

import { useSyncExternalStore } from "react";

import { isDiwaliCampaignActive } from "@/lib/diwali";

const subscribe = () => () => {};

/**
 * Whether the Diwali home page is showing. The server render and the client's
 * hydration pass both decide from the date (and the env override) alone, so the
 * HTML and the first client render agree.
 */
export function useDiwaliCampaign(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isDiwaliCampaignActive(),
    () => isDiwaliCampaignActive(),
  );
}
