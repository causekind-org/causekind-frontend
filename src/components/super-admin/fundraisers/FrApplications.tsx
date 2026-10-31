"use client";

import { useCallback, useEffect, useState } from "react";
import { fundraising, superAdminFundraising, type FundraisingAdminApplication, type FundraisingStatus, type SaFrApplicationRow } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { APPLICATION_STATUS, ApplicationStatusPill, Card, Chip, ConfirmDialog, ErrorLine, Spinner, dateTime, errorText, inr, shortDate } from "./shared";

const CHIPS: { label: string; status?: FundraisingStatus }[] = [
  { label: "All" },
  { label: "Submitted", status: "SUBMITTED" },
  { label: "In review", status: "IN_REVIEW" },
  { label: "Info requested", status: "INFORMATION_REQUESTED" },
  { label: "Approved", status: "APPROVED" },
  { label: "Not approved", status: "NOT_APPROVED" },
  { label: "Draft", status: "DRAFT" },
];
const DELETED_CHIP = CHIPS.length; // the extra "Deleted" chip after the status chips
const OVERRIDE_TO: FundraisingStatus[] = ["SUBMITTED", "IN_REVIEW", "INFORMATION_REQUESTED", "APPROVED", "NOT_APPROVED", "WITHDRAWN"];
const cat = (c: string | null) => (c ? c.charAt(0) + c.slice(1).toLowerCase().replaceAll("_", " ") : "—");

export function FrApplications({ t, focusId, onOpenCampaign }: { t: SaTheme; focusId: number | null; onOpenCampaign: (id: number) => void }) {
  const [chip, setChip] = useState(0);
  const [rows, setRows] = useState<SaFrApplicationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(focusId);
  const [detail, setDetail] = useState<FundraisingAdminApplication | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"override" | "delete" | "restore" | null>(null);
  const [overrideTo, setOverrideTo] = useState<FundraisingStatus>("IN_REVIEW");

  const load = useCallback(() => {
    setError(null);
    superAdminFundraising.applications(chip === DELETED_CHIP ? { deleted: true } : { status: CHIPS[chip].status })
      .then((r) => { setRows(r); setSelected((s) => s ?? r[0]?.id ?? null); })
      .catch((e) => setError(errorText(e, "We couldn't load applications.")));
  }, [chip]);
  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(() => {
    if (selected == null) { setDetail(null); return; }
    setDetailError(null);
    fundraising.admin.get(selected).then(setDetail).catch((e) => setDetailError(errorText(e, "We couldn't load this application.")));
  }, [selected]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const row = rows?.find((r) => r.id === selected);
  const a = detail?.application;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        {CHIPS.map((c, i) => <Chip key={c.label} t={t} active={chip === i} onClick={() => { setChip(i); setSelected(null); }}>{c.label}</Chip>)}
        <Chip t={t} active={chip === DELETED_CHIP} onClick={() => { setChip(DELETED_CHIP); setSelected(null); }}>Deleted</Chip>
      </div>
      {error ? <ErrorLine message={error} onRetry={load} /> : !rows ? <Spinner t={t} /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
          <Card t={t} className="max-h-[70vh] overflow-y-auto">
            {rows.length === 0 && <p className={`px-4 py-8 text-center text-sm ${t.muted}`}>No applications here.</p>}
            <ul className={`divide-y ${t.divide}`}>
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelected(r.id)} aria-current={selected === r.id ? "true" : undefined}
                    className={`block w-full px-4 py-3.5 text-left ${selected === r.id ? "border-l-[3px]" : t.rowHover}`}
                    style={selected === r.id ? { borderLeftColor: t.accent, background: `${t.accent}12` } : undefined}>
                    <div className="flex items-center justify-between gap-2"><b className={t.heading}>{r.applicantName ?? "—"}</b><ApplicationStatusPill status={r.status} /></div>
                    <div className={`mt-1 text-[13px] ${t.muted}`}>#{r.id} · {cat(r.category)} · {inr(r.requestedAmount)} · {shortDate(r.submittedAt ?? r.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card t={t} className="flex flex-col gap-4 p-[22px]">
            {selected == null ? <p className={`text-sm ${t.muted}`}>Choose an application.</p>
              : detailError ? <ErrorLine message={detailError} onRetry={loadDetail} />
              : !a ? <Spinner t={t} /> : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className={`text-xl font-bold ${t.heading}`}>{detail!.applicantName} · #{a.id}</h2>
                      <div className={`mt-1 text-[13px] ${t.muted}`}>
                        {a.reference} · submitted {shortDate(a.submittedAt)}{detail!.decidedBy ? ` · decided by ${detail!.decidedBy}` : ""}{a.decisionScope ? ` · scope ${a.decisionScope.toLowerCase().replaceAll("_", " ")}` : ""}
                      </div>
                    </div>
                    <ApplicationStatusPill status={a.status} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Box t={t} k="Need" v={`${cat(a.category)} · ${inr(a.requestedAmount)}`} />
                    <Box t={t} k="Beneficiary" v={a.forSelf ? "The applicant" : `${a.beneficiaryDisplayName ?? "—"} (${a.relationship ?? "—"})`} />
                    <div className={`rounded-xl border p-3 ${t.cardFlat}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wider ${t.muted}`}>Linked campaign</div>
                      <div className={`mt-1 font-semibold ${t.heading}`}>{row?.campaignId != null
                        ? <button type="button" onClick={() => onOpenCampaign(row.campaignId!)} className="underline" style={{ color: t.accent }}>#{row.campaignId}</button> : "None"}</div>
                    </div>
                  </div>
                  {a.whatHappened && <div><div className={`mb-1.5 text-xs font-semibold uppercase tracking-wider ${t.muted}`}>What happened</div><p className={`whitespace-pre-line text-sm ${t.text}`}>{a.whatHappened}</p></div>}
                  <div>
                    <div className={`mb-2 text-xs font-semibold uppercase tracking-wider ${t.muted}`}>Evidence</div>
                    <div className="flex flex-wrap gap-2.5">
                      {a.evidence.filter((e) => !e.superseded).length === 0 && <span className={`text-sm ${t.muted}`}>No evidence uploaded.</span>}
                      {a.evidence.filter((e) => !e.superseded).map((e) => e.viewUrl
                        ? <a key={e.id} href={e.viewUrl} target="_blank" rel="noreferrer" className={`min-h-9 rounded-lg border px-3 py-1.5 text-[13px] ${t.btn}`}>{e.type.replaceAll("_", " ").toLowerCase()} ↗</a>
                        : <span key={e.id} className={`rounded-lg border px-3 py-1.5 text-[13px] ${t.cardFlat} ${t.muted}`}>{e.type.replaceAll("_", " ").toLowerCase()}</span>)}
                    </div>
                  </div>
                  {a.costItems.length > 0 && (
                    <div>
                      <div className={`mb-2 text-xs font-semibold uppercase tracking-wider ${t.muted}`}>Cost items</div>
                      <div className={`rounded-xl border text-sm ${t.cardFlat}`}>
                        {a.costItems.map((ci, i) => <div key={i} className={`flex justify-between px-3 py-2.5 ${i ? `border-t ${t.cardFlat}` : ""}`}><span className={t.text}>{ci.expense}</span><b className={t.heading}>{inr(ci.amount)}</b></div>)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className={`mb-2 text-xs font-semibold uppercase tracking-wider ${t.muted}`}>History</div>
                    <ol className={`flex list-decimal flex-col gap-1.5 pl-5 text-sm ${t.text}`}>
                      <li>{dateTime(a.createdAt)} — Started by applicant</li>
                      {a.submittedAt && <li>{dateTime(a.submittedAt)} — Submitted</li>}
                      {a.infoRequests.map((q) => <li key={q.id}>{dateTime(q.askedAt)} — Information requested: “{q.question}”{q.respondedAt ? ` · answered ${shortDate(q.respondedAt)}` : ""}</li>)}
                      {a.decidedAt && <li>{dateTime(a.decidedAt)} — {APPLICATION_STATUS[a.status]?.label ?? a.status}{a.decisionReason ? `: ${a.decisionReason}` : ""}</li>}
                    </ol>
                  </div>
                  <div className={`mt-auto flex flex-wrap justify-end gap-2.5 border-t pt-4 ${t.cardFlat}`}>
                    <a href={`/admin/fundraising/${a.id}`} className={`min-h-10 rounded-xl border px-4 py-2 text-sm ${t.btn}`}>Review in admin (approve, request info) →</a>
                    <button type="button" onClick={() => { setOverrideTo(a.status === "IN_REVIEW" ? "SUBMITTED" : "IN_REVIEW"); setDialog("override"); }} className={`min-h-10 rounded-xl border px-4 text-sm ${t.btn}`}>Change status…</button>
                    {row?.deleted
                      ? <button type="button" onClick={() => setDialog("restore")} className={`min-h-10 rounded-xl border px-4 text-sm ${t.btn}`}>Restore</button>
                      : <button type="button" onClick={() => setDialog("delete")} className="min-h-10 rounded-xl border border-red-300 px-4 text-sm text-red-700 hover:bg-red-50">Delete</button>}
                  </div>
                </>
              )}
          </Card>
        </div>
      )}

      {dialog === "delete" && a && (
        <ConfirmDialog t={t} title={`Delete application #${a.id}`} danger confirmLabel="Delete" primaryNotify="Notify the applicant" defaultNotify={false}
          changes={[{ field: "Visibility", before: "Visible", after: row?.campaignId != null ? "Deleted, with its campaign" : "Deleted" }]}
          extra={<p className={`text-sm ${t.muted}`}>The applicant and the review queue will no longer see it{row?.campaignId != null ? ", and the campaign made from it is deleted too" : ""}. Records are kept; restore it from the Deleted filter.</p>}
          onCancel={() => setDialog(null)}
          onConfirm={async (r) => {
            await superAdminFundraising.deleteApplication(a.id, { reason: r.reason, details: r.details, notifyUser: r.notifyPrimary });
            setDialog(null); setSelected(null); load();
          }} />
      )}
      {dialog === "restore" && a && (
        <ConfirmDialog t={t} title={`Restore application #${a.id}`} primaryNotify={null} confirmLabel="Restore"
          changes={[{ field: "Visibility", before: "Deleted", after: "Visible again, with the campaigns deleted with it" }]}
          onCancel={() => setDialog(null)}
          onConfirm={async (r) => { await superAdminFundraising.restoreApplication(a.id, { reason: r.reason, details: r.details }); setDialog(null); setSelected(null); load(); }} />
      )}
      {dialog === "override" && a && (
        <ConfirmDialog t={t} title={`Change status of application #${a.id}`} primaryNotify="Notify the applicant"
          changes={[{ field: "Status", before: APPLICATION_STATUS[a.status]?.label ?? a.status, after: APPLICATION_STATUS[overrideTo]?.label ?? overrideTo }]}
          extra={<label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>New status
            <select value={overrideTo} onChange={(e) => setOverrideTo(e.target.value as FundraisingStatus)} className={`min-h-11 rounded-xl border px-3 text-sm ${t.input}`}>
              {OVERRIDE_TO.filter((s) => s !== a.status).map((s) => <option key={s} value={s}>{APPLICATION_STATUS[s].label}</option>)}
            </select>
            <span className={`text-xs font-normal ${t.dim}`}>A forced change skips the normal review steps. To approve with a scope or ask questions, use the admin review page.</span>
          </label>}
          onCancel={() => setDialog(null)}
          onConfirm={async (r) => {
            await superAdminFundraising.overrideApplication(a.id, { status: overrideTo, reason: r.reason, details: r.details, notifyApplicant: r.notifyPrimary });
            setDialog(null); load(); loadDetail();
          }} />
      )}
    </div>
  );
}

function Box({ t, k, v }: { t: SaTheme; k: string; v: string }) {
  return (
    <div className={`rounded-xl border p-3 ${t.cardFlat}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider ${t.muted}`}>{k}</div>
      <div className={`mt-1 font-semibold ${t.heading}`}>{v}</div>
    </div>
  );
}
