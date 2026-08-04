"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createItemListingDraft, updateItemListingDraft } from "@/lib/api";
import { serialize, snapshotKey } from "./wizardSerializer";
import type { WizardModel } from "./wizardModel";

/**
 * Server-backed draft identity and autosave.
 *
 * <p>Three failure modes this exists to prevent, none of which are visible in
 * the UI when they happen:
 *
 * <p>1. **Duplicate drafts.** Two quick actions both seeing `draftId == null`
 * would each POST a draft and the first would be orphaned. `ensureDraft` stores
 * the in-flight *promise*, so concurrent callers await the same POST.
 *
 * <p>2. **Concurrent PATCHes.** Debounce alone does not stop a second save
 * starting while the first is still open, and the two can land out of order.
 * Exactly one request is in flight; edits during a save collapse into a single
 * queued snapshot — latest wins — which is sent when the active one settles.
 *
 * <p>3. **A stale response marking newer data saved.** Each save carries an
 * incrementing revision; a response is only allowed to set "saved" if no newer
 * revision has been queued since. Otherwise a slow early PATCH could report
 * success and leave the user believing later edits were persisted.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 650;

export function useListingDraft(options: {
  /** Existing listing id for draft-resume / edit; null when creating fresh. */
  initialId: number | null;
  /** Called once a draft id first exists, so the route can update the URL. */
  onDraftCreated?: (id: number) => void;
}) {
  const { initialId, onDraftCreated } = options;

  const [draftId, setDraftId] = useState<number | null>(initialId);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const draftIdRef = useRef<number | null>(initialId);
  const creatingRef = useRef<Promise<number> | null>(null);

  const inFlightRef = useRef(false);
  const queuedRef = useRef<WizardModel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Monotonic. Bumped whenever new data is queued. */
  const revisionRef = useRef(0);
  /** Revision of the request currently in flight. */
  const flightRevisionRef = useRef(0);
  /** Digest of the last snapshot the server confirmed. */
  const savedKeyRef = useRef<string | null>(null);

  const unmountedRef = useRef(false);
  useEffect(() => () => {
    unmountedRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  /** Single-flight draft creation. Safe to call from anywhere, any number of times. */
  const ensureDraft = useCallback(async (): Promise<number> => {
    if (draftIdRef.current != null) return draftIdRef.current;
    if (creatingRef.current) return creatingRef.current;

    const p = (async () => {
      const created = await createItemListingDraft();
      draftIdRef.current = created.id;
      if (!unmountedRef.current) setDraftId(created.id);
      onDraftCreated?.(created.id);
      return created.id;
    })();

    creatingRef.current = p;
    try {
      return await p;
    } finally {
      creatingRef.current = null;
    }
  }, [onDraftCreated]);

  /** Sends whatever is queued. Recurses if newer data arrived mid-flight. */
  const pump = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const next = queuedRef.current;
    if (next == null) return;

    queuedRef.current = null;
    inFlightRef.current = true;
    flightRevisionRef.current = revisionRef.current;
    const sendingKey = snapshotKey(next);
    const sendingRevision = flightRevisionRef.current;

    if (!unmountedRef.current) setStatus("saving");

    let succeeded = false;
    try {
      const id = await ensureDraft();
      await updateItemListingDraft(id, serialize(next));
      succeeded = true;

      savedKeyRef.current = sendingKey;
      // Only claim "saved" if nothing newer has been queued in the meantime.
      if (!unmountedRef.current && sendingRevision === revisionRef.current && queuedRef.current == null) {
        setStatus("saved");
      }
    } catch {
      // Put it back so an explicit retry has something to send, but never
      // clobber a newer snapshot that arrived while this request was failing.
      if (queuedRef.current == null) queuedRef.current = next;
      if (!unmountedRef.current) setStatus("error");
    } finally {
      inFlightRef.current = false;
    }

    // Only chain on success. Recursing after a failure would spin forever
    // against a down server, because the failed snapshot is put back in the
    // queue. A retry there has to be user- or edit-initiated.
    if (succeeded && queuedRef.current != null) {
      await pump();
    }
  }, [ensureDraft]);

  /** Debounced ordinary field save. */
  const queueSave = useCallback((model: WizardModel) => {
    if (snapshotKey(model) === savedKeyRef.current) return; // nothing changed
    queuedRef.current = model;
    revisionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void pump(); }, DEBOUNCE_MS);
  }, [pump]);

  /** Photo add/remove — no reason to wait out the debounce. */
  const queueSaveNow = useCallback((model: WizardModel) => {
    queuedRef.current = model;
    revisionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void pump();
  }, [pump]);

  /**
   * Drains the queue and resolves once the newest snapshot is server-confirmed.
   * Used by Save & Exit and by final submit — the two places where continuing
   * with unsaved data would lose or misrepresent the donor's work.
   */
  const flush = useCallback(async (model: WizardModel): Promise<boolean> => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (snapshotKey(model) !== savedKeyRef.current) {
      queuedRef.current = model;
      revisionRef.current += 1;
    }

    // Wait out an active request before starting ours, so ordering holds.
    while (inFlightRef.current) {
      await new Promise(r => setTimeout(r, 60));
    }
    await pump();
    while (inFlightRef.current) {
      await new Promise(r => setTimeout(r, 60));
    }
    return savedKeyRef.current === snapshotKey(model);
  }, [pump]);

  const retry = useCallback(() => { void pump(); }, [pump]);

  /** True once the given snapshot is confirmed on the server. */
  const isSnapshotSaved = useCallback(
    (model: WizardModel) => savedKeyRef.current === snapshotKey(model),
    [],
  );

  /** Lets edit-mode seed the baseline so hydration alone does not look "unsaved". */
  const markSavedBaseline = useCallback((model: WizardModel) => {
    savedKeyRef.current = snapshotKey(model);
  }, []);

  return {
    draftId, status, ensureDraft, queueSave, queueSaveNow,
    flush, retry, isSnapshotSaved, markSavedBaseline,
  };
}
