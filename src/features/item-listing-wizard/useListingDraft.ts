"use client";

import { useCallback } from "react";
import { createItemListingDraft, updateItemListingDraft } from "@/lib/api";
import { useWizardDraft } from "@/features/wizard-kit/useWizardDraft";
import { serialize, snapshotKey } from "./wizardSerializer";
import type { WizardModel } from "./wizardModel";

/**
 * The listing wizard's autosave — a thin binding of the listing's three domain
 * operations onto {@link useWizardDraft}.
 *
 * <p>The queueing itself (single-flight create, one PATCH at a time with a
 * latest-wins queue, and the revision guard that stops a stale response marking
 * newer edits "saved") moved into the kit unchanged when the donation-offer
 * wizard needed the identical guarantees. The exported name, signature and
 * returned shape are deliberately unchanged, so nothing in this feature had to
 * be touched.
 */

export type { SaveStatus } from "@/features/wizard-kit/types";

export function useListingDraft(options: {
  /** Existing listing id for draft-resume / edit; null when creating fresh. */
  initialId: number | null;
  /** Called once a draft id first exists, so the route can update the URL. */
  onDraftCreated?: (id: number) => void;
}) {
  const createDraft = useCallback(async () => (await createItemListingDraft()).id, []);
  const updateDraft = useCallback(
    (id: number, model: WizardModel) => updateItemListingDraft(id, serialize(model)),
    [],
  );

  return useWizardDraft<WizardModel>({
    initialId: options.initialId,
    onDraftCreated: options.onDraftCreated,
    createDraft,
    updateDraft,
    snapshotKey,
  });
}
