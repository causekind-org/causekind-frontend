"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { updateNgoAboutUs } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { AboutNgo } from "@/features/ngo-drives/components/AboutNgoCard";
import { ABOUT_US_MAX, ABOUT_US_MIN, isValidAboutUs } from "@/features/ngo-registration/ngoRegistrationModel";

/**
 * "About the NGO" card on an approved NGO's /profile.
 * Redesigned with large NGO name, verified badge, 2-column fact tiles,
 * clamped paragraph with Read More toggle, clean pill link, and ghost edit button.
 */
export function NgoAboutSection({
  ngo,
  onSaved,
}: {
  ngo: AboutNgo;
  onSaved?: (aboutUs: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [text, setText] = useState(ngo.aboutUs ?? "");
  const [saved, setSaved] = useState(ngo.aboutUs ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const length = text.trim().length;

  async function save() {
    if (!isValidAboutUs(text)) {
      setError(`Write ${ABOUT_US_MIN} to ${ABOUT_US_MAX} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await updateNgoAboutUs(text);
      const next = res.aboutUs ?? text.trim();
      setSaved(next);
      setText(next);
      setEditing(false);
      onSaved?.(next);
      toast.success("About us saved.");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="about-ngo-heading"
      data-testid="about-ngo"
      className="rounded-2xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] p-5 sm:p-6 shadow-sm min-w-0 flex flex-col justify-between"
    >
      <div>
        {/* Card Header: Section label & Ghost edit button */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EADBCE]/80 dark:border-emerald-950/60 pb-3">
          <h2
            id="about-ngo-heading"
            className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight"
          >
            About the NGO
          </h2>
          {/* Once saved, About us is not edited here (no "Edit About us"); an NGO without one can still add it. */}
          {!editing && !saved && (
            <button
              type="button"
              onClick={() => {
                setText(saved);
                setEditing(true);
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-[#F5EFE6]/80 hover:bg-[#efe5d8] border border-[#d9c7b6] dark:text-stone-300 dark:hover:text-stone-100 dark:bg-[#1a251e] dark:hover:bg-[#202e25] dark:border-zinc-700 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Add About us
            </button>
          )}
        </div>

        {editing ? (
          /* Editor Mode */
          <div className="pt-4 space-y-3 min-w-0">
            <div>
              <label htmlFor="profile-about-us" className="text-xs font-bold text-stone-800 dark:text-stone-200">
                About us
              </label>
              <p id="profile-about-us-hint" className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                What your NGO does, how you do it, your purpose and the causes you work for.
              </p>
            </div>
            <textarea
              id="profile-about-us"
              rows={5}
              maxLength={ABOUT_US_MAX}
              value={text}
              aria-describedby="profile-about-us-hint profile-about-us-count"
              aria-invalid={!!error}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              className="w-full rounded-xl border border-[#EADBCE] dark:border-zinc-700 bg-[#FAF7F2] dark:bg-zinc-950 p-3 text-base sm:text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 transition-all break-words [overflow-wrap:anywhere]"
            />
            <p
              id="profile-about-us-count"
              aria-live="polite"
              className="text-right text-3xs text-stone-500 dark:text-stone-400 font-medium"
            >
              {length} / {ABOUT_US_MAX}
              {length < ABOUT_US_MIN ? ` (at least ${ABOUT_US_MIN} characters)` : ""}
            </p>
            {error && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="min-h-10 rounded-full bg-ngo-700 hover:bg-ngo-800 px-5 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={busy}
                className="min-h-10 rounded-full border border-[#d9c7b6] dark:border-zinc-700 bg-[#F5EFE6]/80 dark:bg-zinc-800/40 px-5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-[#efe5d8] dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* View Mode: identity on the left, About us on the right (desktop); stacked on mobile. */
          <div data-testid="about-ngo-layout" className="pt-4 min-w-0 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
          <div className="min-w-0 space-y-4">
            {ngo.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed logo link
              <img src={ngo.logoUrl} alt={`${ngo.organizationName} logo`} className="h-16 w-16 rounded-xl border border-[#EADBCE] object-contain bg-white dark:border-zinc-700" />
            )}
            {/* Header: NGO Name large with Verified badge */}
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              {ngo.slug ? (
                <Link
                  href={`/ngos/${ngo.slug}`}
                  data-testid="about-ngo-name"
                  className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 hover:text-ngo-700 dark:hover:text-ngo-300 transition-colors break-words [overflow-wrap:anywhere] min-w-0"
                >
                  {ngo.organizationName}
                </Link>
              ) : (
                <h3
                  data-testid="about-ngo-name"
                  className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 break-words [overflow-wrap:anywhere] min-w-0"
                >
                  {ngo.organizationName}
                </h3>
              )}

              {ngo.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-3xs font-bold text-emerald-800 dark:text-emerald-300 shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Verified by CauseKind
                </span>
              )}
            </div>

            {ngo.legalStructure && (
              <p className="text-sm text-stone-700 dark:text-stone-300"><span className="font-semibold">Legal structure:</span> {ngo.legalStructure}</p>
            )}

            {/* Fact Tiles: 2-column grid */}
            {(ngo.founderName || ngo.yearOfEstablishment) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                {ngo.founderName && (
                  <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/70 bg-[#F5EFE6]/70 dark:bg-[#121c17]/60 p-3 min-w-0">
                    <p className="text-3xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      {ngo.founderDesignation ? ngo.founderDesignation : "Founder / Trustee"}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-stone-800 dark:text-stone-200 break-words [overflow-wrap:anywhere]">
                      {ngo.founderName}
                    </p>
                  </div>
                )}
                {ngo.yearOfEstablishment && (
                  <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/70 bg-[#F5EFE6]/70 dark:bg-[#121c17]/60 p-3 min-w-0">
                    <p className="text-3xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      Formed in
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-stone-800 dark:text-stone-200 break-words [overflow-wrap:anywhere]">
                      {ngo.yearOfEstablishment}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

            {/* About us text: readable paragraph, clamped to ~4 lines with Read more toggle */}
            <div className="min-w-0">
              {saved?.trim() ? (
                <div>
                  <p
                    className={`text-sm leading-relaxed text-stone-700 dark:text-stone-300 break-words [overflow-wrap:anywhere] whitespace-pre-line ${
                      readMore ? "" : "line-clamp-4"
                    }`}
                  >
                    {saved}
                  </p>
                  {saved.length > 180 && (
                    <button
                      type="button"
                      onClick={() => setReadMore(!readMore)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-ngo-700 dark:text-ngo-400 hover:underline"
                    >
                      {readMore ? (
                        <>
                          Read less <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p
                  data-testid="about-us-prompt"
                  className="rounded-xl bg-ngo-50/80 dark:bg-ngo-950/40 border border-ngo-200/60 dark:border-ngo-900/60 p-3.5 text-xs text-ngo-900 dark:text-ngo-200 leading-relaxed"
                >
                  Tell donors what your NGO does and the causes you work for. It shows on your public page.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Know more about the organization pill button */}
      {!editing && ngo.slug && (
        <div className="mt-5 pt-3 border-t border-[#EADBCE]/80 dark:border-zinc-800/80">
          <Link
            href={`/ngos/${ngo.slug}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#d9c7b6] dark:border-zinc-700 bg-[#F5EFE6]/80 hover:bg-[#efe5d8] dark:bg-[#1a251e] dark:hover:bg-[#202e25] px-4 py-2 text-xs font-bold text-stone-800 dark:text-stone-200 transition-colors shadow-2xs"
          >
            Know more about the organization
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
