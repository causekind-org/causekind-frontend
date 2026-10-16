"use client";

import { useState } from "react";
import { updateNgoAboutUs } from "@/lib/api";
import { toast } from "@/lib/toast";
import { AboutNgoContent, type AboutNgo } from "@/features/ngo-drives/components/AboutNgoCard";
import { ABOUT_US_MAX, ABOUT_US_MIN, isValidAboutUs } from "@/features/ngo-registration/ngoRegistrationModel";

/**
 * "About the NGO" on an approved NGO's profile. About us is optional for NGOs
 * approved before it existed, so an empty one gets a gentle prompt, not a block.
 */
export function NgoAboutSection({ ngo, onSaved }: { ngo: AboutNgo; onSaved?: (aboutUs: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ngo.aboutUs ?? "");
  const [saved, setSaved] = useState(ngo.aboutUs ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const length = text.trim().length;

  async function save() {
    if (!isValidAboutUs(text)) { setError(`Write ${ABOUT_US_MIN} to ${ABOUT_US_MAX} characters.`); return; }
    setBusy(true); setError(null);
    try {
      const res = await updateNgoAboutUs(text);
      const next = res.aboutUs ?? text.trim();
      setSaved(next); setText(next); setEditing(false);
      onSaved?.(next);
      toast.success("About us saved.");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="about-ngo-heading" className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b-2 border-stone-200 pb-2.5 dark:border-zinc-800">
        <h2 id="about-ngo-heading" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-300">About the NGO</h2>
        {!editing && (
          <button type="button" onClick={() => { setText(saved); setEditing(true); }}
            className="min-h-9 rounded-full px-3 text-xs font-bold text-ngo-800 hover:bg-ngo-50 focus-visible:outline-2 focus-visible:outline-ngo-700 dark:text-ngo-300 dark:hover:bg-ngo-950/40">
            {saved ? "Edit About us" : "Add About us"}
          </button>
        )}
      </div>
      <div className="pt-4">
        {editing ? (
          <div className="space-y-2">
            <label htmlFor="profile-about-us" className="text-sm font-semibold text-stone-800 dark:text-stone-200">About us</label>
            <p id="profile-about-us-hint" className="text-xs text-stone-500 dark:text-stone-400">
              What your NGO does, how you do it, your purpose and the causes you work for.
            </p>
            <textarea id="profile-about-us" rows={6} maxLength={ABOUT_US_MAX} value={text}
              aria-describedby="profile-about-us-hint profile-about-us-count" aria-invalid={!!error}
              onChange={e => { setText(e.target.value); setError(null); }}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-800 focus-visible:outline-2 focus-visible:outline-ngo-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-200" />
            <p id="profile-about-us-count" aria-live="polite" className="text-right text-xs text-stone-500 dark:text-stone-400">
              {length} / {ABOUT_US_MAX}{length < ABOUT_US_MIN ? ` (at least ${ABOUT_US_MIN})` : ""}
            </p>
            {error && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={busy}
                className="min-h-11 rounded-full bg-ngo-700 px-5 text-sm font-semibold text-white hover:bg-ngo-800 disabled:opacity-50">
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setEditing(false); setError(null); }} disabled={busy}
                className="min-h-11 rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-200">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <AboutNgoContent ngo={{ ...ngo, aboutUs: saved }} emptyAboutUs={
            <p data-testid="about-us-prompt" className="rounded-xl bg-ngo-50 p-3 text-sm text-ngo-900 dark:bg-ngo-950/40 dark:text-ngo-200">
              Tell donors what your NGO does and the causes you work for. It shows on your public page.
            </p>
          } />
        )}
      </div>
    </section>
  );
}
