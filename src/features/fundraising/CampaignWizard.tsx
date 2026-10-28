"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fundraisingCampaigns, ApiError,
  type FundraisingCampaign, type FundraisingCampaignSave, type FundraisingCostItem,
  type LocationVisibility, type NameVisibility,
} from "@/lib/api";
import { useFundraisingLabels, Icon, type SaveState, SaveIndicator, formatINR, CampaignStepper } from "./ui";
import { FieldInfo } from "./FieldInfo";
import { useTranslations } from "next-intl";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
export type SetFn = (patch: FundraisingCampaignSave) => void;

/** F13–F17 — campaign draft wizard (canvas F13…F17). Autosaves like the application wizard. */
export function CampaignWizard({ initial, onSubmitted }: { initial: FundraisingCampaign; onSubmitted: (c: FundraisingCampaign) => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<SaveState>("saved");
  const pending = useRef<FundraisingCampaignSave>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const body = pending.current;
    if (Object.keys(body).length === 0) return true;
    pending.current = {};
    setSave("saving");
    try {
      const next = await fundraisingCampaigns.save(c.id, body);
      setC((cur) => {
        const keep: Record<string, unknown> = {};
        for (const k of Object.keys(pending.current)) keep[k] = (cur as Record<string, unknown>)[k];
        return { ...next, ...keep } as FundraisingCampaign;
      });
      setSave("saved");
      return true;
    } catch {
      pending.current = { ...body, ...pending.current };
      setSave("error");
      return false;
    }
  }, [c.id]);

  const set: SetFn = useCallback((patch) => {
    const local: Record<string, unknown> = { ...patch };
    if (patch.story !== undefined) local.story = patch.story;
    setC((cur) => ({ ...cur, ...(local as Partial<FundraisingCampaign>) }));
    pending.current = { ...pending.current, ...patch };
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function go(to: number) { await flush(); setStep(to); window.scrollTo({ top: 0 }); }
  async function exit() { await flush(); router.push("/fundraising"); }
  async function cancel() {
    try { await fundraisingCampaigns.cancel(c.id); router.push("/fundraising"); }
    catch { setConfirmCancel(false); }
  }

  const nav = (back: number | null, next: number | null, nextLabel?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: "1px solid #efe7de", paddingTop: 20 }}>
      {back === null ? <span /> : <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => go(back)}><UiText>Back</UiText></button>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={() => setConfirmCancel(true)}><UiText>Cancel draft</UiText></button>
        {next !== null && <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => go(next)}>{nextLabel ?? ui("Continue")}<Icon name="arrow" /></button>}
      </div>
    </div>
  );

  return (
    <>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topIn}`}>
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>{t("campaignFromApplication", { status: c.status === "CHANGES_REQUESTED" ? ui("Changes requested", "campaign status") : ui("Draft", "campaign status"), reference: c.applicationReference ?? "" })}</span>
          <SaveIndicator state={save} />
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={exit}><UiText>Save and exit</UiText></button>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        {c.status === "CHANGES_REQUESTED" && c.reviewerMessage ? (
          <div role="status" className={s.card} style={{ padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start", background: "#fdf3e1", borderColor: "#f0d9a8", maxWidth: 860 }}>
            <Icon name="edit" /><p><strong><UiText>The reviewer asked for changes:</UiText></strong> &ldquo;{c.reviewerMessage}&rdquo;</p>
          </div>
        ) : step === 0 && (
          <div role="status" className={s.card} style={{ padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderColor: "#b7d9c3", background: "#f4faf6", maxWidth: 860 }}>
            <span style={{ color: "#1d5b3a", marginTop: 2 }}><Icon name="check" /></span>
            <p><strong><UiText>Your application has been approved. Finish your fundraiser page and submit it for publication.</UiText></strong></p>
          </div>
        )}
        <CampaignStepper current={step} />
        {save === "error" && (
          <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
            <Icon name="alert" /><p style={{ flex: "1 1 400px" }}><strong><UiText>Your last changes haven&apos;t been saved.</UiText></strong> <UiText>They&apos;re still on this screen — check your connection and try again.</UiText></p>
            <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void flush()}><UiText>Try again</UiText></button>
          </div>
        )}
        {step === 0 && <Basics c={c} set={set} setC={setC} nav={nav(null, 1)} />}
        {step === 1 && <Story c={c} set={set} nav={nav(0, 2)} />}
        {step === 2 && <Target c={c} set={set} nav={nav(1, 3)} />}
        {step === 3 && <Privacy c={c} set={set} nav={nav(2, 4, ui("Continue to preview"))} />}
        {step === 4 && <Preview c={c} flush={flush} back={() => go(3)} onCancel={() => setConfirmCancel(true)} onSubmitted={onSubmitted} />}
      </main>
      {confirmCancel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(31,20,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="cd" className={s.card} style={{ padding: 28, maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 id="cd" className={s.serif} style={{ fontSize: 23 }}><UiText>Cancel this campaign draft?</UiText></h2>
            <p>{t("titleDraft", { title: c.title || ui("Untitled campaign") })}</p>
            <ul className={s.small} style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              <li><UiText>It was never public and has no donations.</UiText></li><li><UiText>It will show as Cancelled on your dashboard.</UiText></li><li><UiText>Your application approval stays as it is.</UiText></li>
            </ul>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setConfirmCancel(false)}><UiText>Keep draft</UiText></button>
              <button type="button" className={s.btn} style={{ background: "#8f1d1d", color: "#fff" }} onClick={cancel}><UiText>Cancel draft</UiText></button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 760 }}><h1 className={s.serif} style={{ fontSize: 32 }}>{title}</h1><p className={s.muted}>{sub}</p></div>;
}

// F13 — C1 Public basics
/**
 * `inApplication`: the page is being written inside the application (single-form flow, 2026-10-27):
 * nothing is approved yet, the category comes from "The need", and the end date is asked here
 * because the separate Target step is gone.
 */
export function Basics({ c, set, setC, nav, inApplication = false, neededBy = null }: { c: FundraisingCampaign; set: SetFn; setC: (c: FundraisingCampaign) => void; nav: React.ReactNode; inApplication?: boolean; neededBy?: string | null }) {
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(file: File) {
    setUploading(true); setErr(null);
    try { setC(await fundraisingCampaigns.uploadCover(c.id, file)); }
    catch (e) { setErr(e instanceof ApiError ? e.message : ui("Upload failed. Try again.")); }
    finally { setUploading(false); }
  }
  return (
    <>
      <Heading title={ui("Public basics")} sub={ui("This is what donors see first. We've carried over what you already told us.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 860 }}>
        <div><label className={s.lbl} htmlFor="t"><UiText>Campaign title</UiText> <FieldInfo localize k="t" /></label><input id="t" className={s.in} maxLength={120} value={c.title ?? ""} onChange={(e) => set({ title: e.target.value })} /><p className={s.hint}>{t("titleHint", { count: (c.title ?? "").length })}</p></div>
        <div className={s.grid2}>
          <div><span className={s.lbl}><UiText>Category</UiText> <FieldInfo localize k="cCat" /></span><p style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><span className={`${s.chip} ${s.cM}`}><Icon name="lock" />{c.category ? fmt.category(c.category) : "—"}</span><span className={`${s.muted} ${s.small}`}>{inApplication ? ui("From step 3 — change it there") : <UiText>Approved — can&apos;t change here</UiText>}</span></p></div>
          <div><label className={s.lbl} htmlFor="dn"><UiText>Beneficiary name shown to donors</UiText> <FieldInfo localize k="dn" /><span className={`${s.chip} ${s.cN}`}><UiText>From application</UiText></span></label><input id="dn" className={s.in} maxLength={80} value={c.beneficiaryDisplayName ?? ""} onChange={(e) => set({ beneficiaryDisplayName: e.target.value })} /><p className={s.hint}>{inApplication ? ui("Their legal name stays private. Choose what donors see in the Privacy step.") : <UiText>Their legal name stays private. Change visibility in step 4.</UiText>}</p></div>
        </div>
        {inApplication && (
          // Same date as step 3's "By which date do you need the money?" — copied onto the page on submit.
          <div><span className={s.lbl}><UiText>Last day to collect money</UiText> <FieldInfo localize k="ed" /></span><p style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><span className={`${s.chip} ${s.cM}`}><Icon name="lock" />{neededBy && /^\d{4}-\d{2}-\d{2}$/.test(neededBy) ? fmt.date(neededBy) : "—"}</span><span className={`${s.muted} ${s.small}`}>{ui("From step 3 — change it there")}</span></p><p className={s.hint}><UiText>After this day, people can no longer give.</UiText></p></div>
        )}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="cv">
          <h2 id="cv" className={s.lbl} style={{ margin: 0 }}><UiText>Cover photo</UiText> <FieldInfo localize k="cv" /></h2>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,360px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
            {c.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10 }} />
              : <div style={{ aspectRatio: "16 / 9", borderRadius: 10, background: "#e4dbd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5d52" }}><UiText>No photo yet</UiText></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className={`${s.btn} ${s.bs}`} style={{ alignSelf: "flex-start" }}>{uploading ? ui("Uploading…") : c.coverUrl ? ui("Replace") : ui("Choose photo")}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>
              {err && <p role="alert" className={s.errText}><Icon name="alert" />{err}</p>}
              <div><label className={s.lbl} htmlFor="alt"><UiText>Describe the photo for people who can&apos;t see it</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span> <FieldInfo localize k="alt" /></label><input id="alt" className={s.in} maxLength={300} value={c.coverAltText ?? ""} onChange={(e) => set({ coverAltText: e.target.value })} /></div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={c.coverConsent} onChange={(e) => set({ coverConsent: e.target.checked })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span className={s.small}><UiText>I took this photo or have permission to use it, and everyone in it agrees to it being public.</UiText></span></label>
            </div>
          </div>
          <p className={s.hint} style={{ margin: 0 }}><UiText>Cover photos are chosen here, separately from your private documents. Your ID or reports are never offered as photos.</UiText></p>
        </section>
        {nav}
      </div>
    </>
  );
}

// F14 — C2 Story
export function Story({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  return (
    <>
      <Heading title={ui("Tell the story")} sub={ui("Honest and specific beats dramatic — you don't need to share painful details.")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 32, alignItems: "start", maxWidth: 1120 }}>
        <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className={s.lbl} htmlFor="st"><UiText>Your story</UiText> <FieldInfo localize k="st" /></label>
            <p className={`${s.muted} ${s.small}`} style={{ marginBottom: 8 }}><UiText>Who needs help? What happened? What will the funds cover? What difference will support make? We&apos;ve started it from your application — edit freely.</UiText></p>
            <textarea id="st" className={s.in} rows={14} maxLength={5000} value={c.story ?? ""} onChange={(e) => set({ story: e.target.value })} style={{ resize: "vertical", lineHeight: 1.6 }} />
            <p className={s.hint}>{t("charsOf", { count: (c.story ?? "").length, max: 5000 })}</p>
          </div>
          {nav}
        </div>
        <aside className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}><UiText>Good to know</UiText></h2>
          <ul className={`${s.small} ${s.muted}`} style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><UiText>Reviewers compare this with your approved application.</UiText></li>
            <li><UiText>Avoid phone numbers, addresses and hospital file numbers.</UiText></li>
            <li><UiText>You can post updates later, once it&apos;s live.</UiText></li>
          </ul>
        </aside>
      </div>
    </>
  );
}

// F15 — C3 Target and duration
function Target({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));
  const rows: FundraisingCostItem[] = c.costItems.map((r) => ({ expense: r.expense, amount: r.amount, reference: r.reference }));
  const setRow = (i: number, amount: number | null) => {
    const next = rows.map((r, j) => (j === i ? { ...r, amount } : r));
    set({ costItems: next });
  };
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return (
    <>
      <Heading title={ui("Target and end date")} sub={ui("Carried over from your approved application. Changes are allowed, but reviewers will check them.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22, maxWidth: 860 }}>
        <section aria-labelledby="cb">
          <h2 id="cb" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}><UiText>Cost breakdown</UiText> <FieldInfo localize k="ccb" /></h2>
          {c.costItems.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px 150px", gap: 12, alignItems: "center", padding: r.changed ? 12 : "12px 0", borderTop: "1px solid #efe7de", background: r.changed ? "#fffaf0" : undefined, borderRadius: r.changed ? 8 : 0 }}>
              <span>{r.expense}{r.approvedAmount != null && r.changed && <><br /><span className={`${s.small} ${s.muted}`}>{t("approvedAmount", { amount: formatINR(r.approvedAmount) })}</span></>}</span>
              <input className={`${s.in} ${s.tabular}`} style={{ textAlign: "right" }} aria-label={t("expenseAmount", { expense: r.expense })} inputMode="decimal" value={r.amount ?? ""} onChange={(e) => setRow(i, num(e.target.value))} />
              {r.changed ? <span className={`${s.chip} ${s.cW}`} style={{ justifySelf: "end" }}><Icon name="edit" /><UiText>Changed</UiText></span> : <span className={`${s.chip} ${s.cM}`} style={{ justifySelf: "end" }}><UiText>As approved</UiText></span>}
            </div>
          ))}
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #efe7de", fontWeight: 700 }}><span><UiText>Total</UiText></span><span>{formatINR(c.totalCosts)}</span></div>
        </section>
        {c.hasMaterialChanges && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000", flexDirection: "column" }}>
            <p className={s.small}><strong><UiText>This differs from what was approved.</UiText></strong> <UiText>A reviewer will look at the change when you submit. Add a short reason.</UiText></p>
            <div style={{ width: "100%" }}><label className={s.lbl} htmlFor="why"><UiText>Reason for the change</UiText> <FieldInfo localize k="why" /></label><input id="why" className={s.in} maxLength={2000} value={c.changeReason ?? ""} onChange={(e) => set({ changeReason: e.target.value })} /></div>
          </div>
        )}
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="tg"><UiText>Target (₹)</UiText> <FieldInfo localize k="tg" /></label><input id="tg" className={`${s.in} ${s.tabular}`} inputMode="decimal" value={c.targetAmount ?? ""} onChange={(e) => set({ targetAmount: num(e.target.value) })} /><p className={s.hint}>{t("approvedTargetHint", { amount: formatINR(c.approvedTarget) })}</p></div>
          <div><label className={s.lbl} htmlFor="ed"><UiText>End date</UiText> <FieldInfo localize k="ed" /></label><input id="ed" type="date" className={s.in} min={tomorrow} value={c.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || null })} /><p className={s.hint}><UiText>Allowed duration: [TO BE DEFINED].</UiText></p></div>
        </div>
        {nav}
      </div>
    </>
  );
}

// F16 — C4 Public evidence and privacy
export function Privacy({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const seg = <T extends string>(label: string, value: T | null, options: [T, string][], onPick: (v: T) => void) => (
    <div className={s.small} role="radiogroup" aria-label={label} style={{ display: "flex", border: "1px solid #cfc3b6", borderRadius: 10, overflow: "hidden" }}>
      {options.map(([v, l], i) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onPick(v)}
          style={{ flex: 1, minHeight: 40, border: 0, borderLeft: i ? "1px solid #cfc3b6" : 0, fontWeight: 600, cursor: "pointer", font: "inherit", fontSize: 13,
            background: value === v ? "#1e3a60" : "#fff", color: value === v ? "#fff" : "#5c4f45" }}>{l}</button>
      ))}
    </div>
  );
  const toggle = (id: number, on: boolean) =>
    set({ publicEvidenceIds: on ? [...c.publicEvidenceIds, id] : c.publicEvidenceIds.filter((x) => x !== id) });
  const row = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 16, alignItems: "center", padding: "14px 0", borderTop: "1px solid #efe7de" } as const;
  const name: [NameVisibility, string][] = [["FULL", ui("Full", "visibility")], ["FIRST_NAME", ui("First name", "visibility")], ["HIDDEN", ui("Hidden", "visibility")]];
  const loc: [LocationVisibility, string][] = [["CITY", ui("City", "visibility")], ["STATE", ui("State", "visibility")], ["HIDDEN", ui("Hidden", "visibility")]];
  return (
    <>
      <Heading title={ui("What donors can see")} sub={ui("Choose each item. Your application documents stay private unless you pick one below for review.")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 28, alignItems: "start", maxWidth: 1120 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className={s.card} style={{ padding: "8px 24px 16px" }} aria-labelledby="vis">
            <h2 id="vis" style={{ fontSize: 16, fontWeight: 700, paddingTop: 14 }}><UiText>Names and place</UiText> <FieldInfo localize k="vis" /></h2>
            <div style={row}><div><strong><UiText>Beneficiary name</UiText></strong><p className={`${s.small} ${s.muted}`}>{t("shownAs", { name: c.beneficiaryDisplayName ?? "—" })}</p></div>{seg(ui("Beneficiary name"), c.beneficiaryNameVisibility, name, (v) => set({ beneficiaryNameVisibility: v }))}</div>
            <div style={row}><div><strong><UiText>Organiser name</UiText></strong><p className={`${s.small} ${s.muted}`}>{c.organiserName}</p></div>{seg(ui("Organiser name"), c.organiserNameVisibility, name.slice(0, 2), (v) => set({ organiserNameVisibility: v }))}</div>
            <div style={row}><div><strong><UiText>Location</UiText></strong><p className={`${s.small} ${s.muted}`}><UiText>Your address is never shown</UiText></p></div>{seg(ui("Location"), c.locationVisibility, loc, (v) => set({ locationVisibility: v }))}</div>
          </section>
          <section className={s.card} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="pe">
            <h2 id="pe" style={{ fontSize: 16, fontWeight: 700 }}><UiText>Supporting documents donors can see</UiText> <FieldInfo localize k="pe" /><span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span></h2>
            <p className={`${s.small} ${s.muted}`}><UiText>Picked documents are reviewed and may be redacted before anyone sees them. ID and consent documents can&apos;t be picked.</UiText></p>
            {c.selectableEvidence.length === 0 && <p className={`${s.small} ${s.muted}`}><UiText>No documents from your application can be shown.</UiText></p>}
            {c.selectableEvidence.map((e) => {
              const on = c.publicEvidenceIds.includes(e.evidenceId);
              return (
                <label key={e.evidenceId} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, flexWrap: "wrap" }}>
                  <input type="checkbox" checked={on} onChange={(ev) => toggle(e.evidenceId, ev.target.checked)} style={{ width: 20, height: 20, accentColor: "#1e3a60" }} />
                  <span style={{ flex: 1 }}><strong>{e.type.replace(/_/g, " ").toLowerCase()}</strong><br /><span className={`${s.small} ${s.muted}`}>{e.fileName ?? ui("Document")}</span></span>
                  {on ? <span className={`${s.chip} ${s.cW}`}><UiText>Needs review</UiText></span> : <span className={`${s.chip} ${s.cM}`}><UiText>Private</UiText></span>}
                </label>
              );
            })}
          </section>
          {nav}
        </div>
        <aside className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="sum">
          <h2 id="sum" style={{ fontSize: 15, fontWeight: 700 }}><UiText>Visibility summary</UiText></h2>
          <p className={s.small}><span className={`${s.chip} ${s.cN}`}><UiText>Public</UiText></span> {c.beneficiaryNameVisibility === "HIDDEN" ? ui("Beneficiary hidden") : `"${c.beneficiaryDisplayName ?? "—"}"`}, {c.organiserNameVisibility === "FIRST_NAME" ? c.organiserName.split(" ")[0] : c.organiserName}{c.locationVisibility === "HIDDEN" ? "" : `, ${c.locationVisibility === "STATE" ? c.state ?? "state" : c.city ?? "city"}`}</p>
          <p className={s.small}><span className={`${s.chip} ${s.cN}`}><UiText>Public</UiText></span> <UiText>Cover photo</UiText></p>
          {c.publicEvidenceIds.length > 0 && <p className={s.small}><span className={`${s.chip} ${s.cW}`}><UiText>After review</UiText></span> {t("documentsCount", { count: c.publicEvidenceIds.length })}</p>}
          <p className={s.small}><span className={`${s.chip} ${s.cM}`}><UiText>Private</UiText></span> <UiText>Legal name, address, ID, consent, other documents</UiText></p>
        </aside>
      </div>
    </>
  );
}

// F17 — C5 Preview and submit
function Preview({ c, flush, back, onCancel, onSubmitted }: {
  c: FundraisingCampaign; flush: () => Promise<boolean>; back: () => void; onCancel: () => void; onSubmitted: (c: FundraisingCampaign) => void;
}) {
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setError(null);
    if (!(await flush())) { setBusy(false); setError(ui("Your last changes haven't saved yet. Try again before submitting.")); return; }
    try { onSubmitted(await fundraisingCampaigns.submit(c.id)); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Submitting failed. Try again.")); setBusy(false); }
  }
  const ck = (tone: "ok" | "warn" | "off", label: string, text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #efe7de" }}>
      <span className={`${s.chip} ${tone === "ok" ? s.cOk : tone === "warn" ? s.cW : s.cM}`}>{label}</span><span>{text}</span>
    </div>
  );
  const story = (c.story ?? "").slice(0, 280);
  return (
    <>
      <Heading title={ui("Preview your page")} sub={ui("This is exactly what donors will see once it's published.")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 20, alignItems: "start" }}>
        <figure aria-label={ui("Desktop preview")} style={{ margin: 0, border: "1px solid #d6ccc1", borderRadius: 12, overflow: "hidden", background: "#faf8f5" }}>
          <div className={`${s.small} ${s.muted}`} style={{ height: 28, background: "#efe9e2", display: "flex", alignItems: "center", padding: "0 10px" }}><UiText>Desktop</UiText></div>
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {c.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ aspectRatio: "16 / 9", borderRadius: 8, background: "#e4dbd0" }} />}
              <h2 className={s.serif} style={{ fontSize: 24 }}>{c.title || ui("Untitled campaign")}</h2>
              <p className={`${s.small} ${s.muted}`}>{t("organisedBy", { organiser: c.organiserNameVisibility === "FIRST_NAME" ? c.organiserName.split(" ")[0] : c.organiserName })}{c.locationVisibility === "HIDDEN" ? "" : ` · ${c.locationVisibility === "STATE" ? c.state ?? "" : c.city ?? ""}`}{c.category ? ` · ${fmt.category(c.category)}` : ""}</p>
              <p className={s.small} style={{ whiteSpace: "pre-wrap" }}>{story}{(c.story ?? "").length > 280 ? "…" : ""}</p>
              <div className={s.card} style={{ padding: "12px 14px", background: "#fbf8f4" }}><strong className={s.small}><UiText>What CauseKind checked</UiText></strong><p className={`${s.small} ${s.muted}`}><UiText>[VERIFICATION EXPLANATION — exact wording to be confirmed]</UiText></p></div>
            </div>
            <div className={s.card} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, alignSelf: "start" }}>
              <p><strong style={{ fontSize: 20 }}>₹0</strong> <span className={`${s.muted} ${s.small}`}>{t("confirmedOf", { target: formatINR(c.targetAmount) })}</span></p>
              <div style={{ height: 8, borderRadius: 99, background: "#e7ddd2" }} aria-hidden="true" />
              <p className={`${s.small} ${s.muted}`}>{t("endsOn", { date: fmt.date(c.endDate) })}</p>
              <div aria-disabled="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, background: "#d9d2ca", color: "#4a3f37", fontWeight: 700 }}><UiText>Donate</UiText></div>
              <p className={`${s.small} ${s.muted}`}><UiText>Donations open once this page is approved and payment setup is complete.</UiText></p>
            </div>
          </div>
        </figure>
        <figure aria-label={ui("Mobile preview")} style={{ margin: 0, border: "1px solid #d6ccc1", borderRadius: 12, overflow: "hidden", background: "#faf8f5" }}>
          <div className={`${s.small} ${s.muted}`} style={{ height: 28, background: "#efe9e2", display: "flex", alignItems: "center", padding: "0 10px" }}><UiText>Mobile</UiText></div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {c.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.coverUrl} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6 }} />
              : <div style={{ aspectRatio: "16 / 9", borderRadius: 6, background: "#e4dbd0" }} />}
            <p className={s.serif} style={{ fontSize: 17, lineHeight: 1.25 }}>{c.title || ui("Untitled campaign")}</p>
            <p className={s.small}><strong>₹0</strong> <span className={s.muted}>{t("ofTarget", { target: formatINR(c.targetAmount) })}</span></p>
            <div aria-disabled="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, background: "#d9d2ca", color: "#4a3f37", fontWeight: 700 }}><UiText>Donate</UiText></div>
          </div>
        </figure>
      </div>
      <section className={s.card} style={{ padding: "20px 24px", maxWidth: 860 }} aria-labelledby="rd">
        <h2 id="rd" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}><UiText>Before this can go live</UiText></h2>
        {ck("ok", ui("Done", "checklist"), t("applicationApprovedRef", { reference: c.applicationReference ?? "" }))}
        {c.missing.length === 0 ? ck("ok", ui("Done", "checklist"), ui("Title, photo, story, target and privacy complete")) : ck("warn", ui("To do", "checklist"), t("stillNeeded", { items: c.missing.join(", ") }))}
        {c.hasMaterialChanges && ck("warn", ui("Reviewer will check", "checklist"), ui("Costs or target differ from your approved application"))}
        {c.publicEvidenceIds.length > 0 && ck("warn", ui("Reviewer will check", "checklist"), t("documentsShownPublicly", { count: c.publicEvidenceIds.length }))}
        {ck("off", ui("Not ready", "checklist"), t.rich("paymentSetupNotice", { strong: (chunks) => <strong>{chunks}</strong> }))}
      </section>
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div style={{ maxWidth: 860, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={back}><UiText>Back</UiText></button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={onCancel}><UiText>Cancel draft</UiText></button>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={submit} disabled={busy || c.missing.length > 0}>{busy ? ui("Submitting…") : ui("Submit for publication")}</button>
        </div>
      </div>
      <p className={`${s.muted} ${s.small}`}><UiText>Submitting locks this version for review. It does not publish it.</UiText></p>
    </>
  );
}
