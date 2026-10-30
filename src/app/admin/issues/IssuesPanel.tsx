"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, ExternalLink, FileText, History, Loader2, Lock, MessageSquare, RefreshCw, Search, ShieldCheck, UserRound,
} from "lucide-react";
import {
  adminGetIssue, adminListIssues,
  type AdminIssueDetail, type AdminIssuePage, type AdminIssuePerson, type AdminIssueSource, type AdminIssueSummary,
} from "@/lib/api";
import { serverDate } from "@/lib/serverTime";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Admin → Issues: every problem report and support case in the application,
 * read-only, each with its whole story — what was reported, by whom, the
 * transaction behind it, the evidence, the support case and one timeline.
 *
 * <p>No resolution controls on purpose: this section is for seeing everything
 * in one place. New issues arrive as admin notifications that deep-link here
 * ({@code ?tab=issues&issue=<key>}), and the list refreshes when one lands.
 */

export const SOURCE_LABEL: Record<AdminIssueSource, string> = {
  OFFER_HANDOVER: "Offer handover",
  PURCHASE: "Purchase",
  PURCHASE_FOLLOW_UP: "Delivery follow-up",
  MATCH_HANDOVER: "Match handover",
  DRIVE_OFFER: "Drive offer",
  SUPPORT: "Support case",
};

const SOURCE_TONE: Record<AdminIssueSource, string> = {
  OFFER_HANDOVER: "bg-sky-50 text-sky-800 border-sky-200",
  PURCHASE: "bg-violet-50 text-violet-800 border-violet-200",
  PURCHASE_FOLLOW_UP: "bg-amber-50 text-amber-800 border-amber-200",
  MATCH_HANDOVER: "bg-emerald-50 text-emerald-800 border-emerald-200",
  DRIVE_OFFER: "bg-pink-50 text-pink-800 border-pink-200",
  SUPPORT: "bg-stone-100 text-stone-700 border-stone-200",
};

const SOURCES = Object.keys(SOURCE_LABEL) as AdminIssueSource[];
const STATUS_TABS = [["open", "Open"], ["resolved", "Resolved"], ["all", "All"]] as const;
type StatusTab = (typeof STATUS_TABS)[number][0];

/** ITEM_NOT_RECEIVED → "Item not received". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  if (!/^[A-Z0-9_]+$/.test(value)) return value;
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "DONOR": return "Donor";
    case "DONEE": return "Recipient";
    case "NGO": return "NGO";
    case "SYSTEM": return "System";
    default: return humanize(role);
  }
}

function when(value: string | null | undefined): string {
  if (!value) return "—";
  const d = serverDate(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function personText(p: AdminIssuePerson | null | undefined): string {
  if (!p) return "—";
  return `${p.name ?? "Unknown"} (${roleLabel(p.role)})`;
}

/**
 * Follows `?tab=issues&issue=<key>` — including when a notification link is
 * clicked while the dashboard is already open, which does not remount it.
 * Render inside <Suspense>: useSearchParams needs it.
 */
export function IssueLinkWatcher({ onOpen }: { onOpen: (key: string | null) => void }) {
  const params = useSearchParams();
  const tab = params.get("tab");
  const issue = params.get("issue");
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (tab !== "issues") return;
    const sig = `${tab}:${issue ?? ""}`;
    if (last.current === sig) return;
    last.current = sig;
    onOpen(issue && /^(pdi|doi|case)-\d+$/.test(issue) ? issue : null);
  }, [tab, issue, onOpen]);
  return null;
}

export function IssuesPanel({ issueKey, onOpenCount }: {
  /** Issue to show in full (from a deep link); null shows the list. */
  issueKey?: string | null;
  onOpenCount?: (n: number) => void;
}) {
  const [status, setStatus] = useState<StatusTab>("open");
  const [source, setSource] = useState<AdminIssueSource | "">("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminIssuePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(issueKey ?? null);

  useEffect(() => { setSelected(issueKey ?? null); }, [issueKey]);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListIssues({ status, source, q: debounced, page, size: 25 });
      setData(res);
      onOpenCount?.(res.openCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load issues");
    } finally {
      setLoading(false);
    }
  }, [status, source, debounced, page, onOpenCount]);

  useEffect(() => { void load(); }, [load]);

  // A new-issue notification means the list is out of date: refresh it.
  const { notifications } = useNotifications();
  const latestIssueNotice = useMemo(() => notifications
    .filter(n => n.link?.includes("tab=issues"))
    .reduce((max, n) => Math.max(max, n.receivedAt), 0), [notifications]);
  const seenNotice = useRef(latestIssueNotice);
  const [detailNonce, setDetailNonce] = useState(0);
  useEffect(() => {
    if (latestIssueNotice <= seenNotice.current) return;
    seenNotice.current = latestIssueNotice;
    void load();
    setDetailNonce(n => n + 1);
  }, [latestIssueNotice, load]);

  if (selected) {
    return <IssueDetailView issueKey={selected} nonce={detailNonce} onBack={() => setSelected(null)} />;
  }

  const counts = data?.openBySource ?? {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map(([key, label]) => (
          <button key={key} onClick={() => { setStatus(key); setPage(0); }} aria-pressed={status === key}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${status === key ? "bg-[#b04a15] text-white" : "border border-stone-200 bg-white text-stone-600 hover:text-stone-900"}`}>
            {label}{key === "open" && data ? ` · ${data.openCount}` : ""}
          </button>
        ))}
        <button onClick={() => void load()} className="ms-auto flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by where the issue came from">
        <button onClick={() => { setSource(""); setPage(0); }} aria-pressed={source === ""}
          className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${source === "" ? "border-[#b04a15] bg-[#b04a15]/10 text-[#b04a15]" : "border-stone-200 bg-white text-stone-600"}`}>
          All sources
        </button>
        {SOURCES.map(s => (
          <button key={s} onClick={() => { setSource(s); setPage(0); }} aria-pressed={source === s}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${source === s ? "border-[#b04a15] bg-[#b04a15]/10 text-[#b04a15]" : "border-stone-200 bg-white text-stone-600"}`}>
            {SOURCE_LABEL[s]}{counts[s] ? <span className="ms-1 text-amber-700">{counts[s]}</span> : null}
          </button>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Search issues</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by item, person, email, case number or #id"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 focus:border-[#b04a15] focus:outline-none" />
      </label>

      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-stone-300" aria-label="Loading issues" /></div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error} <button onClick={() => void load()} className="ms-2 font-bold underline">Try again</button>
        </div>
      )}
      {data && data.items.length === 0 && !error && (
        <p className="py-14 text-center text-sm text-stone-500">
          {status === "open" ? "No open issues. Everything reported has been dealt with." : "No issues match these filters."}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map(s => <li key={s.key}><IssueCard s={s} onOpen={() => setSelected(s.key)} /></li>)}
        </ul>
      )}

      {data && data.total > data.size && (
        <div className="flex items-center justify-between text-xs text-stone-500">
          <button disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span>{page * data.size + 1}–{Math.min((page + 1) * data.size, data.total)} of {data.total}</span>
          <button disabled={(page + 1) * data.size >= data.total || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: AdminIssueSource }) {
  return <span className={`rounded-full border px-2 py-0.5 text-2xs font-bold ${SOURCE_TONE[source]}`}>{SOURCE_LABEL[source]}</span>;
}

function StatusPill({ open }: { open: boolean }) {
  return open
    ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">Open</span>
    : <span className="rounded-full bg-green-100 px-2 py-0.5 text-2xs font-bold text-green-800">Resolved</span>;
}

function IssueCard({ s, onOpen }: { s: AdminIssueSummary; onOpen: () => void }) {
  const urgent = s.casePriority === "HIGH" || s.casePriority === "URGENT";
  return (
    <button onClick={onOpen} aria-label={`Open issue: ${s.title ?? s.key}`}
      className="w-full space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-[#b04a15]/50">
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={s.source} />
        <span className="text-xs font-bold text-stone-700">{humanize(s.issueType)}</span>
        <StatusPill open={s.open} />
        {urgent && <span className="rounded-full bg-red-100 px-2 py-0.5 text-2xs font-bold text-red-700">{humanize(s.casePriority)} priority</span>}
        {s.caseNumber && <span className="ms-auto font-mono text-2xs text-stone-500">{s.caseNumber}</span>}
      </div>
      <p className="text-[15px] font-bold text-stone-900">{s.title ?? "Untitled"}</p>
      {s.description && <p className="line-clamp-2 text-sm text-stone-600">{s.description}</p>}
      <p className="text-xs text-stone-500">
        Reported by {personText(s.reportedBy)}{s.against ? <> · about {personText(s.against)}</> : null}
        {" · "}{when(s.createdAt)}
        {s.lastActivityAt && s.lastActivityAt !== s.createdAt ? <> · last activity {when(s.lastActivityAt)}</> : null}
      </p>
    </button>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-stone-900">{icon}{title}</h3>
      {children}
    </section>
  );
}

function FactGrid({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
      {facts.map((f, i) => (
        <div key={`${f.label}-${i}`} className="min-w-0">
          <dt className="text-2xs font-bold uppercase tracking-wide text-stone-500">{f.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-stone-900">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FactValue({ value }: { value: string }) {
  return /^https?:\/\/\S+$/i.test(value)
    ? <a href={value} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-[#b04a15] underline">Open link <ExternalLink className="h-3 w-3" aria-hidden /></a>
    : <>{value}</>;
}

function PersonFact({ p }: { p: AdminIssuePerson | null }) {
  if (!p) return <>—</>;
  return (
    <span>
      {p.name ?? "Unknown"} <span className="text-stone-500">({roleLabel(p.role)})</span>
      {p.email && <span className="block text-xs text-stone-500">{p.email}</span>}
      {p.userId != null && (
        <a href={`/admin/dashboard?journeyUser=${p.userId}`} className="text-xs font-semibold text-[#b04a15] underline">User journey</a>
      )}
    </span>
  );
}

const KIND_LABEL = { ISSUE: "Report", STATUS: "Status", CASE: "Support case" } as const;
const KIND_TONE = { ISSUE: "bg-amber-500", STATUS: "bg-sky-500", CASE: "bg-stone-500" } as const;

function IssueDetailView({ issueKey, nonce, onBack }: { issueKey: string; nonce: number; onBack: () => void }) {
  const [d, setD] = useState<AdminIssueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    adminGetIssue(issueKey)
      .then(r => { if (active) setD(r); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Couldn't load this issue"); });
    return () => { active = false; };
  }, [issueKey, nonce]);

  const back = (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b04a15]">
      <ArrowLeft className="h-4 w-4" aria-hidden /> All issues
    </button>
  );
  if (error) return <div className="space-y-4">{back}<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div></div>;
  if (!d || d.summary.key !== issueKey) return <div className="space-y-4">{back}<div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-stone-300" aria-label="Loading issue" /></div></div>;

  const s = d.summary;
  const reportFacts: { label: string; value: ReactNode }[] = [
    { label: "Reported by", value: <PersonFact p={s.reportedBy} /> },
    { label: "About", value: <PersonFact p={s.against} /> },
    { label: "Reported", value: when(s.createdAt) },
    ...(d.affectedQuantity != null ? [{ label: "Units affected", value: String(d.affectedQuantity) }] : []),
    ...(d.windowExpiresAt ? [{ label: "Reporting window ends", value: when(d.windowExpiresAt) }] : []),
    ...(s.resolvedAt ? [{ label: "Resolved", value: when(s.resolvedAt) }] : []),
  ];

  return (
    <article className="space-y-4" aria-label={`Issue ${s.caseNumber ?? s.key}`}>
      {back}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={s.source} />
          <StatusPill open={s.open} />
          <span className="text-xs font-bold text-stone-700">{humanize(s.issueType)}</span>
          {s.caseNumber && <span className="font-mono text-xs text-stone-500">{s.caseNumber}</span>}
          {s.entityType && s.entityId != null && <span className="text-xs text-stone-500">· {s.entityType} #{s.entityId}</span>}
        </div>
        <h2 className="text-xl font-black text-stone-900">{s.title ?? "Untitled"}</h2>
        <p className="flex items-center gap-1.5 text-xs text-stone-500"><Lock className="h-3.5 w-3.5" aria-hidden /> Read-only view — the full record of this issue.</p>
      </header>

      <Card title="What was reported" icon={<AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />}>
        <p className="mb-4 whitespace-pre-line rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-800">{s.description ?? "No description given."}</p>
        <FactGrid facts={reportFacts} />
        {d.response && (
          <div className="mt-4 rounded-xl border border-stone-200 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><MessageSquare className="h-3.5 w-3.5" aria-hidden /> Response from the other participant · {when(d.respondedAt)}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-stone-800">{d.response}</p>
          </div>
        )}
        {d.resolution && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Resolution</p>
            <p className="mt-1 whitespace-pre-line text-sm text-green-900">{d.resolution}</p>
          </div>
        )}
      </Card>

      {d.sections.map(sec => (
        <Card key={sec.title} title={sec.title} icon={<UserRound className="h-4 w-4 text-stone-500" aria-hidden />}>
          {sec.facts.length ? <FactGrid facts={sec.facts.map(f => ({ label: f.label, value: <FactValue value={f.value} /> }))} />
            : <p className="text-sm text-stone-500">No details recorded.</p>}
        </Card>
      ))}

      <Card title={`Evidence (${d.evidence.length})`} icon={<FileText className="h-4 w-4 text-stone-500" aria-hidden />}>
        {d.evidence.length === 0 ? <p className="text-sm text-stone-500">No files or photos were attached.</p> : (
          <>
            <ul className="divide-y divide-stone-100">
              {d.evidence.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-semibold text-stone-900">{humanize(e.label)}</span>
                    <span className="text-stone-500">{e.uploadedBy ? ` · ${e.uploadedBy}` : ""}{e.uploadedAt ? ` · ${when(e.uploadedAt)}` : ""}</span>
                  </span>
                  {e.url
                    ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#b04a15] underline">View <ExternalLink className="h-3 w-3" aria-hidden /></a>
                    : <span className="text-xs text-stone-400">Link unavailable</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-stone-500">Private files open through links that expire after 10 minutes — reload for fresh ones.</p>
          </>
        )}
      </Card>

      {d.supportCase && (
        <Card title={`Support case ${d.supportCase.caseNumber}`} icon={<ShieldCheck className="h-4 w-4 text-stone-500" aria-hidden />}>
          <FactGrid facts={[
            { label: "Status", value: humanize(d.supportCase.status) },
            { label: "Priority", value: humanize(d.supportCase.priority) },
            { label: "Category", value: humanize(d.supportCase.category) },
            { label: "Assigned to", value: d.supportCase.assignedTo ?? "Nobody yet" },
            { label: "Due", value: when(d.supportCase.dueAt) },
            ...(d.supportCase.resolvedAt ? [{ label: "Resolved", value: when(d.supportCase.resolvedAt) }] : []),
            ...(d.supportCase.resolutionSummary ? [{ label: "Resolution summary", value: d.supportCase.resolutionSummary }] : []),
            ...(d.supportCase.linkedRecords.length ? [{ label: "Linked records", value: d.supportCase.linkedRecords.join(", ") }] : []),
          ]} />
        </Card>
      )}

      <Card title="Timeline" icon={<History className="h-4 w-4 text-stone-500" aria-hidden />}>
        {d.timeline.length === 0 ? <p className="text-sm text-stone-500">Nothing recorded yet.</p> : (
          <ol className="relative space-y-3 border-s border-stone-200 ps-4">
            {d.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span aria-hidden className={`absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${KIND_TONE[t.kind]}`} />
                <p className="text-2xs font-bold uppercase tracking-wide text-stone-500">
                  {when(t.at)} · {KIND_LABEL[t.kind]}{t.actor ? ` · ${t.actor}` : ""}
                  {t.internal && <span className="ms-1.5 rounded bg-stone-200 px-1 py-px normal-case tracking-normal text-stone-700">Internal</span>}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-stone-800">{t.text}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </article>
  );
}
