"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminCase,
  superAdminCaseAssign,
  superAdminCaseMessage,
  superAdminCaseMeta,
  superAdminCasePriority,
  superAdminCaseQueue,
  superAdminCaseStatus,
  superAdminRequestInformation,
  superAdminReviewInformation,
  type SaCaseDetail,
  type SaCaseFilters,
  type SaCaseMeta,
  type SaCasePriority,
  type SaCaseStatus,
  type SaCaseSummary,
  type SaPage,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { saTheme, type SaTheme } from "@/components/super-admin/saTheme";
import { SaPagination } from "@/components/super-admin/SaPagination";
import { ArrowLeft, Clock, Loader2, Lock, Search } from "lucide-react";

/**
 * The support case queue and one case's workspace.
 *
 * <p>Disputes appear here rather than in their own queue: raising a
 * post-delivery issue auto-opens a case of category DISPUTE. The old Disputes
 * section still exists for now and reads the same underlying issues, so nothing
 * an agent relies on disappeared in this phase.
 */
export function CasesPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [selected, setSelected] = useState<number | null>(null);
  const [meta, setMeta] = useState<SaCaseMeta | null>(null);

  useEffect(() => {
    superAdminCaseMeta().then(setMeta).catch(() => {
      toast.error("Couldn't load case settings.");
    });
  }, []);

  if (selected !== null) {
    return <CaseWorkspace caseId={selected} meta={meta} t={t} isDark={isDark}
                          onBack={() => setSelected(null)} />;
  }
  return <CaseQueue meta={meta} t={t} isDark={isDark} onOpen={setSelected} />;
}

// ── Queue ─────────────────────────────────────────────────────────────────────

function CaseQueue({
  meta, t, isDark, onOpen,
}: { meta: SaCaseMeta | null; t: SaTheme; isDark: boolean; onOpen: (id: number) => void }) {
  const [data, setData] = useState<SaPage<SaCaseSummary> | null>(null);
  const [filters, setFilters] = useState<SaCaseFilters>({});
  const [queryInput, setQueryInput] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    superAdminCaseQueue(filters, page, 25)
      .then(setData)
      .catch(() => toast.error("Couldn't load the case queue."))
      .finally(() => setLoading(false));
  }, [filters, page]);

  function setFilter(patch: SaCaseFilters) {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  }

  const control = `h-9 rounded-lg border px-2.5 text-xs transition-colors ${t.input}`;
  const th = `px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider ${t.dim}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className={`absolute left-2.5 top-1/2 size-4 -translate-y-1/2 ${t.dim}`} />
          <input
            placeholder="Case number, subject or id…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setFilter({ q: queryInput.trim() || undefined }); }}
            className={`${control} w-full pl-8`}
          />
        </div>
        <button
          onClick={() => setFilter({ q: queryInput.trim() || undefined })}
          className={`h-9 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${t.btnAccent}`}
        >
          Search
        </button>

        <select value={filters.status ?? ""} className={control}
                onChange={(e) => setFilter({ status: (e.target.value || undefined) as SaCaseStatus })}>
          <option value="">Any status</option>
          {(meta?.statuses ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>

        <select value={filters.category ?? ""} className={control}
                onChange={(e) => setFilter({ category: e.target.value || undefined })}>
          <option value="">All categories</option>
          {(meta?.categories ?? []).map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
        </select>

        <select value={filters.priority ?? ""} className={control}
                onChange={(e) => setFilter({ priority: (e.target.value || undefined) as SaCasePriority })}>
          <option value="">Any priority</option>
          {(meta?.priorities ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <button
          onClick={() => setFilter({ unassigned: !filters.unassigned || undefined })}
          className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            filters.unassigned ? t.chipActive : t.btn
          }`}
        >
          Unassigned
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className={`size-8 animate-spin ${t.dim}`} /></div>
      ) : !data || data.items.length === 0 ? (
        <p className={`py-10 text-center text-sm ${t.muted}`}>No cases match these filters.</p>
      ) : (
        <div className={`overflow-x-auto rounded-xl border ${t.cardFlat}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${t.tableHead}`}>
              <tr>
                <th className={th}>Case</th>
                <th className={th}>Subject</th>
                <th className={th}>Category</th>
                <th className={th}>Priority</th>
                <th className={th}>Status</th>
                <th className={th}>About</th>
                <th className={th}>Assigned</th>
                <th className={th}>Due</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divide}`}>
              {data.items.map((c) => (
                <tr key={c.id} onClick={() => onOpen(c.id)}
                    className={`cursor-pointer transition-colors ${t.rowHover}`}>
                  <td className={`px-3 py-2 font-mono text-xs ${t.muted}`}>{c.caseNumber}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${t.heading}`}>{c.subject}</td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{c.category.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <Pill t={t} tone={c.priority === "URGENT" || c.priority === "HIGH" ? "danger" : "plain"}>
                      {c.priority}
                    </Pill>
                  </td>
                  <td className="px-3 py-2"><Pill t={t}>{c.status.replace(/_/g, " ")}</Pill></td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{c.subjectUserName ?? "—"}</td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{c.assignedAdminEmail ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {c.dueAt ? (
                      <span className={c.overdue ? "font-semibold text-red-400" : t.muted}>
                        {c.overdue && <Clock className="mr-1 inline size-3" />}
                        {new Date(c.dueAt).toLocaleDateString()}
                      </span>
                    ) : <span className={t.dim}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaPagination page={data} onPageChange={setPage} label="cases" isDark={isDark} />
    </div>
  );
}

// ── One case ──────────────────────────────────────────────────────────────────

function CaseWorkspace({
  caseId, meta, t, isDark, onBack,
}: {
  caseId: number; meta: SaCaseMeta | null; t: SaTheme; isDark: boolean; onBack: () => void;
}) {
  const [data, setData] = useState<SaCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // No default. Choosing who sees a note should be a decision every time, not
  // something inherited from whatever was sent last.
  const [visibility, setVisibility] = useState<"INTERNAL" | "USER" | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    superAdminCase(caseId)
      .then(setData)
      .catch(() => toast.error("Couldn't load this case."))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(load, [load]);

  async function run(fn: () => Promise<SaCaseDetail>, ok: string) {
    setBusy(true);
    try {
      setData(await fn());
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className={`size-8 animate-spin ${t.dim}`} /></div>;
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <BackButton t={t} onBack={onBack} />
        <p className={`py-10 text-center text-sm ${t.muted}`}>Case not found.</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-4">
      <BackButton t={t} onBack={onBack} />

      <div className={`rounded-xl border p-4 ${t.card}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`font-mono text-xs ${t.muted}`}>{s.caseNumber}</p>
            <h2 className={`text-lg font-bold ${t.heading}`}>{s.subject}</h2>
            <p className={`mt-0.5 text-xs ${t.muted}`}>
              {s.category.replace(/_/g, " ")}
              {s.subjectUserName && ` · about ${s.subjectUserName}`}
              {data.systemOpened && " · opened automatically"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill t={t}>{s.status.replace(/_/g, " ")}</Pill>
            <Pill t={t} tone={s.priority === "URGENT" || s.priority === "HIGH" ? "danger" : "plain"}>
              {s.priority}
            </Pill>
            {s.overdue && <Pill t={t} tone="danger">Overdue</Pill>}
          </div>
        </div>

        {data.description && <p className={`mt-3 text-sm ${t.text}`}>{data.description}</p>}

        <div className={`mt-3 flex flex-wrap gap-4 border-t pt-3 text-xs ${t.cardFlat} ${t.muted}`}>
          <span>Due {s.dueAt ? new Date(s.dueAt).toLocaleString() : "—"}</span>
          {data.waitingOnUserMinutes > 0 && (
            /* Shown because it explains a due date that has moved. */
            <span>Paused on user {Math.round(data.waitingOnUserMinutes / 60)}h</span>
          )}
          <span>Assigned {s.assignedAdminEmail ?? "nobody"}</span>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${t.card}`}>
        {/* Only legal moves are offered — the backend rejects the rest with a
            409, and an agent should not have to discover that by trying. */}
        {/* MERGED is filtered out even though the state machine allows it. It has
            its own endpoint, which records what the case was merged into and
            carries the links across; setting the status directly would strand a
            case claiming to be merged into nothing, with no legal move back. */}
        {data.allowedNextStatuses.filter((s) => s !== "MERGED").length === 0 ? (
          <span className={`flex items-center gap-1.5 text-xs ${t.dim}`}>
            <Lock className="size-3" /> This case is closed to further changes.
          </span>
        ) : (
          data.allowedNextStatuses.filter((s) => s !== "MERGED").map((next) => (
            <button
              key={next}
              disabled={busy}
              onClick={() => {
                const reason = next === "RESOLVED"
                  ? window.prompt("How was this resolved?") ?? undefined
                  : undefined;
                run(() => superAdminCaseStatus(caseId, next, reason), `Moved to ${next}`);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
            >
              {next.replace(/_/g, " ")}
            </button>
          ))
        )}

        <select
          value={s.priority}
          disabled={busy}
          onChange={(e) => run(() => superAdminCasePriority(caseId, e.target.value as SaCasePriority),
            "Priority updated")}
          className={`h-8 rounded-lg border px-2 text-xs ${t.input}`}
        >
          {(meta?.priorities ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {!s.assignedAdminEmail && (
          <button
            disabled={busy}
            onClick={() => {
              const id = window.prompt("Assign to which admin user id?");
              if (id) run(() => superAdminCaseAssign(caseId, Number(id)), "Assigned");
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
          >
            Assign
          </button>
        )}
      </div>

      {/* Information requests */}
      <section className={`rounded-xl border p-4 ${t.card}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-sm font-bold ${t.heading}`}>Information requested</h3>
          {!asking && (
            <button
              disabled={busy || s.subjectUserId == null}
              onClick={() => setAsking(true)}
              title={s.subjectUserId == null
                ? "This case has no subject user, so there is nobody to ask."
                : undefined}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
            >
              Request information
            </button>
          )}
        </div>

        {/* A case opened against no particular user has nobody to ask. Saying so
            beats a disabled button with no explanation. */}
        {data.informationRequests.length === 0 && !asking && (
          <p className={`text-xs ${t.muted}`}>
            {s.subjectUserId == null
              ? "This case is not filed against a user, so there is nobody to request information from."
              : "Nothing requested yet."}
          </p>
        )}

        {asking && s.subjectUserId != null && (
          <RequestInformationForm
            t={t}
            busy={busy}
            targetName={s.subjectUserName}
            onCancel={() => setAsking(false)}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                await superAdminRequestInformation({
                  ...payload,
                  targetUserId: s.subjectUserId as number,
                  caseId,
                });
                setAsking(false);
                load();
                toast.success("Request sent");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "That didn't work.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {data.informationRequests.length > 0 && (
          <ul className="space-y-2">
            {data.informationRequests.map((r) => (
              <li key={r.id} className={`rounded-lg border p-3 ${t.cardFlat}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`text-sm ${t.text}`}>{r.instructions}</p>
                  <Pill t={t} tone={r.overdue ? "danger" : "plain"}>{r.status.replace(/_/g, " ")}</Pill>
                </div>
                <ul className="mt-2 space-y-1">
                  {r.items.map((i) => (
                    <li key={i.id} className={`text-xs ${i.answered ? t.text : t.dim}`}>
                      {i.answered ? "✓" : "○"} {i.label}
                      {!i.required && <span className={t.dim}> (optional)</span>}
                      {i.answered && i.response && <span className={t.muted}> — {i.response}</span>}
                    </li>
                  ))}
                </ul>
                {r.status === "ANSWERED" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => superAdminReviewInformation(r.id, true).then(() => { load(); toast.success("Accepted"); })}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${t.btnAccent}`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt("Why is this not acceptable?");
                        if (note) superAdminReviewInformation(r.id, false, note).then(() => { load(); toast.success("Rejected"); });
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${t.btn}`}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Linked records */}
      {data.links.length > 0 && (
        <section className={`rounded-xl border p-4 ${t.card}`}>
          <h3 className={`mb-2 text-sm font-bold ${t.heading}`}>Linked records</h3>
          <div className="flex flex-wrap gap-1.5">
            {data.links.map((l) => (
              <span key={l.id} className={`rounded-full border px-2.5 py-1 text-[11px] ${t.badge}`}
                    title={l.note ?? undefined}>
                {l.entityType} #{l.entityId}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Message composer */}
      <section className={`rounded-xl border p-4 ${t.card}`}>
        <h3 className={`mb-2 text-sm font-bold ${t.heading}`}>Add to the case</h3>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a note or a reply…"
          className={`w-full rounded-lg border p-2.5 text-sm ${t.input} ${t.placeholder}`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Two explicit buttons rather than a toggle with a default. The
              difference between these is whether the user reads it. */}
          <button
            disabled={busy || !message.trim() || visibility === "USER"}
            onClick={() => {
              setVisibility("INTERNAL");
              run(() => superAdminCaseMessage(caseId, message, "INTERNAL"), "Internal note added")
                .then(() => { setMessage(""); setVisibility(null); });
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
          >
            Add internal note
          </button>
          <button
            disabled={busy || !message.trim()}
            onClick={() => {
              if (!window.confirm("This will be visible to the user. Send it?")) return;
              run(() => superAdminCaseMessage(caseId, message, "USER"), "Reply sent")
                .then(() => { setMessage(""); setVisibility(null); });
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btnAccent}`}
          >
            Reply to user
          </button>
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-2">
        <h3 className={`text-sm font-bold ${t.heading}`}>History</h3>
        <ol className="space-y-2">
          {data.events.map((e) => (
            <li key={e.id}
                className={`rounded-xl border p-3 ${e.visibility === "USER" ? t.accentPanel : t.card}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${t.heading}`}>
                  {e.eventType.replace(/_/g, " ").toLowerCase()}
                  {e.previousValue && e.newValue && (
                    <span className={`font-normal ${t.muted}`}> · {e.previousValue} → {e.newValue}</span>
                  )}
                </p>
                <time className={`text-[11px] ${t.dim}`}>{new Date(e.createdAt).toLocaleString()}</time>
              </div>
              {e.body && <p className={`mt-1 text-xs ${t.muted}`}>{e.body}</p>}
              <div className="mt-1.5 flex items-center gap-1.5">
                <Pill t={t} tone={e.visibility === "USER" ? "accent" : "plain"}>
                  {e.visibility === "USER" ? "Visible to user" : "Internal"}
                </Pill>
                <span className={`text-[11px] ${t.dim}`}>by {e.actor}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ── Chrome ────────────────────────────────────────────────────────────────────

/** What the user is asked to supply, one row per item. */
const ITEM_TYPES = [
  { value: "TEXT", label: "Text answer" },
  { value: "PHOTO", label: "Photo" },
  { value: "DOCUMENT", label: "Document" },
  { value: "CONFIRMATION", label: "Yes / no" },
] as const;

type DraftItem = { label: string; itemType: string; required: boolean };

/**
 * Composer for a new information request.
 *
 * <p>Phase 3 shipped the review half of this — accept or reject what came back —
 * but nothing that could raise one, so `superAdminRequestInformation` sat unused
 * in api.ts and creating a request meant calling the API by hand.
 *
 * <p>`docType` is deliberately not offered. It is optional on the backend, where
 * it reuses the VerificationDocumentType vocabulary to feed an uploaded answer
 * into the existing screening pipeline — but nothing exposes that list to the
 * console, and a free-text box for an enum is a way to generate rejected
 * requests. The label carries the meaning until there is a real list to pick
 * from.
 */
function RequestInformationForm({
  t, busy, targetName, onCancel, onSubmit,
}: {
  t: SaTheme;
  busy: boolean;
  targetName: string | null;
  onCancel: () => void;
  onSubmit: (payload: {
    instructions: string;
    dueAt?: string;
    holdWorkflow: boolean;
    items: DraftItem[];
  }) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [holdWorkflow, setHoldWorkflow] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([
    { label: "", itemType: "TEXT", required: true },
  ]);

  function patch(index: number, change: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...change } : it)));
  }

  // An item with no label asks the user for nothing, so blanks are dropped
  // rather than sent. Requiring at least one keeps an empty request from being
  // raised at all.
  const filled = items.filter((i) => i.label.trim() !== "");
  const canSend = instructions.trim() !== "" && filled.length > 0;

  return (
    <div className={`rounded-lg border p-3 ${t.cardFlat}`}>
      <p className={`mb-2 text-xs ${t.muted}`}>
        {targetName ? <>This will appear as a task for <span className={t.text}>{targetName}</span>.</>
                    : "This will appear as a task for the user this case is about."}
      </p>

      <textarea
        rows={3}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="What do you need, and why? The user reads this."
        className={`w-full rounded-lg border p-2.5 text-sm ${t.input} ${t.placeholder}`}
      />

      <p className={`mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide ${t.dim}`}>
        What to ask for
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1.5">
            <input
              value={item.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="e.g. A photo of the damaged item"
              className={`min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs ${t.input} ${t.placeholder}`}
            />
            <select
              value={item.itemType}
              onChange={(e) => patch(i, { itemType: e.target.value })}
              className={`rounded-lg border px-2 py-1.5 text-xs ${t.input}`}
            >
              {ITEM_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label className={`flex items-center gap-1 text-[11px] ${t.muted}`}>
              <input
                type="checkbox"
                checked={item.required}
                onChange={(e) => patch(i, { required: e.target.checked })}
              />
              Required
            </label>
            {items.length > 1 && (
              <button
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                className={`rounded-lg border px-2 py-1 text-[11px] ${t.btn}`}
                aria-label={`Remove item ${i + 1}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={() => setItems((prev) => [...prev, { label: "", itemType: "TEXT", required: true }])}
        className={`mt-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${t.btn}`}
      >
        Add another
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className={`flex items-center gap-1.5 text-[11px] ${t.muted}`}>
          Due
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={`rounded-lg border px-2 py-1 text-xs ${t.input}`}
          />
        </label>
        <label className={`flex items-center gap-1.5 text-[11px] ${t.muted}`}>
          <input
            type="checkbox"
            checked={holdWorkflow}
            onChange={(e) => setHoldWorkflow(e.target.checked)}
          />
          Hold the workflow until this is answered
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy || !canSend}
          onClick={() => {
            // Same care as replying on a case: this reaches the user, so it is
            // confirmed rather than sent on a single click.
            if (!window.confirm("This will be sent to the user as a task. Send it?")) return;
            onSubmit({
              instructions: instructions.trim(),
              dueAt: dueAt === "" ? undefined : dueAt,
              holdWorkflow,
              items: filled.map((i) => ({ ...i, label: i.label.trim() })),
            });
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btnAccent}`}
        >
          Send request
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BackButton({ t, onBack }: { t: SaTheme; onBack: () => void }) {
  return (
    <button onClick={onBack}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}>
      <ArrowLeft className="size-3.5" /> Back to queue
    </button>
  );
}

function Pill({
  t, children, tone = "plain",
}: { t: SaTheme; children: React.ReactNode; tone?: "plain" | "danger" | "accent" }) {
  const cls = tone === "danger" ? t.badgeDanger : tone === "accent" ? t.badgeAccent : t.badge;
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{children}</span>;
}
