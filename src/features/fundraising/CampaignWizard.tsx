"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fundraisingCampaigns, ApiError,
  type FundraisingCampaign, type FundraisingCampaignSave, type FundraisingCostItem,
  type LocationVisibility, type NameVisibility,
} from "@/lib/api";
import { CATEGORY_LABEL, CampaignStepper, Icon, SaveIndicator, formatDate, formatINR, type SaveState } from "./ui";
import { FieldInfo } from "./FieldInfo";
import s from "./fundraising.module.css";

type SetFn = (patch: FundraisingCampaignSave) => void;

/** F13–F17 — campaign draft wizard (canvas F13…F17). Autosaves like the application wizard. */
export function CampaignWizard({ initial, onSubmitted }: { initial: FundraisingCampaign; onSubmitted: (c: FundraisingCampaign) => void }) {
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

  const nav = (back: number | null, next: number | null, nextLabel = "Continue") => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: "1px solid #efe7de", paddingTop: 20 }}>
      {back === null ? <span /> : <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => go(back)}>Back</button>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={() => setConfirmCancel(true)}>Cancel draft</button>
        {next !== null && <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => go(next)}>{nextLabel}<Icon name="arrow" /></button>}
      </div>
    </div>
  );

  return (
    <>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topIn}`}>
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>Campaign · {c.status === "CHANGES_REQUESTED" ? "Changes requested" : "Draft"} · from approved application {c.applicationReference}</span>
          <SaveIndicator state={save} />
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={exit}>Save and exit</button>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        {c.status === "CHANGES_REQUESTED" && c.reviewerMessage ? (
          <div role="status" className={s.card} style={{ padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start", background: "#fdf3e1", borderColor: "#f0d9a8", maxWidth: 860 }}>
            <Icon name="edit" /><p><strong>The reviewer asked for changes:</strong> &ldquo;{c.reviewerMessage}&rdquo;</p>
          </div>
        ) : step === 0 && (
          <div role="status" className={s.card} style={{ padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderColor: "#b7d9c3", background: "#f4faf6", maxWidth: 860 }}>
            <span style={{ color: "#1d5b3a", marginTop: 2 }}><Icon name="check" /></span>
            <p><strong>Your application has been approved. Finish your fundraiser page and submit it for publication.</strong></p>
          </div>
        )}
        <CampaignStepper current={step} />
        {save === "error" && (
          <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
            <Icon name="alert" /><p style={{ flex: "1 1 400px" }}><strong>Your last changes haven&apos;t been saved.</strong> They&apos;re still on this screen — check your connection and try again.</p>
            <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void flush()}>Try again</button>
          </div>
        )}
        {step === 0 && <Basics c={c} set={set} setC={setC} nav={nav(null, 1)} />}
        {step === 1 && <Story c={c} set={set} nav={nav(0, 2)} />}
        {step === 2 && <Target c={c} set={set} nav={nav(1, 3)} />}
        {step === 3 && <Privacy c={c} set={set} nav={nav(2, 4, "Continue to preview")} />}
        {step === 4 && <Preview c={c} flush={flush} back={() => go(3)} onCancel={() => setConfirmCancel(true)} onSubmitted={onSubmitted} />}
      </main>
      {confirmCancel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(31,20,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="cd" className={s.card} style={{ padding: 28, maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 id="cd" className={s.serif} style={{ fontSize: 23 }}>Cancel this campaign draft?</h2>
            <p>{c.title || "Untitled campaign"} · Draft</p>
            <ul className={s.small} style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>It was never public and has no donations.</li><li>It will show as Cancelled on your dashboard.</li><li>Your application approval stays as it is.</li>
            </ul>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setConfirmCancel(false)}>Keep draft</button>
              <button type="button" className={s.btn} style={{ background: "#8f1d1d", color: "#fff" }} onClick={cancel}>Cancel draft</button>
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
function Basics({ c, set, setC, nav }: { c: FundraisingCampaign; set: SetFn; setC: (c: FundraisingCampaign) => void; nav: React.ReactNode }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(file: File) {
    setUploading(true); setErr(null);
    try { setC(await fundraisingCampaigns.uploadCover(c.id, file)); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Upload failed. Try again."); }
    finally { setUploading(false); }
  }
  return (
    <>
      <Heading title="Public basics" sub="This is what donors see first. We've carried over what you already told us." />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 860 }}>
        <div><label className={s.lbl} htmlFor="t">Campaign title <FieldInfo k="t" /></label><input id="t" className={s.in} maxLength={120} value={c.title ?? ""} onChange={(e) => set({ title: e.target.value })} /><p className={s.hint}>{(c.title ?? "").length} of 120 characters. Say who and what, plainly.</p></div>
        <div className={s.grid2}>
          <div><span className={s.lbl}>Category <FieldInfo k="cCat" /></span><p style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><span className={`${s.chip} ${s.cM}`}><Icon name="lock" />{c.category ? CATEGORY_LABEL[c.category] : "—"}</span><span className={`${s.muted} ${s.small}`}>Approved — can&apos;t change here</span></p></div>
          <div><label className={s.lbl} htmlFor="dn">Beneficiary name shown to donors <FieldInfo k="dn" /><span className={`${s.chip} ${s.cN}`}>From application</span></label><input id="dn" className={s.in} maxLength={80} value={c.beneficiaryDisplayName ?? ""} onChange={(e) => set({ beneficiaryDisplayName: e.target.value })} /><p className={s.hint}>Their legal name stays private. Change visibility in step 4.</p></div>
        </div>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="cv">
          <h2 id="cv" className={s.lbl} style={{ margin: 0 }}>Cover photo <FieldInfo k="cv" /></h2>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,360px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
            {c.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10 }} />
              : <div style={{ aspectRatio: "16 / 9", borderRadius: 10, background: "#e4dbd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5d52" }}>No photo yet</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className={`${s.btn} ${s.bs}`} style={{ alignSelf: "flex-start" }}>{uploading ? "Uploading…" : c.coverUrl ? "Replace" : "Choose photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>
              {err && <p role="alert" className={s.errText}><Icon name="alert" />{err}</p>}
              <div><label className={s.lbl} htmlFor="alt">Describe the photo for people who can&apos;t see it <span className={s.muted} style={{ fontWeight: 500 }}>(optional)</span> <FieldInfo k="alt" /></label><input id="alt" className={s.in} maxLength={300} value={c.coverAltText ?? ""} onChange={(e) => set({ coverAltText: e.target.value })} /></div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" checked={c.coverConsent} onChange={(e) => set({ coverConsent: e.target.checked })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span className={s.small}>I took this photo or have permission to use it, and everyone in it agrees to it being public.</span></label>
            </div>
          </div>
          <p className={s.hint} style={{ margin: 0 }}>Cover photos are chosen here, separately from your private documents. Your ID or reports are never offered as photos.</p>
        </section>
        {nav}
      </div>
    </>
  );
}

// F14 — C2 Story
function Story({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
  return (
    <>
      <Heading title="Tell the story" sub="Honest and specific beats dramatic — you don't need to share painful details." />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 32, alignItems: "start", maxWidth: 1120 }}>
        <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className={s.lbl} htmlFor="st">Your story <FieldInfo k="st" /></label>
            <p className={`${s.muted} ${s.small}`} style={{ marginBottom: 8 }}>Who needs help? What happened? What will the funds cover? What difference will support make? We&apos;ve started it from your application — edit freely.</p>
            <textarea id="st" className={s.in} rows={14} maxLength={5000} value={c.story ?? ""} onChange={(e) => set({ story: e.target.value })} style={{ resize: "vertical", lineHeight: 1.6 }} />
            <p className={s.hint}>{(c.story ?? "").length} of 5000 characters.</p>
          </div>
          {nav}
        </div>
        <aside className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Good to know</h2>
          <ul className={`${s.small} ${s.muted}`} style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Reviewers compare this with your approved application.</li>
            <li>Avoid phone numbers, addresses and hospital file numbers.</li>
            <li>You can post updates later, once it&apos;s live.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}

// F15 — C3 Target and duration
function Target({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));
  const rows: FundraisingCostItem[] = c.costItems.map((r) => ({ expense: r.expense, amount: r.amount, reference: r.reference }));
  const setRow = (i: number, amount: number | null) => {
    const next = rows.map((r, j) => (j === i ? { ...r, amount } : r));
    set({ costItems: next });
  };
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return (
    <>
      <Heading title="Target and end date" sub="Carried over from your approved application. Changes are allowed, but reviewers will check them." />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22, maxWidth: 860 }}>
        <section aria-labelledby="cb">
          <h2 id="cb" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Cost breakdown <FieldInfo k="ccb" /></h2>
          {c.costItems.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px 150px", gap: 12, alignItems: "center", padding: r.changed ? 12 : "12px 0", borderTop: "1px solid #efe7de", background: r.changed ? "#fffaf0" : undefined, borderRadius: r.changed ? 8 : 0 }}>
              <span>{r.expense}{r.approvedAmount != null && r.changed && <><br /><span className={`${s.small} ${s.muted}`}>Approved: {formatINR(r.approvedAmount)}</span></>}</span>
              <input className={`${s.in} ${s.tabular}`} style={{ textAlign: "right" }} aria-label={`${r.expense} amount`} inputMode="decimal" value={r.amount ?? ""} onChange={(e) => setRow(i, num(e.target.value))} />
              {r.changed ? <span className={`${s.chip} ${s.cW}`} style={{ justifySelf: "end" }}><Icon name="edit" />Changed</span> : <span className={`${s.chip} ${s.cM}`} style={{ justifySelf: "end" }}>As approved</span>}
            </div>
          ))}
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #efe7de", fontWeight: 700 }}><span>Total</span><span>{formatINR(c.totalCosts)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Other funding</span><span>− {formatINR(c.otherHelp)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 700 }}><span>Remaining gap</span><span>{formatINR(c.remainingGap)}</span></div>
        </section>
        {c.hasMaterialChanges && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000", flexDirection: "column" }}>
            <p className={s.small}><strong>This differs from what was approved.</strong> A reviewer will look at the change when you submit. Add a short reason.</p>
            <div style={{ width: "100%" }}><label className={s.lbl} htmlFor="why">Reason for the change <FieldInfo k="why" /></label><input id="why" className={s.in} maxLength={2000} value={c.changeReason ?? ""} onChange={(e) => set({ changeReason: e.target.value })} /></div>
          </div>
        )}
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="tg">Target (₹) <FieldInfo k="tg" /></label><input id="tg" className={`${s.in} ${s.tabular}`} inputMode="decimal" value={c.targetAmount ?? ""} onChange={(e) => set({ targetAmount: num(e.target.value) })} /><p className={s.hint}>Approved: {formatINR(c.approvedTarget)}. Minimum and maximum targets: [TO BE DEFINED].</p></div>
          <div><label className={s.lbl} htmlFor="ed">End date <FieldInfo k="ed" /></label><input id="ed" type="date" className={s.in} min={tomorrow} value={c.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || null })} /><p className={s.hint}>Allowed duration: [TO BE DEFINED].</p></div>
        </div>
        {nav}
      </div>
    </>
  );
}

// F16 — C4 Public evidence and privacy
function Privacy({ c, set, nav }: { c: FundraisingCampaign; set: SetFn; nav: React.ReactNode }) {
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
  const name: [NameVisibility, string][] = [["FULL", "Full"], ["FIRST_NAME", "First name"], ["HIDDEN", "Hidden"]];
  const loc: [LocationVisibility, string][] = [["CITY", "City"], ["STATE", "State"], ["HIDDEN", "Hidden"]];
  return (
    <>
      <Heading title="What donors can see" sub="Choose each item. Your application documents stay private unless you pick one below for review." />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 28, alignItems: "start", maxWidth: 1120 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className={s.card} style={{ padding: "8px 24px 16px" }} aria-labelledby="vis">
            <h2 id="vis" style={{ fontSize: 16, fontWeight: 700, paddingTop: 14 }}>Names and place <FieldInfo k="vis" /></h2>
            <div style={row}><div><strong>Beneficiary name</strong><p className={`${s.small} ${s.muted}`}>Shown as &ldquo;{c.beneficiaryDisplayName ?? "—"}&rdquo;</p></div>{seg("Beneficiary name", c.beneficiaryNameVisibility, name, (v) => set({ beneficiaryNameVisibility: v }))}</div>
            <div style={row}><div><strong>Organiser name</strong><p className={`${s.small} ${s.muted}`}>{c.organiserName}</p></div>{seg("Organiser name", c.organiserNameVisibility, name.slice(0, 2), (v) => set({ organiserNameVisibility: v }))}</div>
            <div style={row}><div><strong>Location</strong><p className={`${s.small} ${s.muted}`}>Your address is never shown</p></div>{seg("Location", c.locationVisibility, loc, (v) => set({ locationVisibility: v }))}</div>
          </section>
          <section className={s.card} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="pe">
            <h2 id="pe" style={{ fontSize: 16, fontWeight: 700 }}>Supporting documents donors can see <FieldInfo k="pe" /><span className={s.muted} style={{ fontWeight: 500 }}>(optional)</span></h2>
            <p className={`${s.small} ${s.muted}`}>Picked documents are reviewed and may be redacted before anyone sees them. ID and consent documents can&apos;t be picked.</p>
            {c.selectableEvidence.length === 0 && <p className={`${s.small} ${s.muted}`}>No documents from your application can be shown.</p>}
            {c.selectableEvidence.map((e) => {
              const on = c.publicEvidenceIds.includes(e.evidenceId);
              return (
                <label key={e.evidenceId} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, flexWrap: "wrap" }}>
                  <input type="checkbox" checked={on} onChange={(ev) => toggle(e.evidenceId, ev.target.checked)} style={{ width: 20, height: 20, accentColor: "#1e3a60" }} />
                  <span style={{ flex: 1 }}><strong>{e.type.replace(/_/g, " ").toLowerCase()}</strong><br /><span className={`${s.small} ${s.muted}`}>{e.fileName ?? "Document"}</span></span>
                  {on ? <span className={`${s.chip} ${s.cW}`}>Needs review</span> : <span className={`${s.chip} ${s.cM}`}>Private</span>}
                </label>
              );
            })}
          </section>
          {nav}
        </div>
        <aside className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="sum">
          <h2 id="sum" style={{ fontSize: 15, fontWeight: 700 }}>Visibility summary</h2>
          <p className={s.small}><span className={`${s.chip} ${s.cN}`}>Public</span> {c.beneficiaryNameVisibility === "HIDDEN" ? "Beneficiary hidden" : `"${c.beneficiaryDisplayName ?? "—"}"`}, {c.organiserNameVisibility === "FIRST_NAME" ? c.organiserName.split(" ")[0] : c.organiserName}{c.locationVisibility === "HIDDEN" ? "" : `, ${c.locationVisibility === "STATE" ? c.state ?? "state" : c.city ?? "city"}`}</p>
          <p className={s.small}><span className={`${s.chip} ${s.cN}`}>Public</span> Cover photo</p>
          {c.publicEvidenceIds.length > 0 && <p className={s.small}><span className={`${s.chip} ${s.cW}`}>After review</span> {c.publicEvidenceIds.length} document(s)</p>}
          <p className={s.small}><span className={`${s.chip} ${s.cM}`}>Private</span> Legal name, address, ID, consent, other documents</p>
        </aside>
      </div>
    </>
  );
}

// F17 — C5 Preview and submit
function Preview({ c, flush, back, onCancel, onSubmitted }: {
  c: FundraisingCampaign; flush: () => Promise<boolean>; back: () => void; onCancel: () => void; onSubmitted: (c: FundraisingCampaign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setError(null);
    if (!(await flush())) { setBusy(false); setError("Your last changes haven't saved yet. Try again before submitting."); return; }
    try { onSubmitted(await fundraisingCampaigns.submit(c.id)); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Submitting failed. Try again."); setBusy(false); }
  }
  const ck = (tone: "ok" | "warn" | "off", label: string, text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #efe7de" }}>
      <span className={`${s.chip} ${tone === "ok" ? s.cOk : tone === "warn" ? s.cW : s.cM}`}>{label}</span><span>{text}</span>
    </div>
  );
  const story = (c.story ?? "").slice(0, 280);
  return (
    <>
      <Heading title="Preview your page" sub="This is exactly what donors will see once it's published." />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 20, alignItems: "start" }}>
        <figure aria-label="Desktop preview" style={{ margin: 0, border: "1px solid #d6ccc1", borderRadius: 12, overflow: "hidden", background: "#faf8f5" }}>
          <div className={`${s.small} ${s.muted}`} style={{ height: 28, background: "#efe9e2", display: "flex", alignItems: "center", padding: "0 10px" }}>Desktop</div>
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {c.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ aspectRatio: "16 / 9", borderRadius: 8, background: "#e4dbd0" }} />}
              <h2 className={s.serif} style={{ fontSize: 24 }}>{c.title || "Untitled campaign"}</h2>
              <p className={`${s.small} ${s.muted}`}>Organised by {c.organiserNameVisibility === "FIRST_NAME" ? c.organiserName.split(" ")[0] : c.organiserName}{c.locationVisibility === "HIDDEN" ? "" : ` · ${c.locationVisibility === "STATE" ? c.state ?? "" : c.city ?? ""}`}{c.category ? ` · ${CATEGORY_LABEL[c.category]}` : ""}</p>
              <p className={s.small} style={{ whiteSpace: "pre-wrap" }}>{story}{(c.story ?? "").length > 280 ? "…" : ""}</p>
              <div className={s.card} style={{ padding: "12px 14px", background: "#fbf8f4" }}><strong className={s.small}>What CauseKind checked</strong><p className={`${s.small} ${s.muted}`}>[VERIFICATION EXPLANATION — exact wording to be confirmed]</p></div>
            </div>
            <div className={s.card} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, alignSelf: "start" }}>
              <p><strong style={{ fontSize: 20 }}>₹0</strong> <span className={`${s.muted} ${s.small}`}>confirmed of {formatINR(c.targetAmount)}</span></p>
              <div style={{ height: 8, borderRadius: 99, background: "#e7ddd2" }} aria-hidden="true" />
              <p className={`${s.small} ${s.muted}`}>Ends {formatDate(c.endDate)}</p>
              <div aria-disabled="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, background: "#d9d2ca", color: "#4a3f37", fontWeight: 700 }}>Donate</div>
              <p className={`${s.small} ${s.muted}`}>Donations open once this page is approved and payment setup is complete.</p>
            </div>
          </div>
        </figure>
        <figure aria-label="Mobile preview" style={{ margin: 0, border: "1px solid #d6ccc1", borderRadius: 12, overflow: "hidden", background: "#faf8f5" }}>
          <div className={`${s.small} ${s.muted}`} style={{ height: 28, background: "#efe9e2", display: "flex", alignItems: "center", padding: "0 10px" }}>Mobile</div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {c.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.coverUrl} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6 }} />
              : <div style={{ aspectRatio: "16 / 9", borderRadius: 6, background: "#e4dbd0" }} />}
            <p className={s.serif} style={{ fontSize: 17, lineHeight: 1.25 }}>{c.title || "Untitled campaign"}</p>
            <p className={s.small}><strong>₹0</strong> <span className={s.muted}>of {formatINR(c.targetAmount)}</span></p>
            <div aria-disabled="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10, background: "#d9d2ca", color: "#4a3f37", fontWeight: 700 }}>Donate</div>
          </div>
        </figure>
      </div>
      <section className={s.card} style={{ padding: "20px 24px", maxWidth: 860 }} aria-labelledby="rd">
        <h2 id="rd" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Before this can go live</h2>
        {ck("ok", "Done", <>Application approved ({c.applicationReference})</>)}
        {c.missing.length === 0 ? ck("ok", "Done", "Title, photo, story, target and privacy complete") : ck("warn", "To do", <>Still needed: {c.missing.join(", ")}</>)}
        {c.hasMaterialChanges && ck("warn", "Reviewer will check", "Costs or target differ from your approved application")}
        {c.publicEvidenceIds.length > 0 && ck("warn", "Reviewer will check", `${c.publicEvidenceIds.length} document(s) shown publicly, with redaction`)}
        {ck("off", "Not ready", <><strong>Payment setup requirements to be defined.</strong> You can still submit; the page can be approved but won&apos;t take donations until this is done.</>)}
      </section>
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div style={{ maxWidth: 860, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={back}>Back</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={onCancel}>Cancel draft</button>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={submit} disabled={busy || c.missing.length > 0}>{busy ? "Submitting…" : "Submit for publication"}</button>
        </div>
      </div>
      <p className={`${s.muted} ${s.small}`}>Submitting locks this version for review. It does not publish it.</p>
    </>
  );
}
