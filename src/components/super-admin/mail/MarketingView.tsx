"use client";

/**
 * Mail Center: marketing follow-up (Phase 5b; inventory MK01–MK12).
 * Cards, cohorts, people table, and a detail panel with the reply, intent,
 * AI classify, AI reply draft (opens in the normal compose window: a person
 * always sends), mail-app/Gmail hand-off and a confirmed unsubscribe.
 * AI only runs when a button is pressed; usage against the daily cap is shown.
 */
import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcFollowCards, mcFollowPeople, mcFollowCampaigns, mcSetIntent, mcClassify, mcAiDraft, mcFollowUnsubscribe,
  mcAiFacts, mcSaveAiFacts, mcCtaTargets, mcThread, mcMailboxes, mcDrafts,
  type McFollowCards, type McFollowCohort, type McFollowPerson, type McIntent, type McCtaTarget, type McThread,
  type McDraft, type McMailbox,
} from "@/lib/api";
import { Copy, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import { errText } from "./shared";
import { ComposeWindow } from "./ComposeWindow";

const COHORTS: { v: McFollowCohort; l: string }[] = [
  { v: "ALL", l: "Everyone" }, { v: "REPLIED", l: "Replied" }, { v: "POSITIVE", l: "Interested" }, { v: "NEGATIVE", l: "Not interested" },
  { v: "AUTOMATED", l: "Automated" }, { v: "OPENED", l: "Opened" }, { v: "CLICKED", l: "Clicked" }, { v: "NOT_OPENED", l: "Didn't open" },
];
const INTENT_LABEL: Record<McIntent, string> = { POSITIVE: "Interested", NEGATIVE: "Not interested", AUTOMATED: "Automated", UNCLEAR: "Unclear" };
const INTENT_STYLE: Record<McIntent, string> = {
  POSITIVE: "bg-emerald-500/15 text-emerald-600", NEGATIVE: "bg-rose-500/15 text-rose-600",
  AUTOMATED: "bg-stone-500/15 text-stone-500", UNCLEAR: "bg-amber-500/15 text-amber-600",
};
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const ago = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");

export function MarketingView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [campaign, setCampaign] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: number; name: string }[]>([]);
  const [cohort, setCohort] = useState<McFollowCohort>("REPLIED");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [cards, setCards] = useState<McFollowCards | null>(null);
  const [rows, setRows] = useState<McFollowPerson[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<McFollowPerson | null>(null);
  const [factsOpen, setFactsOpen] = useState(false);
  const btn = `inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${t.btn}`;

  useEffect(() => { mcFollowCampaigns().then(setCampaigns).catch(() => setCampaigns([])); }, []);
  const load = useCallback(() => {
    setError(null); setRows(null);
    mcFollowCards(campaign).then(setCards).catch((e) => setError(errText(e)));
    mcFollowPeople({ campaign, cohort, q: q.trim(), page }).then((r) => { setRows(r.rows); setTotal(r.total); }).catch((e) => setError(errText(e)));
  }, [campaign, cohort, q, page]);
  useEffect(() => { const h = window.setTimeout(load, 250); return () => window.clearTimeout(h); }, [load]);

  const card = (label: string, n: number | undefined, sub?: string, go?: McFollowCohort) => (
    <button type="button" disabled={!go} onClick={() => go && (setCohort(go), setPage(0))}
      className={`rounded-xl border p-3 text-left ${t.cardFlat} ${go ? "hover:ring-1 hover:ring-sky-500/40" : ""}`}>
      <p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{label}</p>
      <p className={`text-lg font-black tabular-nums ${t.heading}`}>{n ?? "—"}</p>
      {sub && <p className={`text-3xs ${t.muted}`}>{sub}</p>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Campaign" className={`rounded-xl border px-3 py-2 text-sm ${t.input}`} value={campaign ?? ""}
          onChange={(e) => { setCampaign(e.target.value ? Number(e.target.value) : null); setPage(0); setSel(null); }}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="search" aria-label="Search people" placeholder="Search name or email" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }} className={`w-full max-w-xs rounded-xl border px-3 py-2 text-sm ${t.input}`} />
        <button type="button" onClick={() => setFactsOpen((x) => !x)} className={`ml-auto ${btn}`}><Sparkles className="h-3.5 w-3.5" /> CauseKind facts for AI</button>
      </div>

      {cards && (
        <p className={`text-xs ${t.muted}`}>
          AI: {cards.ai.configured ? `${cards.ai.usedToday} of ${cards.ai.dailyCap} used today (${cards.ai.model}). It runs only when you press an AI button.` : "not set up on this server, so the AI buttons won't work. Everything else does."}
        </p>
      )}
      {factsOpen && <FactsEditor isDark={isDark} onClose={() => setFactsOpen(false)} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {card("Sent", cards?.sent, undefined, "ALL")}
        {card("Opened", cards?.opened, cards ? `${pct(cards.opened, cards.sent)} · approx.` : undefined, "OPENED")}
        {card("Clicked", cards?.clicked, cards ? pct(cards.clicked, cards.sent) : undefined, "CLICKED")}
        {card("Replied", cards?.replied, cards ? `${pct(cards.replied, cards.sent)} · people, not robots` : undefined, "REPLIED")}
        {card("Interested", cards?.positive, undefined, "POSITIVE")}
        {card("Not interested", cards?.negative, undefined, "NEGATIVE")}
        {card("Automated", cards?.automated, undefined, "AUTOMATED")}
      </div>

      <div role="tablist" aria-label="Group" className="flex flex-wrap gap-1">
        {COHORTS.map((c) => (
          <button key={c.v} type="button" role="tab" aria-selected={cohort === c.v} onClick={() => { setCohort(c.v); setPage(0); }}
            className={`min-h-8 rounded-full border px-3 text-xs font-bold ${cohort === c.v ? t.chipActive : t.chipInactive}`}>{c.l}</button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error} <button type="button" className="underline" onClick={load}>Try again</button></p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className={sel ? "hidden lg:block" : ""}>
          {rows == null ? <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
            : rows.length === 0 ? <p className={`py-8 text-center text-sm ${t.muted}`}>No one in this group{campaign ? " for this campaign" : ""} yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className={t.dim}><tr>{["Person", "Campaign", "Activity", "Intent", "Summary", ""].map((h) => <th key={h} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.recipientId} onClick={() => setSel(r)} className={`cursor-pointer border-t ${t.text} ${sel?.recipientId === r.recipientId ? "bg-sky-500/10" : ""}`}>
                        <td className="max-w-[12rem] px-2 py-1.5"><p className="truncate font-bold">{r.name || r.email}</p>{r.name && <p className={`truncate ${t.muted}`}>{r.email}</p>}</td>
                        <td className="max-w-[10rem] truncate px-2 py-1.5">{r.campaignName}{r.round ? ` · round ${r.round}` : ""}</td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {r.lastReplyAt ? `Replied ${ago(r.lastReplyAt)}` : r.clickedAt ? "Clicked" : r.openedAt ? "Opened" : "Sent"}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.intent ? <span className={`rounded-full px-2 py-0.5 text-3xs font-black ${INTENT_STYLE[r.intent]}`}>{INTENT_LABEL[r.intent]}{r.intentSource === "AI" ? " · AI" : ""}</span> : r.threadId ? <span className={t.muted}>not sorted</span> : ""}
                        </td>
                        <td className="max-w-[16rem] truncate px-2 py-1.5" title={r.summary ?? ""}>{r.summary ?? ""}</td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {r.draftReady && <span className="rounded-full bg-sky-500/15 px-1.5 text-3xs text-sky-600">draft ready</span>}
                          {r.unsubscribed && <span className="ml-1 rounded-full bg-stone-500/15 px-1.5 text-3xs text-stone-500">unsubscribed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          <div className="mt-2 flex items-center justify-end gap-2 text-xs">
            <span className={`mr-auto ${t.muted}`}>{total} people</span>
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={btn}>Previous</button>
            <span className={t.muted}>Page {page + 1}</span>
            <button type="button" disabled={(page + 1) * 50 >= total} onClick={() => setPage((p) => p + 1)} className={btn}>Next</button>
          </div>
        </div>
        {sel && <PersonPanel isDark={isDark} person={sel} aiReady={!!cards?.ai.configured} onClose={() => setSel(null)} onChanged={load} />}
      </div>
    </div>
  );
}

function PersonPanel({ isDark, person, aiReady, onClose, onChanged }: {
  isDark: boolean; person: McFollowPerson; aiReady: boolean; onClose: () => void; onChanged: () => void;
}) {
  const t = saTheme(isDark);
  const [thread, setThread] = useState<McThread | null>(null);
  const [p, setP] = useState(person);
  const [brief, setBrief] = useState("");
  const [useFacts, setUseFacts] = useState(true);
  const [cta, setCta] = useState("");
  const [targets, setTargets] = useState<McCtaTarget[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<McDraft | null>(null);
  const [boxes, setBoxes] = useState<McMailbox[]>([]);
  const btn = `inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${t.btn}`;

  useEffect(() => {
    setP(person); setThread(null); setError(null);
    if (person.threadId) mcThread(person.threadId).then(setThread).catch((e) => setError(errText(e)));
  }, [person]);
  useEffect(() => {
    mcCtaTargets().then(setTargets).catch(() => setTargets([]));
    mcMailboxes().then((b) => setBoxes(b.mailboxes)).catch(() => setBoxes([]));
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null);
    try { await fn(); } catch (e) { setError(errText(e)); } finally { setBusy(null); }
  };
  const lastIn = thread?.messages.filter((m) => m.direction === "IN").slice(-1)[0];

  const openExistingDraft = () => run("open", async () => {
    const all = await mcDrafts(null);
    const d = all.find((x) => x.threadId === p.threadId);
    if (!d) throw new Error("No draft found for this conversation.");
    setDraft(d);
  });

  const mailto = (d: McDraft) => `mailto:${encodeURIComponent(d.to)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
  const gmail = (d: McDraft) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(d.to)}&su=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;

  return (
    <div className={`space-y-3 rounded-2xl border p-4 ${t.card}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-base font-black ${t.heading}`}>{p.name || p.email}</p>
          <p className={`truncate text-xs ${t.muted}`}>{p.email} · {p.campaignName}{p.round ? ` · round ${p.round}` : ""}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-black/10"><X className="h-4 w-4" /></button>
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}

      {!p.threadId ? (
        <p className={`text-xs ${t.muted}`}>No reply from this person yet. Sent {ago(p.sentAt)}{p.openedAt ? `, opened ${ago(p.openedAt)}` : ""}{p.clickedAt ? `, clicked ${ago(p.clickedAt)}` : ""}.</p>
      ) : !thread ? <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} /> : (
        <>
          <div className={`max-h-56 overflow-auto rounded-xl border p-3 text-xs ${t.cardFlat}`}>
            <p className={`mb-1 ${t.muted}`}>Latest reply · {lastIn ? new Date(lastIn.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</p>
            <pre className={`whitespace-pre-wrap break-words font-sans ${t.text}`}>{lastIn?.text ?? (lastIn?.html ? "(formatted email; open the conversation in Inbox to view)" : "")}</pre>
          </div>

          <div>
            <p className={`mb-1 text-3xs font-black uppercase tracking-wider ${t.dim}`}>Intent {p.intentSource ? `(set by ${p.intentSource === "AI" ? "AI" : "a person"})` : ""}</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTENT_LABEL) as McIntent[]).map((i) => (
                <button key={i} type="button" aria-pressed={p.intent === i} disabled={!!busy}
                  onClick={() => run("intent", async () => { const r = await mcSetIntent(p.threadId!, i); setP({ ...p, intent: r.intent, intentSource: "HUMAN" }); onChanged(); })}
                  className={`min-h-8 rounded-full border px-3 text-xs font-bold ${p.intent === i ? t.chipActive : t.chipInactive}`}>{INTENT_LABEL[i]}</button>
              ))}
              <button type="button" disabled={!aiReady || !!busy || p.intentSource === "HUMAN"} title={p.intentSource === "HUMAN" ? "A person already sorted this" : "Uses one AI call"}
                onClick={() => run("classify", async () => { const r = await mcClassify(p.threadId!); setP({ ...p, intent: r.intent, intentSource: "AI", summary: r.summary, optOutSuggested: r.optOutSuggested }); onChanged(); })}
                className={btn}>{busy === "classify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Sort with AI</button>
            </div>
            {p.summary && <p className={`mt-1 text-xs ${t.text}`}>{p.summary}</p>}
          </div>

          {(p.optOutSuggested || p.unsubscribed) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              {p.unsubscribed ? "This person is unsubscribed from campaign emails." : (
                <>
                  The AI thinks this person asked to stop getting emails. Nothing has changed yet.{" "}
                  <button type="button" className="font-bold underline" onClick={() => run("unsub", async () => {
                    if (!window.confirm(`Unsubscribe ${p.email} from all CauseKind campaign emails?`)) return;
                    await mcFollowUnsubscribe(p.recipientId); setP({ ...p, unsubscribed: true }); onChanged();
                  })}>Unsubscribe them</button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>Reply</p>
            <textarea rows={3} className={`w-full rounded-xl border px-3 py-2 text-xs ${t.input}`} value={brief} maxLength={2000}
              placeholder="Instructions for the AI (optional), e.g. thank them, say the Pune drive collects winter clothes until 15 Dec, ask what they can bring"
              onChange={(e) => setBrief(e.target.value)} />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={useFacts} onChange={(e) => setUseFacts(e.target.checked)} /> Use CauseKind facts</label>
              <select aria-label="Link to include" className={`max-w-[16rem] rounded-lg border px-2 py-1.5 text-xs ${t.input}`} value={cta} onChange={(e) => setCta(e.target.value)}>
                <option value="">No link</option>
                {targets.map((x) => <option key={x.url} value={x.url}>{x.kind}: {x.title}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!aiReady || !!busy || thread.automated} title="Uses one AI call; nothing is sent"
                onClick={() => run("draft", async () => { const d = await mcAiDraft(p.threadId!, { brief, useFacts, ctaUrl: cta }); setDraft(d); setP({ ...p, draftReady: true }); onChanged(); })}
                className={`${btn} ${t.btnAccent}`}>{busy === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Write reply with AI</button>
              {p.draftReady && <button type="button" disabled={!!busy} onClick={openExistingDraft} className={btn}>Open draft</button>}
            </div>
            <p className={`text-3xs ${t.dim}`}>The AI writes a draft only. You read and edit it, then press Send yourself.</p>
          </div>
        </>
      )}

      {draft && (
        <div className={`rounded-xl border p-2 text-xs ${t.cardFlat}`}>
          <p className={`mb-1 font-bold ${t.heading}`}>Draft ready: edit and send in the window, or hand it off:</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={btn} onClick={() => navigator.clipboard?.writeText(draft.body)}><Copy className="h-3.5 w-3.5" /> Copy text</button>
            <a className={btn} href={mailto(draft)}><ExternalLink className="h-3.5 w-3.5" /> Mail app</a>
            <a className={btn} href={gmail(draft)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Gmail</a>
          </div>
          <p className={`mt-1 text-3xs ${t.dim}`}>Mail app / Gmail open a new message there; they don&apos;t send anything and won&apos;t thread in this inbox.</p>
        </div>
      )}
      {draft && boxes.length > 0 && (
        <ComposeWindow draft={draft} mailboxes={boxes} isDark={isDark}
          onClose={() => setDraft(null)}
          onSent={() => { setDraft(null); setP({ ...p, draftReady: false }); onChanged(); }} />
      )}
    </div>
  );
}

function FactsEditor({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  const t = saTheme(isDark);
  const [facts, setFacts] = useState<string | null>(null);
  const [meta, setMeta] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { mcAiFacts().then((f) => { setFacts(f.facts); setMeta(f.updatedBy ? `Last edited by ${f.updatedBy}` : ""); }).catch((e) => setMsg(errText(e))); }, []);
  return (
    <div className={`space-y-2 rounded-2xl border p-4 ${t.card}`}>
      <p className={`text-sm font-bold ${t.heading}`}>CauseKind facts the AI may use</p>
      <p className={`text-xs ${t.muted}`}>Only true, current, public facts: what CauseKind does, how giving works, live drives, contact details. The AI is told not to state anything that isn&apos;t here or in your instructions. Don&apos;t put personal or donee information here.</p>
      {facts == null ? <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} /> : (
        <textarea rows={8} className={`w-full rounded-xl border px-3 py-2 text-xs ${t.input}`} value={facts} maxLength={20000} onChange={(e) => setFacts(e.target.value)} />
      )}
      <div className="flex items-center gap-2">
        <button type="button" disabled={facts == null} onClick={async () => {
          try { const f = await mcSaveAiFacts(facts ?? ""); setMeta(`Saved · ${f.updatedBy}`); setMsg(null); } catch (e) { setMsg(errText(e)); }
        }} className={`min-h-8 rounded-lg border px-3 text-xs font-bold ${t.btnAccent}`}>Save facts</button>
        <button type="button" onClick={onClose} className={`min-h-8 rounded-lg border px-3 text-xs ${t.btn}`}>Close</button>
        <span className={`text-3xs ${t.muted}`}>{meta}</span>
        {msg && <span role="alert" className="text-xs text-red-500">{msg}</span>}
      </div>
    </div>
  );
}
