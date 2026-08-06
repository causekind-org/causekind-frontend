"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "./types";

/**
 * Server-backed draft identity and autosave, for any wizard.
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
 *
 * <p>All three are domain-free, which is why this is generic over the model `T`
 * and takes its three domain operations as injected functions. It was extracted
 * verbatim from the listing wizard's hook; nothing about the queueing changed.
 */

const DEBOUNCE_MS = 650;

export type WizardDraftOptions<T> = {
  /** Existing draft id for resume / edit; null when creating fresh. */
  initialId: number | null;
  /** Called once a draft id first exists, so the route can update the URL. */
  onDraftCreated?: (id: number) => void;
  /** POSTs a new empty draft and resolves its id. Must be idempotent-safe. */
  createDraft: () => Promise<number>;
  /** PATCHes the model onto an existing draft. */
  updateDraft: (id: number, model: T) => Promise<unknown>;
  /**
   * Stable digest of everything that would be sent. Two models with the same
   * key are treated as identical and cost no request.
   */
  snapshotKey: (model: T) => string;
};

export function useWizardDraft<T>(options: WizardDraftOptions<T>) {
  const { initialId, onDraftCreated, createDraft, updateDraft, snapshotKey } = options;

  const [draftId, setDraftId] = useState<number | null>(initialId);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const draftIdRef = useRef<number | null>(initialId);
  const creatingRef = useRef<Promise<number> | null>(null);

  const inFlightRef = useRef(false);
  const queuedRef = useRef<T | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Monotonic. Bumped whenever new data is queued. */
  const revisionRef = useRef(0);
  /** Revision of the request currently in flight. */
  const flightRevisionRef = useRef(0);
  /** Digest of the last snapshot the server confirmed. */
  const savedKeyRef = useRef<string | null>(null);

  // The injected operations are read through refs so a caller may pass inline
  // closures without destabilising every callback below — the same reason the
  // photo hook keeps its onUrlsChanged in a ref.
  const opsRef = useRef({ createDraft, updateDraft, snapshotKey, onDraftCreated });
  useEffect(() => {
    opsRef.current = { createDraft, updateDraft, snapshotKey, onDraftCreated };
  }, [createDraft, updateDraft, snapshotKey, onDraftCreated]);

  const unmountedRef = useRef(false);
  useEffect(() => {
    // React Strict Mode mounts, cleans up, then mounts effects again in
    // development. Resetting here keeps the second mount writable.
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  /** Single-flight draft creation. Safe to call from anywhere, any number of times. */
  const ensureDraft = useCallback(async (): Promise<number> => {
    if (draftIdRef.current != null) return draftIdRef.current;
    if (creatingRef.current) return creatingRef.current;

    const p = (async () => {
      const id = await opsRef.current.createDraft();
      draftIdRef.current = id;
      if (!unmountedRef.current) setDraftId(id);
      opsRef.current.onDraftCreated?.(id);
      return id;
    })();

    creatingRef.current = p;
    try {
      return await p;
    } finally {
      creatingRef.current = null;
    }
  }, []);

  /** Sends whatever is queued. Recurses if newer data arrived mid-flight. */
  const pump = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const next = queuedRef.current;
    if (next == null) return;

    queuedRef.current = null;
    inFlightRef.current = true;
    flightRevisionRef.current = revisionRef.current;
    const sendingKey = opsRef.current.snapshotKey(next);
    const sendingRevision = flightRevisionRef.current;

    if (!unmountedRef.current) setStatus("saving");

    let succeeded = false;
    try {
      const id = await ensureDraft();
      await opsRef.current.updateDraft(id, next);
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
  const queueSave = useCallback((model: T) => {
    const nextKey = opsRef.current.snapshotKey(model);
    if (nextKey === savedKeyRef.current && !inFlightRef.current) {
      // Edit then undo before the debounce fires: cancel the stale queued edit.
      // Merely returning here would let that older value persist moments later.
      queuedRef.current = null;
      revisionRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!unmountedRef.current) setStatus("saved");
      return;
    }
    queuedRef.current = model;
    revisionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void pump(); }, DEBOUNCE_MS);
  }, [pump]);

  /** Photo add/remove — no reason to wait out the debounce. */
  const queueSaveNow = useCallback((model: T) => {
    const nextKey = opsRef.current.snapshotKey(model);
    if (nextKey === savedKeyRef.current && !inFlightRef.current) {
      queuedRef.current = null;
      revisionRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!unmountedRef.current) setStatus("saved");
      return;
    }
    queuedRef.current = model;
    revisionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void pump();
  }, [pump]);

  /**
   * Drains the queue and resolves once the newest snapshot is server-confirmed.
   * Used by Save & Exit and by final submit — the two places where continuing
   * with unsaved data would lose or misrepresent the user's work.
   */
  const flush = useCallback(async (model: T): Promise<boolean> => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (opsRef.current.snapshotKey(model) !== savedKeyRef.current) {
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
    return savedKeyRef.current === opsRef.current.snapshotKey(model);
  }, [pump]);

  const retry = useCallback(() => { void pump(); }, [pump]);

  /** True once the given snapshot is confirmed on the server. */
  const isSnapshotSaved = useCallback(
    (model: T) => savedKeyRef.current === opsRef.current.snapshotKey(model),
    [],
  );

  /** Lets edit-mode seed the baseline so hydration alone does not look "unsaved". */
  const markSavedBaseline = useCallback((model: T) => {
    savedKeyRef.current = opsRef.current.snapshotKey(model);
  }, []);

  return {
    draftId, status, ensureDraft, queueSave, queueSaveNow,
    flush, retry, isSnapshotSaved, markSavedBaseline,
  };
}
