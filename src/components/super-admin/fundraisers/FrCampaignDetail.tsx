"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import {
  fundraisers, fundraisingCampaigns, fundraisingDonors, fundraisingManage, fundraisingReports, superAdminFundraising,
  type AdminDonorReport, type CampaignFlowStatus, type ReportCase, type ReviewItemRow, type SaFrCampaignDetail, type SaFrCostLine,
} from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import {
  CampaignStatusPill, Card, ConfirmDialog, ErrorLine, Pill, Spinner, dateTime, errorText, inr, shortDate,
  type ChangeRow, type ConfirmResult,
} from "./shared";

const CATEGORIES = ["MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];
const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase().replaceAll("_", " ");
type SubTab = "details" | "donations" | "updates" | "changes" | "reports" | "questions" | "activity";

/** The four statuses the right-panel select offers (artboard 3), mapped onto the existing admin actions. */
const STATUS_CHOICES: { value: CampaignFlowStatus; label: string }[] = [
  { value: "APPROVED", label: "Live (APPROVED)" },
  { value: "PAUSED", label: "Paused" },
  { value: "COLLECTIONS_CLOSED", label: "Collections closed" },
  { value: "PUBLICATION_DECLINED", label: "Declined" },
];

type Form = { title: string; category: string; city: string; state: string; story: string; target: string; endDate: string; costs: SaFrCostLine[] };

type Pending =
  | { kind: "edit"; changes: ChangeRow[]; body: Partial<Form> }
  | { kind: "flags"; changes: ChangeRow[]; flags: { hidden?: boolean; featured?: boolean; acceptingDonations?: boolean } }
  | { kind: "status"; to: CampaignFlowStatus }
  | { kind: "close" } | { kind: "extend" } | { kind: "payout" } | { kind: "decline" } | { kind: "message" };

export function FrCampaignDetail({ t, id, onBack, onOpenApplication }: {
  t: SaTheme; id: number; onBack: () => void; onOpenApplication: (id: number) => void;
}) {
  const [d, setD] = useState<SaFrCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubTab>("details");
  const [form, setForm] = useState<Form | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewItemRow[]>([]);
  const [reportCase, setReportCase] = useState<ReportCase | null>(null);

  const load = useCallback(() => {
    setError(null);
    superAdminFundraising.campaign(id).then((x) => { setD(x); setForm(toForm(x)); })
      .catch((e) => setError(errorText(e, "We couldn't load this fundraiser.")));
    fundraisingManage.admin.queue().then((r) => setReview(r.filter((x) => x.campaignId === id))).catch(() => setReview([]));
    fundraisingReports.admin.get(id).then(setReportCase).catch(() => setReportCase(null));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const changes = useMemo(() => (d && form ? diff(d, form) : []), [d, form]);

  if (error) return <div className="flex flex-col gap-3"><BackLink t={t} onBack={onBack} /><ErrorLine message={error} onRetry={load} /></div>;
  if (!d || !form) return <Spinner t={t} />;

  const c = d.admin.campaign;
  const daysLeft = c.endDate ? Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86_400_000) : null;
  const done = (msg: string) => { setPending(null); setNotice(msg); load(); };
  const reportsOpen = reportCase?.reports.filter((r) => r.status === "RECEIVED" || r.status === "UNDER_INVESTIGATION").length ?? 0;
  const subTabs: { key: SubTab; label: string }[] = [
    { key: "details", label: "Details & edit" },
    { key: "donations", label: `Donations ${d.money.donations}` },
    { key: "updates", label: `Updates ${review.filter((r) => r.kind === "UPDATE").length}` },
    { key: "changes", label: "Changes & closure" },
    { key: "reports", label: `Reports ${reportCase?.reports.length ?? 0}` },
    { key: "questions", label: "Questions" },
    { key: "activity", label: "Activity log" },
  ];

  async function runStatus(to: CampaignFlowStatus, r: ConfirmResult) {
    const v = d!.version;
    const message = r.notifyPrimary ? r.details : "";
    if (to === "PAUSED") await fundraisingReports.admin.pause(id, { expectedVersion: v, publicNotice: "", organiserActions: r.details, internalReason: r.reason });
    else if (to === "APPROVED") await fundraisingReports.admin.restore(id, { expectedVersion: v, internalReason: r.reason, message });
    else if (to === "COLLECTIONS_CLOSED") await fundraisingReports.admin.closeCollections(id, { expectedVersion: v, internalReason: r.reason, message });
    else if (to === "PUBLICATION_DECLINED") await fundraisingCampaigns.admin.decline(id, { expectedVersion: v, reason: r.details || r.reason, internalNote: r.reason });
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink t={t} onBack={onBack} />
      {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{notice}</p>}

      <header className="flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-200/70 text-xs text-stone-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.coverUrl ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" /> : "No cover"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className={`text-2xl font-extrabold ${t.heading}`}>{c.title || "Untitled"}</h2>
            <CampaignStatusPill status={c.status} />
            <Pill tone={d.hidden ? "danger" : "muted"}>{d.hidden ? "Hidden" : "Visible"}</Pill>
          </div>
          <div className={`mt-1 text-sm ${t.muted}`}>
            #{c.id} · by {d.doneeName ?? "—"}
            {d.applicationId != null && <> · application <button type="button" onClick={() => onOpenApplication(d.applicationId!)} className="font-semibold underline" style={{ color: t.accent }}>#{d.applicationId}</button></>}
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-2.5 lg:w-[440px]">
          <MiniStat t={t} label="Raised" value={inr(d.money.gross)} sub={`of ${inr(c.targetAmount)}`} />
          <MiniStat t={t} label="Donors" value={String(d.money.donors)} sub={`${d.money.donations} donations`} />
          <MiniStat t={t} label="Ends" value={shortDate(c.endDate)} sub={daysLeft == null ? "—" : daysLeft >= 0 ? `${daysLeft} days left` : "ended"} />
        </div>
      </header>

      <nav className={`flex gap-1 overflow-x-auto border-b ${t.cardFlat}`} aria-label="Campaign tabs">
        {subTabs.map((x) => (
          <button key={x.key} type="button" onClick={() => setSub(x.key)} aria-current={sub === x.key ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${sub === x.key ? `${t.tabActive} font-semibold` : t.tabInactive}`}>{x.label}</button>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {sub === "details" && (
            <EditForm t={t} form={form} setForm={setForm} dirty={changes.length > 0}
              onDiscard={() => setForm(toForm(d))}
              onSave={() => setPending({ kind: "edit", changes, body: form })} />
          )}
          {sub === "donations" && <DonationsTab t={t} id={id} />}
          {sub === "updates" && <ReviewList t={t} rows={review.filter((r) => r.kind === "UPDATE")} empty="No updates waiting for review." />}
          {sub === "changes" && <ReviewList t={t} rows={review.filter((r) => r.kind !== "UPDATE")} empty="No page changes, closure requests or outcomes waiting." />}
          {sub === "reports" && <ReportsTab t={t} rc={reportCase} />}
          {sub === "questions" && <QuestionsTab t={t} rc={reportCase} />}
          {sub === "activity" && <ActivityTab t={t} d={d} />}
        </div>

        {/* Right side: exactly the three panels of artboard 3. */}
        <aside className="flex flex-col gap-4">
          <Card t={t} className="flex flex-col gap-2.5 p-[18px]">
            <h3 className={`text-[15px] font-bold ${t.heading}`}>Status &amp; visibility</h3>
            <label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>Status
              <select value={STATUS_CHOICES.some((s) => s.value === c.status) ? c.status : ""}
                onChange={(e) => e.target.value && e.target.value !== c.status && setPending({ kind: "status", to: e.target.value as CampaignFlowStatus })}
                className={`min-h-10 rounded-xl border px-3 text-sm ${t.input}`}>
                {!STATUS_CHOICES.some((s) => s.value === c.status) && <option value="">{c.status.replaceAll("_", " ").toLowerCase()}</option>}
                {STATUS_CHOICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <Toggle t={t} label="Show on public pages" checked={!d.hidden}
              onChange={(v) => setPending({ kind: "flags", flags: { hidden: !v }, changes: [{ field: "Public pages", before: d.hidden ? "Hidden" : "Shown", after: v ? "Shown" : "Hidden" }] })} />
            <Toggle t={t} label="Featured on home" checked={d.featured}
              onChange={(v) => setPending({ kind: "flags", flags: { featured: v }, changes: [{ field: "Featured", before: d.featured ? "Yes" : "No", after: v ? "Yes" : "No" }] })} />
            <Toggle t={t} label="Accept new donations" checked={d.acceptingDonations}
              onChange={(v) => setPending({ kind: "flags", flags: { acceptingDonations: v }, changes: [{ field: "New donations", before: d.acceptingDonations ? "Accepted" : "Stopped", after: v ? "Accepted" : "Stopped" }] })} />
          </Card>

          <Card t={t} className="flex flex-col gap-2 p-[18px]">
            <h3 className={`mb-1 text-[15px] font-bold ${t.heading}`}>Actions</h3>
            <ActionButton t={t} onClick={() => setPending({ kind: "status", to: "PAUSED" })} disabled={c.status !== "APPROVED"}>Pause collections</ActionButton>
            <ActionButton t={t} onClick={() => setPending({ kind: "close" })} disabled={c.status !== "APPROVED" && c.status !== "PAUSED"}>Close collections now</ActionButton>
            <ActionButton t={t} onClick={() => setPending({ kind: "extend" })}>Extend end date</ActionButton>
            <ActionButton t={t} onClick={() => setPending({ kind: "payout" })}>{d.payoutReady ? "Unmark payout ready" : "Mark payout ready"}</ActionButton>
            <ActionButton t={t} onClick={() => setPending({ kind: "message" })}>Message donee</ActionButton>
            <ActionButton t={t} danger onClick={() => setPending({ kind: "decline" })}>Decline / take down</ActionButton>
          </Card>

          <Card t={t} className="flex flex-col gap-2 p-[18px] text-sm">
            <h3 className={`mb-1 text-[15px] font-bold ${t.heading}`}>Money (read-only)</h3>
            <div className="flex justify-between"><span className={t.muted}>Gross raised</span><b className={t.heading}>{inr(d.money.gross)}</b></div>
            <div className="flex justify-between"><span className={t.muted}>Platform fee{d.money.gross > 0 ? ` (${Math.round((d.money.fees / d.money.gross) * 1000) / 10}%)` : ""}</span><b className={t.heading}>{inr(d.money.fees)}</b></div>
            <div className="flex justify-between"><span className={t.muted}>Net to donee</span><b className={t.heading}>{inr(d.money.net)}</b></div>
            <div className={`text-xs ${t.dim}`}>Refunds and payouts are on hold.</div>
          </Card>
          {reportsOpen > 0 && <p className={`text-xs ${t.muted}`}>{reportsOpen} open donor report{reportsOpen === 1 ? "" : "s"} — see the Reports tab.</p>}
        </aside>
      </div>

      {pending?.kind === "edit" && (
        <ConfirmDialog t={t} title={`Confirm changes to ${c.title || "this fundraiser"}`} changes={pending.changes}
          onCancel={() => setPending(null)}
          onConfirm={async (r) => {
            const f = pending.body as Form;
            await superAdminFundraising.edit(id, {
              expectedVersion: d.version, reason: r.reason, details: r.details, notifyDonee: r.notifyPrimary,
              ...(f.title !== (c.title ?? "") ? { title: f.title } : {}),
              ...(f.story !== (c.story ?? "") ? { description: f.story } : {}),
              ...(f.category !== (c.category ?? "") ? { category: f.category } : {}),
              ...(f.city !== (c.city ?? "") ? { city: f.city } : {}),
              ...(f.state !== (c.state ?? "") ? { state: f.state } : {}),
              ...(f.target !== String(c.targetAmount ?? "") ? { targetAmount: Number(f.target) } : {}),
              ...(f.endDate !== (c.endDate ?? "") && f.endDate ? { endDate: f.endDate } : {}),
              ...(costText(f.costs) !== costText(d.costItems) ? { costItems: f.costs.map((x) => ({ expense: x.expense.trim(), amount: Number(x.amount) })) } : {}),
            });
            done("Changes saved.");
          }} />
      )}
      {pending?.kind === "flags" && (
        <ConfirmDialog t={t} title="Confirm visibility change" changes={pending.changes} defaultNotify={false} onCancel={() => setPending(null)}
          onConfirm={async (r) => { await superAdminFundraising.flags(id, { expectedVersion: d.version, ...pending.flags, reason: r.reason, details: r.details, notifyDonee: r.notifyPrimary }); done("Visibility updated."); }} />
      )}
      {pending?.kind === "status" && (
        <ConfirmDialog t={t} title={`Change status to ${STATUS_CHOICES.find((s) => s.value === pending.to)?.label ?? pending.to}`}
          changes={[{ field: "Status", before: c.status, after: pending.to }]} danger={pending.to === "PUBLICATION_DECLINED"}
          onCancel={() => setPending(null)} onConfirm={async (r) => { await runStatus(pending.to, r); done("Status updated."); }} />
      )}
      {pending?.kind === "close" && (
        <ConfirmDialog t={t} title="Close collections now" changes={[{ field: "Status", before: c.status, after: "COLLECTIONS_CLOSED" }]}
          onCancel={() => setPending(null)} onConfirm={async (r) => { await runStatus("COLLECTIONS_CLOSED", r); done("Collections closed."); }} />
      )}
      {pending?.kind === "decline" && (
        <ConfirmDialog t={t} title="Decline / take down this fundraiser" danger confirmLabel="Decline"
          changes={[{ field: "Status", before: c.status, after: "PUBLICATION_DECLINED" }]}
          onCancel={() => setPending(null)} onConfirm={async (r) => { await runStatus("PUBLICATION_DECLINED", r); done("Fundraiser declined."); }} />
      )}
      {pending?.kind === "payout" && (
        <ConfirmDialog t={t} title={d.payoutReady ? "Unmark payout ready" : "Mark payout ready"} primaryNotify={null}
          changes={[{ field: "Payout ready", before: d.payoutReady ? "Yes" : "No", after: d.payoutReady ? "No" : "Yes" }]}
          onCancel={() => setPending(null)} onConfirm={async () => { await fundraisers.setPayoutReady(id, d.version, !d.payoutReady); done("Payout status updated."); }} />
      )}
      {pending?.kind === "extend" && <ExtendDialog t={t} d={d} onCancel={() => setPending(null)} onDone={() => done("End date updated.")} />}
      {pending?.kind === "message" && <MessageDialog t={t} id={id} onCancel={() => setPending(null)} onDone={() => done("Message sent to the donee.")} />}
    </div>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function toForm(d: SaFrCampaignDetail): Form {
  const c = d.admin.campaign;
  return {
    title: c.title ?? "", category: c.category ?? "", city: c.city ?? "", state: c.state ?? "", story: c.story ?? "",
    target: c.targetAmount == null ? "" : String(c.targetAmount), endDate: c.endDate ?? "",
    costs: d.costItems.map((x) => ({ expense: x.expense, amount: x.amount })),
  };
}

const costText = (l: SaFrCostLine[]) => l.map((x) => `${x.expense.trim()}=${Number(x.amount ?? 0)}`).join("; ");

function diff(d: SaFrCampaignDetail, f: Form): ChangeRow[] {
  const c = d.admin.campaign;
  const rows: ChangeRow[] = [];
  const add = (field: string, before: string, after: string) => { if (before !== after) rows.push({ field, before, after }); };
  add("Title", c.title ?? "", f.title);
  add("Category", c.category ?? "", f.category);
  add("City", c.city ?? "", f.city);
  add("State", c.state ?? "", f.state);
  add("Story", c.story ?? "", f.story);
  add("Target", c.targetAmount == null ? "" : String(c.targetAmount), f.target);
  add("End date", c.endDate ?? "", f.endDate);
  add("Cost items", costText(d.costItems), costText(f.costs));
  return rows.map((r) => (r.field === "Story" ? { ...r, before: r.before.slice(0, 80) + (r.before.length > 80 ? "…" : ""), after: r.after.slice(0, 80) + (r.after.length > 80 ? "…" : "") } : r));
}

function BackLink({ t, onBack }: { t: SaTheme; onBack: () => void }) {
  return <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold" style={{ color: t.accent }}><ArrowLeft className="h-4 w-4" />All campaigns</button>;
}

function MiniStat({ t, label, value, sub }: { t: SaTheme; label: string; value: string; sub: string }) {
  return (
    <Card t={t} className="p-3">
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${t.muted}`}>{label}</div>
      <div className={`truncate text-lg font-extrabold ${t.heading}`}>{value}</div>
      <div className={`text-xs ${t.muted}`}>{sub}</div>
    </Card>
  );
}

function Toggle({ t, label, checked, onChange }: { t: SaTheme; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex min-h-9 items-center justify-between gap-3 text-sm ${t.text}`}>
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function ActionButton({ t, children, onClick, danger = false, disabled = false }: { t: SaTheme; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`min-h-10 rounded-xl border px-3.5 text-left text-sm disabled:opacity-40 ${danger ? "border-red-300 text-red-700 hover:bg-red-50" : t.btn}`}>
      {children}
    </button>
  );
}

function Field({ t, label, children }: { t: SaTheme; label: string; children: ReactNode }) {
  return <label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>{label}{children}</label>;
}

function EditForm({ t, form, setForm, dirty, onDiscard, onSave }: {
  t: SaTheme; form: Form; setForm: (f: Form) => void; dirty: boolean; onDiscard: () => void; onSave: () => void;
}) {
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
  const input = `min-h-10 rounded-xl border px-3 text-sm ${t.input}`;
  const costsValid = form.costs.every((x) => x.expense.trim() && Number(x.amount) > 0);
  const valid = form.title.trim() && form.story.trim() && Number(form.target) > 0 && costsValid;
  return (
    <Card t={t} className="flex flex-col gap-[18px] p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={`text-base font-bold ${t.heading}`}>Campaign page</h3>
        <span className={`text-[13px] ${t.muted}`}>Changes go live on save · audit-logged</span>
      </div>
      <Field t={t} label="Title"><input value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} className={input} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field t={t} label="Category">
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={input}>
            {!form.category && <option value="">—</option>}
            {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </Field>
        <Field t={t} label="City"><input value={form.city} maxLength={100} onChange={(e) => set("city", e.target.value)} className={input} /></Field>
        <Field t={t} label="State"><input value={form.state} maxLength={100} onChange={(e) => set("state", e.target.value)} className={input} /></Field>
      </div>
      <Field t={t} label="Story"><textarea rows={7} value={form.story} maxLength={5000} onChange={(e) => set("story", e.target.value)} className={`rounded-xl border px-3 py-2.5 text-sm ${t.input}`} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field t={t} label="Target amount (₹)"><input inputMode="decimal" value={form.target} onChange={(e) => set("target", e.target.value.replace(/[^\d.]/g, ""))} className={input} /></Field>
        <Field t={t} label="End date"><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={input} /></Field>
      </div>
      <div>
        <div className={`mb-2 text-[13px] font-medium ${t.text}`}>Cost breakdown</div>
        <div className={`overflow-hidden rounded-xl border ${t.cardFlat}`}>
          {form.costs.map((x, i) => (
            <div key={i} className={`grid grid-cols-[1fr_150px_40px] items-center gap-2 border-b px-3 py-2 ${t.cardFlat}`}>
              <input aria-label={`Cost item ${i + 1}`} value={x.expense} onChange={(e) => set("costs", form.costs.map((y, j) => (j === i ? { ...y, expense: e.target.value } : y)))} className={`min-h-9 rounded-lg border px-2 text-sm ${t.input}`} />
              <input aria-label={`Amount for cost item ${i + 1}`} inputMode="decimal" value={x.amount ?? ""} onChange={(e) => set("costs", form.costs.map((y, j) => (j === i ? { ...y, amount: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d.]/g, "")) } : y)))} className={`min-h-9 rounded-lg border px-2 text-sm ${t.input}`} />
              <button type="button" aria-label={`Remove cost item ${i + 1}`} onClick={() => set("costs", form.costs.filter((_, j) => j !== i))} className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.muted}`}><X className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => set("costs", [...form.costs, { expense: "", amount: null }])} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium" style={{ color: t.accent }}>
            <Plus className="h-4 w-4" />Add cost item
          </button>
        </div>
      </div>
      <p className={`text-xs ${t.dim}`}>Cover and photos are changed by the organiser from their workspace.</p>
      <div className={`flex justify-end gap-2.5 border-t pt-4 ${t.cardFlat}`}>
        <button type="button" onClick={onDiscard} disabled={!dirty} className={`min-h-10 rounded-xl border px-4 text-sm ${t.btn}`}>Discard</button>
        <button type="button" onClick={onSave} disabled={!dirty || !valid} className={`min-h-10 rounded-xl border px-5 text-sm font-semibold disabled:opacity-50 ${t.btnAccent}`}>Save changes…</button>
      </div>
    </Card>
  );
}

function DonationsTab({ t, id }: { t: SaTheme; id: number }) {
  const [r, setR] = useState<AdminDonorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fundraisingDonors.report(id).then(setR).catch((e) => setError(errorText(e, "We couldn't load donations."))); }, [id]);
  if (error) return <ErrorLine message={error} />;
  if (!r) return <Spinner t={t} />;
  return (
    <Card t={t} className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className={`text-sm ${t.text}`}>{r.summary.confirmedCount} confirmed · {inr(r.summary.gross)} gross · {inr(r.summary.netToTransfer)} net</span>
        <button type="button" onClick={() => void fundraisingDonors.downloadCsv(id)} className={`min-h-9 rounded-lg border px-3 text-[13px] ${t.btn}`}>Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className={`border-y text-left text-xs uppercase tracking-wider ${t.tableHead} ${t.muted}`}><th className="px-3.5 py-2.5">Date</th><th className="px-3.5 py-2.5">Donor</th><th className="px-3.5 py-2.5">Amount</th><th className="px-3.5 py-2.5">Fee</th><th className="px-3.5 py-2.5">Net</th><th className="px-3.5 py-2.5">Status</th></tr></thead>
          <tbody className={`divide-y ${t.divide}`}>
            {r.rows.length === 0 && <tr><td colSpan={6} className={`px-4 py-8 text-center ${t.muted}`}>No donations yet.</td></tr>}
            {r.rows.map((x) => (
              <tr key={x.id}><td className={`px-3.5 py-2.5 ${t.text}`}>{dateTime(x.at)}</td><td className={`px-3.5 py-2.5 ${t.text}`}>{x.anonymous ? "Anonymous" : x.name ?? "—"}<div className={`text-xs ${t.muted}`}>{x.email}</div></td>
                <td className={`px-3.5 py-2.5 font-semibold ${t.heading}`}>{inr(x.amount)}</td><td className={`px-3.5 py-2.5 ${t.text}`}>{inr(x.fee)}</td><td className={`px-3.5 py-2.5 ${t.text}`}>{inr(x.net)}</td>
                <td className="px-3.5 py-2.5"><Pill tone={x.status === "COMPLETED" ? "ok" : x.status === "FAILED" ? "danger" : "warn"}>{x.status === "COMPLETED" ? "Success" : x.status === "FAILED" ? "Failed" : "Pending"}</Pill></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const KIND_LABEL: Record<string, string> = { UPDATE: "Update", REVISION: "Page change", CLOSURE: "Closure request", OUTCOME: "Outcome" };

function ReviewList({ t, rows, empty }: { t: SaTheme; rows: ReviewItemRow[]; empty: string }) {
  return (
    <Card t={t} className="overflow-hidden">
      {rows.length === 0 ? <p className={`px-4 py-8 text-center text-sm ${t.muted}`}>{empty}</p> : (
        <ul className={`divide-y ${t.divide}`}>
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm">
              <span className={t.text}><Pill tone={r.kind === "CLOSURE" ? "warn" : r.kind === "OUTCOME" ? "ok" : "info"}>{KIND_LABEL[r.kind] ?? r.kind}</Pill> <span className="ml-2">Submitted {dateTime(r.submittedAt)}{r.material ? " · material change" : ""}</span></span>
              <a href="/admin/fundraising/review" className={`min-h-9 rounded-lg border px-3 py-1.5 text-[13px] ${t.btn}`}>Review</a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ReportsTab({ t, rc }: { t: SaTheme; rc: ReportCase | null }) {
  if (!rc || rc.reports.length === 0) return <Card t={t}><p className={`px-4 py-8 text-center text-sm ${t.muted}`}>No donor reports for this fundraiser.</p></Card>;
  return (
    <Card t={t} className="overflow-hidden">
      <ul className={`divide-y ${t.divide}`}>
        {rc.reports.map((r) => (
          <li key={r.id} className="px-4 py-3.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className={t.heading}>{r.reason.replaceAll("_", " ").toLowerCase()} · {r.reference}</b>
              <Pill tone={r.status === "RECEIVED" || r.status === "UNDER_INVESTIGATION" ? "danger" : "muted"}>{r.status.replaceAll("_", " ").toLowerCase()}</Pill>
            </div>
            <p className={`mt-1 ${t.text}`}>{r.details}</p>
            <div className={`mt-1 text-xs ${t.muted}`}>{r.reporterName ?? "Anonymous"} · {dateTime(r.createdAt)}</div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-3"><a href={`/admin/fundraising/reports/${rc.campaignId}`} className="text-[13px] font-semibold" style={{ color: t.accent }}>Open the full report case →</a></div>
    </Card>
  );
}

function QuestionsTab({ t, rc }: { t: SaTheme; rc: ReportCase | null }) {
  const qs = rc?.inquiries.flatMap((i) => i.questions.map((q) => ({ ...q, inquiry: i }))) ?? [];
  if (qs.length === 0) return <Card t={t}><p className={`px-4 py-8 text-center text-sm ${t.muted}`}>No questions have been asked of this organiser.</p></Card>;
  return (
    <Card t={t} className="overflow-hidden">
      <ul className={`divide-y ${t.divide}`}>
        {qs.map((q) => (
          <li key={q.id} className="px-4 py-3.5 text-sm">
            <b className={t.heading}>{q.question}</b>
            <p className={`mt-1 ${q.answer ? t.text : t.muted}`}>{q.answer ?? `Waiting for the organiser's answer${q.inquiry.deadline ? ` · due ${shortDate(q.inquiry.deadline)}` : ""}`}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ActivityTab({ t, d }: { t: SaTheme; d: SaFrCampaignDetail }) {
  if (d.activity.length === 0) return <Card t={t}><p className={`px-4 py-8 text-center text-sm ${t.muted}`}>No admin activity on this fundraiser yet.</p></Card>;
  return (
    <Card t={t} className="overflow-hidden">
      <ul className={`divide-y ${t.divide}`}>
        {d.activity.map((a) => (
          <li key={a.id} className="px-4 py-3 text-sm">
            <span className={t.text}><b>{a.actorEmail ?? "System"}</b> · {a.action.replaceAll("_", " ").toLowerCase()}</span>
            {a.detail && <p className={`mt-0.5 ${t.text}`}>{a.detail}</p>}
            <div className={`text-xs ${t.muted}`}>{a.reason ? `Reason: ${a.reason} · ` : ""}{dateTime(a.at)}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ExtendDialog({ t, d, onCancel, onDone }: { t: SaTheme; d: SaFrCampaignDetail; onCancel: () => void; onDone: () => void }) {
  const current = d.admin.campaign.endDate ?? "";
  const [date, setDate] = useState(current);
  return (
    <ConfirmDialog t={t} title="Extend end date" changes={date && date !== current ? [{ field: "End date", before: current, after: date }] : []}
      extra={<label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>New end date
        <input type="date" value={date} min={current || undefined} onChange={(e) => setDate(e.target.value)} className={`min-h-11 rounded-xl border px-3 text-sm ${t.input}`} /></label>}
      onCancel={onCancel}
      onConfirm={async (r) => {
        if (!date || date === current) throw new Error("Pick a new end date.");
        await superAdminFundraising.edit(d.admin.campaign.id, { expectedVersion: d.version, endDate: date, reason: r.reason, details: r.details, notifyDonee: r.notifyPrimary });
        onDone();
      }} />
  );
}

function MessageDialog({ t, id, onCancel, onDone }: { t: SaTheme; id: number; onCancel: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className={`absolute inset-0 ${t.overlay}`} aria-hidden="true" onClick={busy ? undefined : onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="fr-msg-title" className={`relative flex w-full max-w-[520px] flex-col gap-4 rounded-[20px] border p-6 shadow-2xl ${t.surface}`}>
        <h2 id="fr-msg-title" className={`text-xl font-extrabold ${t.heading}`}>Message the donee</h2>
        <p className={`text-sm ${t.muted}`}>Sent as an in-app notification from the CauseKind team, and recorded in the audit log.</p>
        <textarea rows={5} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} aria-label="Message" className={`rounded-xl border px-3 py-2.5 text-sm ${t.input}`} />
        {error && <ErrorLine message={error} />}
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} disabled={busy} className={`min-h-11 rounded-xl border px-4 text-sm ${t.btn}`}>Cancel</button>
          <button type="button" disabled={!text.trim() || busy} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold disabled:opacity-50 ${t.btnAccent}`}
            onClick={async () => {
              setBusy(true); setError(null);
              try { await superAdminFundraising.message(id, text.trim()); onDone(); }
              catch (e) { setError(errorText(e, "The message didn't send. Try again.")); setBusy(false); }
            }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Send</button>
        </div>
      </div>
    </div>
  );
}
