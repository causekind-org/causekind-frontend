"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import {
  fundraising, getDoneeNeedProfile, getProfile, ApiError,
  type DoneeNeedProfile, type FundraisingApplication, type FundraisingCategory,
  type FundraisingCostItem, type FundraisingEvidence, type FundraisingEvidenceType, type FundraisingSave,
} from "@/lib/api";
import { useFundraisingLabels, Icon, type SaveState, SaveIndicator, Stepper, formatINR } from "./ui";
import { FieldInfo } from "./FieldInfo";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/** F03–F07 — the five-step application wizard (canvas F03…F07). Autosaves. */
/** Visible labels for stored English choice values (age range, relationship). */
function useChoiceLabel() {
  const ui = useUiText();
  return (v: string): string => ({
    "Under 18": ui("Under 18"), "18–39": ui("18–39"), "40–59": ui("40–59"), "60 or over": ui("60 or over"),
    Parent: ui("Parent"), Child: ui("Child"), Spouse: ui("Spouse"), Sibling: ui("Sibling"),
    "Other relative": ui("Other relative"), Guardian: ui("Guardian"), Other: ui("Other", "relationship"),
  } as Record<string, string>)[v] ?? v;
}

function useEvidenceLabel() {
  const ui = useUiText();
  return (type: FundraisingEvidenceType): string => ({
    ORGANISER_ID: ui("Your identity"), ADDRESS_PROOF: ui("Address proof"), MEDICAL_REPORT: ui("Medical report"),
    TREATMENT_ESTIMATE: ui("Treatment estimate"), ENROLMENT_PROOF: ui("Enrolment or admission letter"), FEE_STATEMENT: ui("Fee statement"),
    EVENT_EVIDENCE: ui("Evidence of what happened"), CONSENT: ui("Consent"), OTHER: ui("Anything else"),
  } as Record<FundraisingEvidenceType, string>)[type] ?? EVIDENCE_LABEL[type];
}

function useEvidenceHint() {
  const ui = useUiText();
  return (type: FundraisingEvidenceType): string | undefined => ({
    ORGANISER_ID: ui("A government ID in your name."),
    MEDICAL_REPORT: ui("The doctor's note or report for this condition — not a full medical history."),
    TREATMENT_ESTIMATE: ui("From the hospital, showing the costs in your breakdown."),
    ENROLMENT_PROOF: ui("Shows the institution and the course."),
    FEE_STATEMENT: ui("Shows the fee amount and the period it covers."),
    CONSENT: ui("A signed note that they agree to this fundraiser. What counts is still being finalised."),
    OTHER: ui("Optional documents don't speed up review."),
  } as Partial<Record<FundraisingEvidenceType, string>>)[type];
}

export function Wizard({ initial, onLeftDraft }: { initial: FundraisingApplication; onLeftDraft: (a: FundraisingApplication) => void }) {
  const t = useTranslations("fundraiserFlow");
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<SaveState>("saved");
  const pending = useRef<FundraisingSave>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profile, setProfile] = useState<DoneeNeedProfile | null>(null);

  useEffect(() => { getDoneeNeedProfile().then(setProfile).catch(() => {}); }, []);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const body = pending.current;
    if (Object.keys(body).length === 0) return true;
    pending.current = {};
    setSave("saving");
    try {
      // A cleared amount is null; name it in `clear`, or the server keeps the old value.
      const clear = CLEARABLE.filter((k) => k in body && body[k] == null);
      const next = await fundraising.save(app.id, clear.length ? { ...body, clear } : body);
      setApp((cur) => ({ ...next, ...pendingOverlay(cur, pending.current) }));
      setSave("saved");
      return true;
    } catch {
      // Keep the edits on screen and queue them again — never claim they saved.
      pending.current = { ...body, ...pending.current };
      setSave("error");
      return false;
    }
  }, [app.id]);

  /** Local edit + debounced autosave. */
  const set = useCallback((patch: FundraisingSave) => {
    setApp((cur) => ({ ...cur, ...(patch as Partial<FundraisingApplication>) }));
    pending.current = { ...pending.current, ...patch };
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function go(to: number) {
    await flush();
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  async function saveAndExit() {
    await flush();
    router.push("/fundraising");
  }

  return (
    <>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topIn}`}>
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>{t("applicationDraft", { reference: app.reference })}</span>
          <SaveIndicator state={save} />
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={saveAndExit}><UiText>Save and exit</UiText></button>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        <Stepper current={step} />
        {save === "error" && (
          <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
            <Icon name="alert" />
            <p style={{ flex: "1 1 400px" }}><strong><UiText>Your last changes haven&apos;t been saved.</UiText></strong> <UiText>They&apos;re still on this screen — don&apos;t close it. Check your connection and try again.</UiText></p>
            <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void flush()}><UiText>Try again</UiText></button>
          </div>
        )}
        {step === 0 && <AboutYou profile={profile} onNext={() => go(1)} />}
        {step === 1 && <WhoNeedsHelp app={app} set={set} onBack={() => go(0)} onNext={() => go(2)} />}
        {step === 2 && <TheNeed app={app} set={set} onBack={() => go(1)} onNext={() => go(3)} />}
        {step === 3 && <Evidence app={app} setApp={setApp} profile={profile} onBack={() => go(2)} onNext={() => go(4)} />}
        {step === 4 && <Review app={app} set={set} flush={flush} goTo={go} onSubmitted={onLeftDraft} />}
      </main>
    </>
  );
}

function pendingOverlay(cur: FundraisingApplication, p: FundraisingSave): Partial<FundraisingApplication> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(p)) out[k] = (cur as Record<string, unknown>)[k];
  return out as Partial<FundraisingApplication>;
}

type SetFn = (patch: FundraisingSave) => void;

const CLEARABLE = ["requestedAmount", "insuranceAmount", "ownContribution", "grantsAmount", "otherFundraisingAmount"] as const;

function Nav({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  const ui = useUiText();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: "1px solid #efe7de", paddingTop: 20 }}>
      {onBack ? <button type="button" className={`${s.btn} ${s.bs}`} onClick={onBack}><UiText>Back</UiText></button> : <Link href="/fundraising/start" className={`${s.btn} ${s.bs}`}><UiText>Back</UiText></Link>}
      <button type="button" className={`${s.btn} ${s.bp}`} onClick={onNext}>{nextLabel ?? ui("Continue")}<Icon name="arrow" /></button>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 760 }}>
      <h1 className={s.serif} style={{ fontSize: 32 }}>{title}</h1>
      <p className={s.muted}>{sub}</p>
    </div>
  );
}

// F03 — A1 About you. Read-only here by owner decision (2026-10-26): these live on
// the account and donee profile and are changed only there. Name and phone come
// from useAuth, which profile saves keep current (updateUser); age and address are
// re-fetched each time the form opens, so profile edits show up on return.
function AboutYou({ profile, onNext }: { profile: DoneeNeedProfile | null; onNext: () => void }) {
  const ui = useUiText();
  const { user } = useAuth();
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => { getProfile().then((p) => setCity(p.city)).catch(() => {}); }, []);
  // Landmark is optional on the donee profile; the account city always exists.
  const address = profile?.details?.addressLandmark?.trim() || city || "";
  return (
    <>
      <Heading title={ui("About you")} sub={ui("These details come from your profile and can't be changed here. If anything is wrong, update it in your profile — the change shows here when you come back.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="nm"><UiText>Legal name</UiText> <FieldInfo localize k="nm" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="nm" className={s.in} value={user?.fullName ?? ""} readOnly /><p className={s.hint}><UiText>As it appears on your government ID.</UiText></p></div>
          <div><label className={s.lbl} htmlFor="age"><UiText>Age</UiText> <FieldInfo localize k="age" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="age" className={s.in} value={profile?.details?.age ?? ""} readOnly /></div>
        </div>
        <div><label className={s.lbl} htmlFor="ad"><UiText>Current address</UiText> <FieldInfo localize k="ad" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="ad" className={s.in} value={address} placeholder={ui("Not in your profile yet")} readOnly />{address
            ? <p className={s.hint}><UiText>Changing your address may mean we ask for a new residence proof.</UiText></p>
            : <p className={s.hint}><UiText>Not in your profile yet.</UiText> <Link href="/profile/need-details"><UiText>Add your address</UiText></Link> <UiText>— your application is saved.</UiText></p>}</div>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="em"><UiText>Email</UiText> <FieldInfo localize k="em" /><span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Verified</UiText></span></label><input id="em" className={s.in} value={user?.email ?? ""} readOnly style={{ background: "#f7f3ee" }} /><p className={s.hint}><UiText>Verified with a code when you signed up.</UiText></p></div>
          <div><label className={s.lbl} htmlFor="ph"><UiText>Phone</UiText> <FieldInfo localize k="ph" /><span className={`${s.chip} ${s.cM}`}><Icon name="alert" /><UiText>Not verified</UiText></span></label><input id="ph" className={s.in} value={user?.phone ?? ""} placeholder={ui("Not added yet")} readOnly /><p className={s.hint}><UiText>We may ask you to verify this later.</UiText></p></div>
        </div>
        <div className={`${s.muted} ${s.small}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p><UiText>Something wrong or missing? Change it in your profile, then come back — your application is saved.</UiText></p>
          <p><Link href="/profile"><UiText>Change your name or phone</UiText></Link> · <Link href="/profile/need-details"><UiText>Change your age or address</UiText></Link></p>
        </div>
        <Nav onNext={onNext} />
      </div>
    </>
  );
}

// F04 — A2 Who needs help
function WhoNeedsHelp({ app, set, onBack, onNext }: { app: FundraisingApplication; set: SetFn; onBack: () => void; onNext: () => void }) {
  const choiceLabel = useChoiceLabel();
  const ui = useUiText();
  const opt = (sel: boolean) => ({
    display: "flex", gap: 12, alignItems: "flex-start", padding: sel ? 15 : 16, borderRadius: 10, cursor: "pointer",
    border: sel ? "2px solid #1e3a60" : "1px solid #cfc3b6", background: sel ? "#f5f8fc" : "#fff",
  }) as const;
  return (
    <>
      <Heading title={ui("Who needs help?")} sub={ui("You can organise a fundraiser for yourself or for someone you are helping.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 820 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <legend className={s.lbl} style={{ marginBottom: 10 }}><UiText>This fundraiser is for</UiText> <FieldInfo localize k="forWhom" /></legend>
          <div className={s.grid2} style={{ gap: 12 }}>
            <label style={opt(app.forSelf)}><input type="radio" name="who" checked={app.forSelf} onChange={() => set({ forSelf: true })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span><strong><UiText>Myself</UiText></strong><br /><span className={`${s.muted} ${s.small}`}><UiText>I am the person who needs help.</UiText></span></span></label>
            <label style={opt(!app.forSelf)}><input type="radio" name="who" checked={!app.forSelf} onChange={() => set({ forSelf: false })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span><strong><UiText>Someone else</UiText></strong><br /><span className={`${s.muted} ${s.small}`}><UiText>A family member or someone I support.</UiText></span></span></label>
          </div>
          <p className={s.hint}><UiText>Organising for a child or another adult may not be available at launch. We will tell you before you go further.</UiText></p>
        </fieldset>
        {!app.forSelf && (
          <>
            <div className={s.grid2}>
              <div><label className={s.lbl} htmlFor="bn"><UiText>Their full legal name</UiText> <FieldInfo localize k="bn" /><span className={`${s.chip} ${s.cM}`}><Icon name="lock" /><UiText>Private</UiText></span></label><input id="bn" className={s.in} value={app.beneficiaryLegalName ?? ""} onChange={(e) => set({ beneficiaryLegalName: e.target.value })} maxLength={160} /><p className={s.hint}><UiText>Only reviewers see this.</UiText></p></div>
              <div><label className={s.lbl} htmlFor="pn"><UiText>Name shown to donors</UiText> <FieldInfo localize k="pn" /></label><input id="pn" className={s.in} value={app.beneficiaryDisplayName ?? ""} onChange={(e) => set({ beneficiaryDisplayName: e.target.value })} maxLength={80} /><p className={s.hint}><UiText>You can use a first name only. You can change this when you prepare the campaign.</UiText></p></div>
            </div>
            <div className={s.grid2}>
              <div><label className={s.lbl} htmlFor="ag"><UiText>Their age</UiText> <FieldInfo localize k="ag" /></label>
                <select id="ag" className={s.in} value={app.beneficiaryAgeRange ?? ""} onChange={(e) => set({ beneficiaryAgeRange: e.target.value })}>
                  <option value=""><UiText>Choose</UiText></option>{["Under 18", "18–39", "40–59", "60 or over"].map((o) => <option key={o} value={o}>{choiceLabel(o)}</option>)}
                </select></div>
              <div><label className={s.lbl} htmlFor="rl"><UiText>Your relationship to them</UiText> <FieldInfo localize k="rl" /></label>
                <select id="rl" className={s.in} value={app.relationship ?? ""} onChange={(e) => set({ relationship: e.target.value })}>
                  <option value=""><UiText>Choose</UiText></option>{["Parent", "Child", "Spouse", "Sibling", "Other relative", "Guardian", "Other"].map((o) => <option key={o} value={o}>{choiceLabel(o)}</option>)}
                </select></div>
            </div>
            <div><label className={s.lbl} htmlFor="au"><UiText>Why are you the right person to organise this?</UiText> <FieldInfo localize k="au" /></label><textarea id="au" className={s.in} rows={3} value={app.authorityExplanation ?? ""} onChange={(e) => set({ authorityExplanation: e.target.value })} maxLength={4000} style={{ resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#eaf0f8" }}>
              <span style={{ color: "#1e3a60", marginTop: 2 }}><Icon name="file" /></span>
              <p className={s.small}><strong><UiText>We&apos;ll ask for their consent in the Evidence step.</UiText></strong> <UiText>Because you are organising for someone else, we need a signed consent or a short note from them. What counts is still being finalised.</UiText></p>
            </div>
          </>
        )}
        <p className={`${s.muted} ${s.small}`} style={{ borderTop: "1px solid #efe7de", paddingTop: 16 }}><UiText>We are not asking where donated money goes. That is decided later and the organiser and the person receiving the money do not have to be the same.</UiText></p>
        <Nav onBack={onBack} onNext={onNext} />
      </div>
    </>
  );
}

// F05 — A3 The need and funding gap
const CATEGORIES: FundraisingCategory[] = ["MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];

function TheNeed({ app, set, onBack, onNext }: { app: FundraisingApplication; set: SetFn; onBack: () => void; onNext: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const [tried, setTried] = useState(false);
  // Which categories are open is the backend's fundraising.categories setting.
  const [OPEN, setOpen] = useState<FundraisingCategory[]>([]);
  useEffect(() => { fundraising.categories().then(setOpen).catch(() => setOpen([])); }, []);
  const costs = app.costItems.length ? app.costItems : [{ expense: "", amount: null, reference: null }];
  const setCosts = (next: FundraisingCostItem[]) => set({ costItems: next.filter((c) => c.expense.trim() !== "" || c.amount != null) });
  const edit = (i: number, patch: Partial<FundraisingCostItem>) => setCosts(costs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));
  const total = costs.reduce((t, c) => t + (c.amount ?? 0), 0);
  const help = (app.insuranceAmount ?? 0) + (app.ownContribution ?? 0) + (app.grantsAmount ?? 0) + (app.otherFundraisingAmount ?? 0);
  const gap = total - help;
  const mismatch = app.requestedAmount != null && total > 0 && Math.abs(app.requestedAmount - gap) > 0.5;
  // A row in use needs an amount and a supporting reference (owner, 2026-10-26).
  const used = (c: FundraisingCostItem) => c.expense.trim() !== "" || c.amount != null;
  const amountMissing = costs.map((c) => used(c) && c.amount == null);
  const refMissing = costs.map((c) => used(c) && !(c.reference ?? "").trim());
  const rowErrors = costs.map((_, i) => amountMissing[i] || refMissing[i]);
  const shownAmount = tried ? amountMissing : costs.map(() => false);
  const shownRef = tried ? refMissing : costs.map(() => false);
  const errors = tried ? rowErrors.map((e, i) => (e ? i : -1)).filter((i) => i >= 0) : [];
  const pill = (sel: boolean, open: boolean) => ({
    display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 16px", borderRadius: 999, fontWeight: 600, fontSize: 14,
    border: sel ? "2px solid #1e3a60" : "1px solid #cfc3b6", color: sel ? "#1e3a60" : open ? "#1f140c" : "#9a8b7f",
    background: sel ? "#f5f8fc" : "#fff", cursor: open ? "pointer" : "not-allowed",
  }) as const;

  return (
    <>
      <Heading title={ui("What do you need money for?")} sub={ui("Tell us in simple words. You can write the full story later.")} />
      {errors.length > 0 && (
        <div role="alert" style={{ maxWidth: 820, border: "2px solid #b42318", borderRadius: 12, background: "#fff", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <strong style={{ color: "#8f1d1d" }}>{t("thingsToFix", { count: errors.length })}</strong>
          {errors.map((i) => amountMissing[i]
            ? <a key={i} href={`#amt${i}`}>{t("costRowMissing", { n: i + 1 })}</a>
            : <a key={i} href={`#ref${i}`}>{t("costRowReference", { n: i + 1 })}</a>)}
        </div>
      )}
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 26, maxWidth: 820 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={s.lbl}><UiText>What is the money for?</UiText> <FieldInfo localize k="cat" /></legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => {
              const open = OPEN.includes(c);
              return <button key={c} type="button" aria-pressed={app.category === c} disabled={!open} style={pill(app.category === c, open)} onClick={() => set({ category: c })}>{fmt.category(c)}</button>;
            })}
          </div>
          <p className={s.hint}><UiText>Some choices are not open yet.</UiText></p>
        </fieldset>
        <div><label className={s.lbl} htmlFor="wh"><UiText>What happened? What help do you need?</UiText> <FieldInfo localize k="wh" /></label><textarea id="wh" className={s.in} rows={4} value={app.whatHappened ?? ""} onChange={(e) => set({ whatHappened: e.target.value })} maxLength={8000} style={{ resize: "vertical" }} /></div>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="ur"><UiText>By which date do you need the money?</UiText> <FieldInfo localize k="ur" /></label>
            {/* Stored as an ISO date (yyyy-mm-dd) in the urgency field. */}
            <input id="ur" type="date" className={s.in} min={new Date().toISOString().slice(0, 10)}
              value={/^\d{4}-\d{2}-\d{2}$/.test(app.urgency ?? "") ? app.urgency! : ""}
              onChange={(e) => set({ urgency: e.target.value })} />
            <p className={s.hint}><UiText>For example, the day of the operation, or the last day to pay the fees.</UiText></p></div>
          {/* The amount comes first (owner, 2026-10-26); the breakdown below explains it. */}
          <div><label className={s.lbl} htmlFor="ask"><UiText>How much money do you need? (₹)</UiText> <FieldInfo localize k="ask" /></label><input id="ask" className={`${s.in} ${s.tabular}`} inputMode="decimal" value={app.requestedAmount ?? ""} onChange={(e) => set({ requestedAmount: num(e.target.value) })} /></div>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="cbh">
          <h2 id="cbh" style={{ fontSize: 17, fontWeight: 700 }}><UiText>What will the money pay for?</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(you can skip this)</UiText></span> <FieldInfo localize k="costs" /></h2>
          <div aria-hidden="true" className={`${s.muted} ${s.small}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, fontWeight: 600 }}>
            <span><UiText>What is it?</UiText></span><span style={{ textAlign: "right" }}><UiText>How much? (₹)</UiText></span><span><UiText>Bill or receipt number</UiText> <FieldInfo localize k="ref" /></span><span />
          </div>
          {costs.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, alignItems: "start" }}>
              <input className={s.in} aria-label={`Expense ${i + 1}`} value={c.expense} onChange={(e) => edit(i, { expense: e.target.value })} maxLength={160} />
              <div>
                <input id={`amt${i}`} className={`${s.in} ${s.tabular}`} style={{ textAlign: "right" }} aria-label={`Amount ${i + 1}`} inputMode="decimal" value={c.amount ?? ""} aria-invalid={shownAmount[i] || undefined} aria-describedby={shownAmount[i] ? `e${i}` : undefined} onChange={(e) => edit(i, { amount: num(e.target.value) })} />
                {shownAmount[i] && <p id={`e${i}`} className={s.errText}><Icon name="alert" /><UiText>Write the amount</UiText></p>}
              </div>
              <div>
                <input id={`ref${i}`} className={s.in} aria-label={`Reference ${i + 1}`} placeholder={ui("Number on the bill")} value={c.reference ?? ""} aria-invalid={shownRef[i] || undefined} aria-describedby={shownRef[i] ? `r${i}` : undefined} onChange={(e) => edit(i, { reference: e.target.value })} maxLength={160} />
                {shownRef[i] && <p id={`r${i}`} className={s.errText}><Icon name="alert" /><UiText>Write the bill number</UiText></p>}
              </div>
              <button type="button" className={`${s.btn} ${s.bq}`} style={{ padding: 0 }} aria-label={t("removeRow", { n: i + 1 })} onClick={() => setCosts(costs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => setCosts([...costs, { expense: ui("New item"), amount: null, reference: null }])}><UiText>+ Add one more thing</UiText></button></div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="oh">
          <h2 id="oh" style={{ fontSize: 17, fontWeight: 700 }}><UiText>Money you already have, or will get</UiText> <FieldInfo localize k="help" /></h2>
          <div className={s.grid2}>
            {([["insuranceAmount", ui("From insurance")], ["ownContribution", ui("From you or your family")], ["grantsAmount", ui("From government schemes or grants")], ["otherFundraisingAmount", ui("From other fundraising")]] as const).map(([k, label]) => (
              <div key={k}><label className={s.lbl} htmlFor={k}>{label} <FieldInfo localize k={k} /></label><input id={k} className={`${s.in} ${s.tabular}`} inputMode="decimal" value={app[k] ?? ""} onChange={(e) => set({ [k]: num(e.target.value) })} /></div>
            ))}
          </div>
        </section>

        <section className={s.card} style={{ background: "#fbf8f4", padding: "18px 20px" }} aria-labelledby="gap">
          <h2 id="gap" className={s.sec} style={{ marginBottom: 6 }}><UiText>Money still needed</UiText></h2>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span><UiText>Total cost</UiText></span><span>{formatINR(total)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span><UiText>Money you already have</UiText></span><span>− {formatINR(help)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #e7ddd2", fontWeight: 700 }}><span><UiText>Still needed</UiText></span><span>{formatINR(gap)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span><UiText>Money you asked for</UiText></span><span>{formatINR(app.requestedAmount ?? 0)}</span></div>
          {mismatch && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "#fdf3e1", color: "#5c3800", flexDirection: "column" }}>
              <p className={s.small}><strong><UiText>The numbers do not match.</UiText></strong> <UiText>The money you asked for is not the same as the money still needed. Maybe something is missing in the list above. Add it, or tell us why in one line.</UiText></p>
              <input className={s.in} aria-label={ui("Why is it different?")} placeholder={ui("Why is it different?")} value={app.amountDifferenceReason ?? ""} onChange={(e) => set({ amountDifferenceReason: e.target.value })} />
            </div>
          )}
        </section>
        <Nav onBack={onBack} onNext={() => { setTried(true); if (!rowErrors.some(Boolean)) onNext(); }} />
      </div>
    </>
  );
}

// F06 — A4 Evidence
const EVIDENCE_LABEL: Record<FundraisingEvidenceType, string> = {
  ORGANISER_ID: "Your identity", ADDRESS_PROOF: "Address proof", MEDICAL_REPORT: "Medical report",
  TREATMENT_ESTIMATE: "Treatment estimate", ENROLMENT_PROOF: "Enrolment or admission letter", FEE_STATEMENT: "Fee statement",
  EVENT_EVIDENCE: "Evidence of what happened", CONSENT: "Consent", OTHER: "Anything else",
};
const EVIDENCE_HINT: Partial<Record<FundraisingEvidenceType, string>> = {
  ORGANISER_ID: "A government ID in your name.",
  MEDICAL_REPORT: "The doctor's note or report for this condition — not a full medical history.",
  TREATMENT_ESTIMATE: "From the hospital, showing the costs in your breakdown.",
  ENROLMENT_PROOF: "Shows the institution and the course.",
  FEE_STATEMENT: "Shows the fee amount and the period it covers.",
  CONSENT: "A signed note that they agree to this fundraiser. What counts is still being finalised.",
  OTHER: "Optional documents don't speed up review.",
};

function groupsFor(app: FundraisingApplication): FundraisingEvidenceType[] {
  const g: FundraisingEvidenceType[] = ["ORGANISER_ID"];
  if (app.category === "MEDICAL") g.push("MEDICAL_REPORT", "TREATMENT_ESTIMATE");
  if (app.category === "EDUCATION") g.push("ENROLMENT_PROOF", "FEE_STATEMENT");
  if (app.category === "EMERGENCY_HOUSEHOLD") g.push("EVENT_EVIDENCE");
  if (!app.forSelf) g.push("CONSENT");
  g.push("OTHER");
  return g;
}

function Evidence({ app, setApp, profile, onBack, onNext }: {
  app: FundraisingApplication; setApp: (a: FundraisingApplication) => void; profile: DoneeNeedProfile | null;
  onBack: () => void; onNext: () => void;
}) {
  const t = useTranslations("fundraiserFlow");
  const evidenceLabel = useEvidenceLabel();
  const evidenceHint = useEvidenceHint();
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const [busy, setBusy] = useState<FundraisingEvidenceType | null>(null);
  const [failed, setFailed] = useState<Partial<Record<FundraisingEvidenceType, string>>>({});
  const profileId = profile?.documents.find((d) => d.docType === "GOVT_ID_ANY");
  const active = app.evidence.filter((e) => !e.superseded);

  async function upload(type: FundraisingEvidenceType, file: File, replaces?: FundraisingEvidence) {
    setBusy(type); setFailed((f) => ({ ...f, [type]: undefined }));
    try { setApp(await fundraising.uploadEvidence(app.id, type, file, replaces?.id)); }
    catch (e) { setFailed((f) => ({ ...f, [type]: e instanceof ApiError ? e.message : ui("Upload failed. The file is still on your device — try again.") })); }
    finally { setBusy(null); }
  }
  async function remove(e: FundraisingEvidence) { setApp(await fundraising.removeEvidence(app.id, e.id)); }
  async function reuseId() { if (profileId) setApp(await fundraising.useProfileDocument(app.id, profileId.id, "ORGANISER_ID")); }

  return (
    <>
      <Heading title={ui("Evidence for this need")} sub={t("evidenceIntro", { category: app.category ? t("evidenceIntroCategory", { category: fmt.category(app.category).toLowerCase() }) : "", forOther: app.forSelf ? "" : t("evidenceIntroForOther") })} />
      <div style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderRadius: 10, background: "#eaf0f8", color: "#1e3a60" }}>
        <Icon name="lock" />
        <p className={s.small}><strong><UiText>Private — only authorised reviewers can view these.</UiText></strong> <UiText>Nothing here appears on a public page. You&apos;ll choose public photos separately, later.</UiText></p>
      </div>
      <div className={s.card} style={{ maxWidth: 860, overflow: "hidden" }}>
        {groupsFor(app).map((type, gi) => {
          const files = active.filter((e) => e.type === type);
          const inputId = `f-${type}`;
          return (
            <section key={type} aria-labelledby={`g-${type}`} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, borderTop: gi ? "1px solid #efe7de" : 0, background: failed[type] ? "#fffaf9" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div><h2 id={`g-${type}`} style={{ fontSize: 16, fontWeight: 700 }}>{evidenceLabel(type)} <FieldInfo localize k={`ev_${type}`} />{type === "OTHER" && <span className={s.muted} style={{ fontWeight: 500 }}> <UiText>(optional)</UiText></span>}</h2>{evidenceHint(type) && <p className={`${s.muted} ${s.small}`}>{evidenceHint(type)}</p>}</div>
                {busy === type ? <span className={`${s.chip} ${s.cN}`}><Icon name="upload" /><UiText>Uploading</UiText></span>
                  : failed[type] ? <span className={`${s.chip} ${s.cX}`}><Icon name="x" /><UiText>Not uploaded</UiText></span>
                  : files.length ? <span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Ready</UiText></span>
                  : type !== "OTHER" ? <span className={`${s.chip} ${s.cM}`}><UiText>Needed</UiText></span> : null}
              </div>
              {files.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, background: "#fff", flexWrap: "wrap" }}>
                  <span style={{ width: 40, height: 48, borderRadius: 6, background: "#f1ece6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5d52" }} aria-hidden="true"><Icon name="file" /></span>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}><strong>{f.fromProfile ? ui("Government ID") : f.fileName ?? ui("Document")}</strong>{f.fromProfile && <> <span className={`${s.chip} ${s.cM}`}><UiText>On file in your profile</UiText></span></>}<div className={`${s.muted} ${s.small}`}><UiText>Uploaded</UiText></div></div>
                  {f.viewUrl && <a className={`${s.btn} ${s.bq}`} href={f.viewUrl} target="_blank" rel="noreferrer"><UiText>Preview</UiText></a>}
                  <label className={`${s.btn} ${s.bq}`}><UiText>Replace</UiText><input type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(type, file, f); e.target.value = ""; }} /></label>
                  <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={() => void remove(f)}><UiText>Remove</UiText></button>
                </div>
              ))}
              {failed[type] && <p className={s.errText}><Icon name="alert" />{failed[type]}</p>}
              {type === "ORGANISER_ID" && !files.length && profileId && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px" }}><strong><UiText>Government ID</UiText></strong> <span className={`${s.chip} ${s.cM}`}><UiText>On file in your profile</UiText></span></div>
                  <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void reuseId()}><UiText>Use this</UiText></button>
                </div>
              )}
              {(!files.length || type === "OTHER") && (
                <div style={{ border: "2px dashed #b9c9de", borderRadius: 10, padding: 16, display: "flex", gap: 12, alignItems: "center", justifyContent: "center", background: "#f8fafd", flexWrap: "wrap" }}>
                  <span style={{ color: "#1e3a60" }}><Icon name="upload" /></span>
                  <label htmlFor={inputId} className={`${s.btn} ${s.bs}`}><UiText>Choose file</UiText></label>
                  <input id={inputId} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(type, file); e.target.value = ""; }} />
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 860 }}><UiText>A file you choose is only saved once its upload finishes. Whether profile documents can be reused for fundraising is still being decided.</UiText></p>
      <div style={{ maxWidth: 860 }}><Nav onBack={onBack} onNext={onNext} /></div>
    </>
  );
}

// F07 — A5 Declarations and review
function Review({ app, set, flush, goTo, onSubmitted }: {
  app: FundraisingApplication; set: SetFn; flush: () => Promise<boolean>; goTo: (step: number) => void;
  onSubmitted: (a: FundraisingApplication) => void;
}) {
  const t = useTranslations("fundraiserFlow");
  const choiceLabel = useChoiceLabel();
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kv = { display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: "6px 16px", fontSize: 14 } as const;
  const sec = (title: string, step: number, body: React.ReactNode, first = false) => (
    <section style={{ padding: "18px 22px", borderTop: first ? 0 : "1px solid #efe7de", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}><h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => goTo(step)}><UiText>Edit</UiText></button></div>
      {body}
    </section>
  );
  const check = (key: "declaredAccurate" | "declaredAuthority" | "declaredUseOfFunds" | "declaredVerificationConsent", text: string) => (
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #efe7de" }}>
      <input type="checkbox" checked={app[key]} onChange={(e) => set({ [key]: e.target.checked })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60", flex: "none" }} />
      <span>{text}</span>
    </label>
  );

  async function submit() {
    setSubmitting(true); setError(null);
    if (!(await flush())) { setSubmitting(false); setError(ui("Your last changes haven't saved yet. Try again before submitting.")); return; }
    try { onSubmitted(await fundraising.submit(app.id)); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Submitting failed. Nothing was sent — try again.")); setSubmitting(false); }
  }

  return (
    <>
      <Heading title={ui("Check and submit")} sub={ui("Reviewers will see exactly what's below. You can't edit it while it's being reviewed.")} />
      <div className={s.card} style={{ maxWidth: 860, overflow: "hidden" }}>
        {sec(ui("Who needs help", "wizard step"), 1, <dl style={kv}><dt className={s.muted}><UiText>For</UiText></dt><dd>{app.forSelf ? ui("Myself") : t("beneficiaryPrivate", { legal: app.beneficiaryLegalName ?? "—", shown: app.beneficiaryDisplayName ?? "—" })}</dd>{!app.forSelf && <><dt className={s.muted}><UiText>Relationship</UiText></dt><dd>{app.relationship ? choiceLabel(app.relationship) : "—"} · {app.beneficiaryAgeRange ? choiceLabel(app.beneficiaryAgeRange) : "—"}</dd></>}</dl>, true)}
        {sec(ui("The need", "wizard step"), 2, <dl style={kv}><dt className={s.muted}><UiText>Category</UiText></dt><dd>{app.category ? fmt.category(app.category) : "—"}</dd><dt className={s.muted}><UiText>Costs</UiText></dt><dd>{t("costsAcross", { amount: formatINR(app.totalCosts), count: app.costItems.length })}</dd><dt className={s.muted}><UiText>Other help</UiText></dt><dd>{formatINR(app.totalCosts - app.outstandingGap)}</dd><dt className={s.muted}><UiText>Raising</UiText></dt><dd>{formatINR(app.requestedAmount)}</dd></dl>)}
        {sec(ui("Evidence", "wizard step"), 3, <p className={s.small}>{t("documentsReady", { count: app.evidence.filter((e) => !e.superseded).length })}</p>)}
      </div>
      <fieldset className={s.card} style={{ maxWidth: 860, padding: "20px 22px", margin: 0 }}>
        <legend style={{ fontWeight: 700, fontSize: 16, padding: "0 6px" }}><UiText>Please confirm</UiText></legend>
        {check("declaredAccurate", ui("What I've told you is true and complete as far as I know."))}
        {!app.forSelf && check("declaredAuthority", ui("I have their agreement to organise this fundraiser for them."))}
        {check("declaredUseOfFunds", ui("Money raised will be used only for the need described here."))}
        {check("declaredVerificationConsent", ui("CauseKind may check these documents to verify this application."))}
        <p className={`${s.muted} ${s.small}`} style={{ paddingTop: 10 }}><UiText>How we process your documents: [PRIVACY DISCLOSURE — to be written once processing is decided]. This is not consent to any other use.</UiText></p>
      </fieldset>
      {app.missing.length > 0 && (
        <div role="status" style={{ maxWidth: 860, padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }} className={s.small}>
          <strong><UiText>Still needed:</UiText></strong> {app.missing.join(", ")}.
        </div>
      )}
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div style={{ maxWidth: 860, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => goTo(3)}><UiText>Back</UiText></button>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`${s.muted} ${s.small}`}><UiText>Submitting doesn&apos;t make anything public.</UiText></span>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={submit} disabled={submitting || app.missing.length > 0}>{submitting ? ui("Submitting…") : ui("Submit application")}</button>
        </div>
      </div>
    </>
  );
}
