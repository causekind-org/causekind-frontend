"use client";

/**
 * Mail Center: saved lists (Phase 2; inventory AU01–AU07, AU17).
 * Directory with search/tag filter and usage, plus "new list" from a sheet,
 * pasted emails or a live group snapshot. Opening a list shows AudienceDetail.
 */
import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import { mcAudiencesFiltered, mcCreateAudience, mcSnapshot, tagsOfAudience, type McAudience } from "@/lib/api";
import { Loader2, Send } from "lucide-react";
import { SEGMENT_LABEL, errText } from "./shared";
import { SheetMapping, uploadInChunks, resultText, type MappedSheet } from "./SheetMapping";
import { parsePasted } from "./sheetImport";
import { AudienceDetail } from "./AudienceDetail";

export { parseCsv } from "./sheetImport";

type Mode = "sheet" | "paste" | "segment";
const splitTags = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const when = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null);

export function AudiencesView({ isDark, audiences, segments, onChanged, onSendCampaign, openId, onOpen }: {
  isDark: boolean; audiences: McAudience[]; segments: string[]; onChanged: () => void;
  onSendCampaign: (audienceId: number) => void;
  /** Open list (kept by the panel so it can live in the URL). */
  openId: number | null; onOpen: (id: number | null) => void;
}) {
  const t = saTheme(isDark);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [list, setList] = useState<McAudience[]>(audiences);
  const [listError, setListError] = useState(false);
  const [mode, setMode] = useState<Mode>("sheet");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [mapped, setMapped] = useState<MappedSheet | null>(null);
  const [pasted, setPasted] = useState("");
  const [chosenSegments, setChosenSegments] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;
  const label = `mb-1 block text-3xs font-black uppercase tracking-wider ${t.dim}`;

  // Server-side search/tag filter; the unfiltered list comes from the panel.
  useEffect(() => {
    if (!q.trim() && !tag) { setList(audiences); setListError(false); return; }
    let live = true;
    const h = window.setTimeout(() => {
      mcAudiencesFiltered(q, tag).then((x) => live && (setList(x), setListError(false))).catch(() => live && setListError(true));
    }, 250);
    return () => { live = false; window.clearTimeout(h); };
  }, [q, tag, audiences]);

  const allTags = Array.from(new Set(audiences.flatMap(tagsOfAudience))).sort();
  const pastedParse = mode === "paste" ? parsePasted(pasted) : null;

  const create = useCallback(async () => {
    setError(null); setProgress(null);
    if (!name.trim()) { setError("Give the list a name."); return; }
    if (consent.trim().length < 10) { setError("Say how these people agreed to get emails from CauseKind."); return; }
    const tags = splitTags(tagsText);
    setBusy(true);
    try {
      if (mode === "segment") {
        if (!chosenSegments.length) throw new Error("Choose at least one group.");
        const r = await mcSnapshot({ segments: chosenSegments, name: name.trim(), consentBasis: consent.trim(), tags });
        setProgress(`Saved “${r.audience.name}” with ${r.result.total} people (a fixed copy; it won't change when the group does).`);
      } else {
        const rows = mode === "sheet" ? mapped?.rows : pastedParse?.rows;
        if (!rows?.length) throw new Error(mode === "sheet" ? "Choose a file first." : "Paste at least one email address.");
        const a = await mcCreateAudience(name.trim(), consent.trim(), mode === "sheet" ? mapped!.columns : [],
          { description: description.trim() || undefined, tags, origin: mode === "sheet" ? "UPLOAD" : "PASTE" });
        const sum = await uploadInChunks(a.id, rows, setProgress);
        setProgress(`Saved “${a.name}”: ${resultText(sum)}`);
      }
      setName(""); setConsent(""); setDescription(""); setTagsText(""); setPasted(""); setChosenSegments([]); setMapped(null);
      onChanged();
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }, [name, consent, tagsText, mode, chosenSegments, mapped, pastedParse, description, onChanged]);

  if (openId != null) {
    return <AudienceDetail isDark={isDark} id={openId} onBack={() => { onOpen(null); onChanged(); }}
      onSendCampaign={onSendCampaign} onDeleted={() => { onOpen(null); onChanged(); }} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={`space-y-4 rounded-2xl border p-4 ${t.card}`}>
        <h3 className={`text-base font-black ${t.heading}`}>New list</h3>
        <div role="tablist" aria-label="Where the people come from" className="flex flex-wrap gap-1.5">
          {([["sheet", "Spreadsheet"], ["paste", "Paste emails"], ["segment", "Copy of a group"]] as const).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
              className={`min-h-9 rounded-full border px-3.5 text-xs font-bold ${mode === m ? t.chipActive : t.chipInactive}`}>{l}</button>
          ))}
        </div>

        {mode === "sheet" && (
          <>
            <p className={`text-xs ${t.muted}`}>A .csv or .xlsx file with a header row and an email column. Other columns become variables like {"{{city}}"}. Up to 50,000 people.</p>
            <SheetMapping onChange={setMapped} fieldClass={field} labelClass={label} mutedClass={t.muted} />
          </>
        )}
        {mode === "paste" && (
          <div>
            <label className={label} htmlFor="mc-paste">Email addresses</label>
            <textarea id="mc-paste" rows={6} className={`${field} font-mono text-xs`} value={pasted} onChange={(e) => setPasted(e.target.value)}
              placeholder={"one@example.com\ntwo@example.com, three@example.com"} />
            <p className={`mt-1 text-xs ${t.muted}`}>
              {pastedParse?.rows.length ?? 0} addresses found{pastedParse?.invalid ? `, ${pastedParse.invalid} that don't look like emails will be skipped` : ""}.
            </p>
          </div>
        )}
        {mode === "segment" && (
          <div>
            <span className={label}>Groups to copy</span>
            <div className="flex flex-wrap gap-2">
              {segments.map((s) => {
                const on = chosenSegments.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on}
                    onClick={() => setChosenSegments(on ? chosenSegments.filter((x) => x !== s) : [...chosenSegments, s])}
                    className={`min-h-9 rounded-full border px-3.5 text-xs font-bold ${on ? t.chipActive : t.chipInactive}`}>{SEGMENT_LABEL[s] ?? s}</button>
                );
              })}
            </div>
            <p className={`mt-1 text-xs ${t.muted}`}>Saves today&apos;s members as a fixed list. People who join the group later won&apos;t be added.</p>
          </div>
        )}

        <div>
          <label className={label} htmlFor="mc-aname">List name</label>
          <input id="mc-aname" className={field} value={name} maxLength={120} onChange={(e) => setName(e.target.value)}
            placeholder={mapped ? mapped.fileName.replace(/\.(csv|xlsx)$/i, "") : ""} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="mc-atags">Tags (comma-separated, optional)</label>
            <input id="mc-atags" className={field} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="pune, diwali-2026" />
          </div>
          {mode !== "segment" && (
            <div>
              <label className={label} htmlFor="mc-adesc">Description (optional)</label>
              <input id="mc-adesc" className={field} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label className={label} htmlFor="mc-consent">How did these people agree to get emails from CauseKind?</label>
          <textarea id="mc-consent" rows={2} className={field} value={consent} maxLength={500}
            placeholder="e.g. Signed up at the Pune donation drive on 10 Nov 2026 and ticked “send me updates”."
            onChange={(e) => setConsent(e.target.value)} />
          <p className={`mt-1 text-xs ${t.dim}`}>Required. Donee accounts, unsubscribed and blocked addresses stay on the list but are never emailed.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {progress && <p className="text-sm text-emerald-500">{progress}</p>}
        <button type="button" disabled={busy} onClick={create}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-5 text-xs font-bold ${t.btnAccent}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save list
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`mr-auto text-base font-black ${t.heading}`}>Saved lists</h3>
          <input type="search" aria-label="Search lists" placeholder="Search name, description, tag" value={q}
            onChange={(e) => setQ(e.target.value)} className={`${field} max-w-[14rem] py-2`} />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!tag} onClick={() => setTag("")}
              className={`min-h-8 rounded-full border px-3 text-xs font-bold ${!tag ? t.chipActive : t.chipInactive}`}>All</button>
            {allTags.map((x) => (
              <button key={x} type="button" aria-pressed={tag === x} onClick={() => setTag(tag === x ? "" : x)}
                className={`min-h-8 rounded-full border px-3 text-xs font-bold ${tag === x ? t.chipActive : t.chipInactive}`}>#{x}</button>
            ))}
          </div>
        )}
        {listError && <p role="alert" className="text-sm text-red-500">Couldn&apos;t search the lists. Try again.</p>}
        {!listError && list.length === 0 && <p className={`text-sm ${t.muted}`}>{q || tag ? "No list matches." : "No saved lists yet."}</p>}
        {list.map((a) => {
          const tags = tagsOfAudience(a);
          const cols = a.columns ? a.columns.split(",").filter(Boolean) : [];
          return (
            <div key={a.id} className={`rounded-2xl border p-4 ${t.card}`}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => onOpen(a.id)} className="min-w-0 flex-1 text-left">
                  <p className={`truncate text-sm font-bold ${t.heading}`}>{a.name}</p>
                  {a.description && <p className={`truncate text-xs ${t.muted}`}>{a.description}</p>}
                  <p className={`text-xs ${t.muted}`}>
                    {a.memberCount.toLocaleString("en-IN")} people · {cols.length} variable{cols.length === 1 ? "" : "s"}
                    {a.campaignCount ? ` · used in ${a.campaignCount} campaign${a.campaignCount === 1 ? "" : "s"}` : " · not used yet"}
                    {a.lastUsedAt ? `, last ${when(a.lastUsedAt)}` : ""}
                  </p>
                  {tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{tags.map((x) => <span key={x} className={`rounded-full border px-2 py-0.5 text-3xs ${t.badgeAccent}`}>#{x}</span>)}</p>}
                </button>
                <button type="button" onClick={() => onSendCampaign(a.id)} aria-label={`New campaign to ${a.name}`}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${t.btn}`}>
                  <Send className="h-3.5 w-3.5" aria-hidden /> Send
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

