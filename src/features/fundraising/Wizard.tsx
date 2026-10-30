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
import { PageStep, pageGaps, usePageDraft } from "./PageSteps";
import { DisclosureNotice, DocumentConsent } from "./DocumentConsent";
import type { SetFn as CampaignSetFn } from "./CampaignWizard";
import type { FundraisingCampaign } from "@/lib/api";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/**
 * F03–F07 + F13–F16 — the single fundraiser form (owner, 2026-10-27): four application steps,
 * then the public page (Your page, Your story, Privacy), then Review. One submit, one review.
 * The application and the page autosave separately.
 */
/** Visible labels for stored English choice values (age range, relationship). */
function useChoiceLabel() {
  const ui = useUiText();
  return (v: string): string => ({
    "Under 18": ui("Under 18"), "18–39": ui("18–39"), "40–59": ui("40–59"), "60 or over": ui("60 or over"),
    Parent: ui("Parent"), Child: ui("Child"), Spouse: ui("Spouse"), Sibling: ui("Sibling"),
    "Other relative": ui("Other relative"), Guardian: ui("Guardian"), Other: ui("Other", "relationship"),
  } as Record<string, string>)[v] ?? v;
}

/** Title and hint for each server requirement group, keyed by its code (FundraisingEvidenceRules). */
function useRequirementCopy() {
  const ui = useUiText();
  return (key: string): { title: string; hint: string } => ({
    identity: { title: ui("Your identity"), hint: ui("A government ID in your name.") },
    consent: { title: ui("Their consent"), hint: ui("A signed note from the person you're raising for, saying they agree to this fundraiser.") },
    relationship: { title: ui("Proof of relationship"), hint: ui("A ration card, birth certificate, or IDs showing the same family name or address.") },
    medicalReport: { title: ui("Medical report"), hint: ui("The doctor's or hospital's report for this condition, dated within the last 6 months. Not a full medical history.") },
    treatmentEstimate: { title: ui("Treatment estimate"), hint: ui("On the hospital's letterhead, showing the costs in your breakdown.") },
    enrolment: { title: ui("Admission or enrolment letter"), hint: ui("From the school, college or institute, showing the student and the course.") },
    fees: { title: ui("Fee demand"), hint: ui("From the institution, showing the amount due and the period it covers.") },
    event: { title: ui("Proof of what happened"), hint: ui("An FIR or police report (theft, accident), a fire brigade report or panchnama (fire), a tehsildar or disaster relief certificate (flood), or a death certificate (loss of an earning member).") },
    cost: { title: ui("Cost proof"), hint: ui("A quotation, estimate or bill for what the money will pay for.") },
    supporting: { title: ui("Supporting document"), hint: ui("One more document showing the need is real, such as an official letter or a report of what happened. Your cost proof doesn't count twice.") },
    other: { title: ui("Anything else"), hint: ui("Optional documents don't speed up review.") },
  } as Record<string, { title: string; hint: string }>)[key] ?? { title: key, hint: "" };
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
      const sent = body.costItems ? { ...body, costItems: body.costItems.filter(filledCost) } : body;
      const next = await fundraising.save(app.id, clear.length ? { ...sent, clear } : sent);
      setApp((cur) => {
        const o = pendingOverlay(cur, pending.current);
        // Keep blank rows the donee is still filling in; the server only knows the filled ones.
        if (cur.costItems.some((c) => !filledCost(c))) o.costItems = cur.costItems;
        return { ...next, ...o, payout: o.payout ? { ...o.payout, accountLast4: next.payout.accountLast4 } : next.payout };
      });
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
    setApp((cur) => withPayout({ ...cur, ...(patch as Partial<FundraisingApplication>) }, patch));
    pending.current = { ...pending.current, ...patch };
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const draft = usePageDraft(app, step >= 4);

  async function go(to: number) {
    await flush();
    await draft.flush();
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  async function saveAndExit() {
    await flush();
    await draft.flush();
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
        {step >= 4 && step <= 5 && <PageStep step={step as 4 | 5} draft={draft} neededBy={app.urgency ?? null} nav={<Nav onBack={() => go(step - 1)} onNext={() => go(step + 1)} />} />}
        {step === 6 && <BankDetails app={app} set={set} onBack={() => go(5)} onNext={() => go(7)} />}
        {step === 7 && <Review app={app} set={set} flush={async () => (await flush()) && (await draft.flush())} goTo={go} onSubmitted={onLeftDraft} page={draft.page} setPage={draft.set} reloadPage={draft.reload} />}
      </main>
    </>
  );
}

function pendingOverlay(cur: FundraisingApplication, p: FundraisingSave): Partial<FundraisingApplication> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(p)) out[k] = (cur as Record<string, unknown>)[k];
  // Bank text fields still being typed live inside `payout`; keep the on-screen values.
  if (PAYOUT_TEXT.some(([k]) => k in p)) {
    out.payout = { ...cur.payout };
    for (const k of Object.keys(out)) if (k.startsWith("payout") && k !== "payout") delete out[k];
  }
  return out as Partial<FundraisingApplication>;
}

/** A cost row worth saving: it has a name or an amount. */
const filledCost = (c: FundraisingCostItem) => c.expense.trim() !== "" || c.amount != null;

/** Save keys for the bank text fields, and where each shows in the masked `payout` view. */
const PAYOUT_TEXT = [["payoutHolderName", "holderName"], ["payoutIfsc", "ifsc"], ["payoutBankBranch", "bankBranch"], ["payoutUpi", "upi"]] as const;

/** Mirrors bank edits into `payout` so the inputs show what was typed before the server answers. */
function withPayout(app: FundraisingApplication, patch: FundraisingSave): FundraisingApplication {
  if (!PAYOUT_TEXT.some(([k]) => k in patch)) return app;
  const payout = { ...app.payout };
  for (const [k, v] of PAYOUT_TEXT) if (k in patch) payout[v] = patch[k] ?? null;
  return { ...app, payout };
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
  // Read the account fresh each time the step opens: the signed-in user held by useAuth can be
  // a cached copy without the phone (its /users/me refresh gives up after 2 s on a cold database).
  const [account, setAccount] = useState<{ city: string | null; fullName: string | null; phone: string | null; email: string | null } | null>(null);
  useEffect(() => { getProfile().then((p) => setAccount({ city: p.city, fullName: p.fullName, phone: p.phone, email: p.email })).catch(() => {}); }, []);
  const city = account?.city ?? null;
  const fullName = account?.fullName || user?.fullName || "";
  const phone = account?.phone || user?.phone || "";
  const email = account?.email || user?.email || "";
  // Landmark is optional on the donee profile; the account city always exists.
  const address = profile?.details?.addressLandmark?.trim() || city || "";
  return (
    <>
      <Heading title={ui("About you")} sub={ui("These details come from your profile and can't be changed here. If anything is wrong, update it in your profile — the change shows here when you come back.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="nm"><UiText>Legal name</UiText> <FieldInfo localize k="nm" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="nm" className={s.in} value={fullName} readOnly /><p className={s.hint}><UiText>As it appears on your government ID.</UiText></p></div>
          <div><label className={s.lbl} htmlFor="age"><UiText>Age</UiText> <FieldInfo localize k="age" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="age" className={s.in} value={profile?.details?.age ?? ""} readOnly /></div>
        </div>
        <div><label className={s.lbl} htmlFor="ad"><UiText>Current address</UiText> <FieldInfo localize k="ad" /><span className={`${s.chip} ${s.cM}`}><UiText>From your profile</UiText></span></label><input id="ad" className={s.in} value={address} placeholder={ui("Not in your profile yet")} readOnly />{address
            ? <p className={s.hint}><UiText>Changing your address may mean we ask for a new residence proof.</UiText></p>
            : <p className={s.hint}><UiText>Not in your profile yet.</UiText> <Link href="/profile/need-details"><UiText>Add your address</UiText></Link> <UiText>— your application is saved.</UiText></p>}</div>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="em"><UiText>Email</UiText> <FieldInfo localize k="em" /><span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Verified</UiText></span></label><input id="em" className={s.in} value={email} readOnly style={{ background: "#f7f3ee" }} /><p className={s.hint}><UiText>Verified with a code when you signed up.</UiText></p></div>
          <div><label className={s.lbl} htmlFor="ph"><UiText>Phone</UiText> <FieldInfo localize k="ph" /><span className={`${s.chip} ${s.cM}`}><Icon name="alert" /><UiText>Not verified</UiText></span></label><input id="ph" className={s.in} value={phone} placeholder={account ? ui("Not added yet") : ""} readOnly /><p className={s.hint}><UiText>We may ask you to verify this later.</UiText></p></div>
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
  // Rows stay on screen while blank (clearing the name must not delete the row); flush sends only filled ones.
  const setCosts = (next: FundraisingCostItem[]) => set({ costItems: next });
  const edit = (i: number, patch: Partial<FundraisingCostItem>) => setCosts(costs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));
  const total = costs.reduce((t, c) => t + (c.amount ?? 0), 0);
  // Money the donee already has is recorded for reviewers but not subtracted (owner, 2026-10-26).
  const gap = total;
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
            <input id="ur" type="date" className={s.in} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              value={/^\d{4}-\d{2}-\d{2}$/.test(app.urgency ?? "") ? app.urgency! : ""}
              onChange={(e) => set({ urgency: e.target.value })} />
            <p className={s.hint}><UiText>For example, the day of the operation, or the last day to pay the fees.</UiText></p></div>
          {/* The amount comes first (owner, 2026-10-26); the breakdown below explains it. */}
          <div><label className={s.lbl} htmlFor="ask"><UiText>How much money you want from this fundraising (₹)</UiText> <FieldInfo localize k="ask" /></label><input id="ask" className={`${s.in} ${s.tabular}`} inputMode="decimal" value={app.requestedAmount ?? ""} onChange={(e) => set({ requestedAmount: num(e.target.value) })} /></div>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="cbh">
          <h2 id="cbh" style={{ fontSize: 17, fontWeight: 700 }}><UiText>What will the money pay for?</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(you can skip this)</UiText></span> <FieldInfo localize k="costs" /></h2>
          <div aria-hidden="true" className={`${s.muted} ${s.small}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, fontWeight: 600 }}>
            <span><UiText>What is it?</UiText></span><span style={{ textAlign: "right" }}><UiText>How much? (₹)</UiText></span><span><UiText>Bill or receipt number</UiText> <FieldInfo localize k="ref" /></span><span />
          </div>
          {costs.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, alignItems: "start" }}>
              <input className={s.in} aria-label={`Expense ${i + 1}`} placeholder={ui("What is it for?")} value={c.expense} onChange={(e) => edit(i, { expense: e.target.value })} maxLength={160} />
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
          <div><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => setCosts([...costs, { expense: "", amount: null, reference: null }])}><UiText>+ Add one more thing</UiText></button></div>
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

function Evidence({ app, setApp, profile, onBack, onNext }: {
  app: FundraisingApplication; setApp: (a: FundraisingApplication) => void; profile: DoneeNeedProfile | null;
  onBack: () => void; onNext: () => void;
}) {
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  return (
    <>
      <Heading title={ui("Evidence for this need")} sub={t("evidenceIntro", { category: app.category ? t("evidenceIntroCategory", { category: fmt.category(app.category).toLowerCase() }) : "", forOther: app.forSelf ? "" : t("evidenceIntroForOther") })} />
      <DisclosureNotice />
      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 860 }}><UiText>You choose which documents to show on the &ldquo;Check and submit&rdquo; step. Until then, nothing is shown.</UiText></p>
      <EvidenceSections app={app} setApp={setApp} profile={profile} />
      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 860 }}><UiText>A file you choose is only saved once its upload finishes. Whether profile documents can be reused for fundraising is still being decided.</UiText></p>
      <div style={{ maxWidth: 860 }}><Nav onBack={onBack} onNext={onNext} /></div>
    </>
  );
}

/**
 * The document sections, one per server requirement group (FundraisingEvidenceRules) plus an optional
 * "Anything else". A group is met by a document of any of its types, so an earlier upload of another
 * accepted type still counts. Also used on the respond page while information is requested.
 */
export function EvidenceSections({ app, setApp, profile }: {
  app: FundraisingApplication; setApp: (a: FundraisingApplication) => void; profile: DoneeNeedProfile | null;
}) {
  const copy = useRequirementCopy();
  const ui = useUiText();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, string | undefined>>({});
  const profileId = profile?.documents.find((d) => d.docType === "GOVT_ID_ANY");
  const active = app.evidence.filter((e) => !e.superseded);
  const groups = app.requiredEvidence ?? [];
  // "Anything else" is offered unless a requirement already accepts it (Other's supporting document).
  const sections = [
    ...groups.map((g) => ({ key: g.key, anyOf: g.anyOf, state: g.state as string | null, uploadAs: (g.key === "supporting" ? "OTHER" : g.anyOf[0]) as FundraisingEvidenceType })),
    ...(groups.some((g) => g.anyOf.includes("OTHER")) ? [] : [{ key: "other", anyOf: ["OTHER"] as FundraisingEvidenceType[], state: null, uploadAs: "OTHER" as FundraisingEvidenceType }]),
  ];

  async function upload(key: string, type: FundraisingEvidenceType, file: File, replaces?: FundraisingEvidence) {
    setBusy(key); setFailed((f) => ({ ...f, [key]: undefined }));
    try { setApp(await fundraising.uploadEvidence(app.id, type, file, replaces?.id)); }
    catch (e) { setFailed((f) => ({ ...f, [key]: e instanceof ApiError ? e.message : ui("Upload failed. The file is still on your device — try again.") })); }
    finally { setBusy(null); }
  }
  async function remove(e: FundraisingEvidence) { setApp(await fundraising.removeEvidence(app.id, e.id)); }
  async function reuseId() { if (profileId) setApp(await fundraising.useProfileDocument(app.id, profileId.id, "ORGANISER_ID")); }

  return (
    <div className={s.card} style={{ maxWidth: 860, overflow: "hidden" }}>
      {sections.map((sec, gi) => {
        const files = active.filter((e) => sec.anyOf.includes(e.type));
        const { title, hint } = copy(sec.key);
        const optional = sec.state === null;
        const inputId = `f-${sec.key}`;
        return (
          <section key={sec.key} aria-labelledby={`g-${sec.key}`} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, borderTop: gi ? "1px solid #efe7de" : 0, background: failed[sec.key] ? "#fffaf9" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div><h2 id={`g-${sec.key}`} style={{ fontSize: 16, fontWeight: 700 }}>{title} <FieldInfo localize k={sec.key === "supporting" ? "ev_supporting" : `ev_${sec.uploadAs}`} />{optional && <span className={s.muted} style={{ fontWeight: 500 }}> <UiText>(optional)</UiText></span>}</h2>{hint && <p className={`${s.muted} ${s.small}`}>{hint}</p>}</div>
              {busy === sec.key ? <span className={`${s.chip} ${s.cN}`}><Icon name="upload" /><UiText>Uploading</UiText></span>
                : failed[sec.key] ? <span className={`${s.chip} ${s.cX}`}><Icon name="x" /><UiText>Not uploaded</UiText></span>
                : files.length ? <span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Ready</UiText></span>
                : sec.state === "NEXT_SUBMISSION" ? <span className={`${s.chip} ${s.cW}`}><UiText>Needed to resubmit</UiText></span>
                : !optional ? <span className={`${s.chip} ${s.cM}`}><UiText>Needed</UiText></span> : null}
            </div>
            {files.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, background: "#fff", flexWrap: "wrap" }}>
                <span style={{ width: 40, height: 48, borderRadius: 6, background: "#f1ece6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5d52" }} aria-hidden="true"><Icon name="file" /></span>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}><strong>{f.fromProfile ? ui("Government ID") : f.fileName ?? ui("Document")}</strong>{f.fromProfile && <> <span className={`${s.chip} ${s.cM}`}><UiText>On file in your profile</UiText></span></>}<div className={`${s.muted} ${s.small}`}><UiText>Uploaded</UiText></div></div>
                {f.viewUrl && <a className={`${s.btn} ${s.bq}`} href={f.viewUrl} target="_blank" rel="noreferrer"><UiText>Preview</UiText></a>}
                <label className={`${s.btn} ${s.bq}`}><UiText>Replace</UiText><input type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(sec.key, f.type, file, f); e.target.value = ""; }} /></label>
                <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={() => void remove(f)}><UiText>Remove</UiText></button>
              </div>
            ))}
            {failed[sec.key] && <p className={s.errText}><Icon name="alert" />{failed[sec.key]}</p>}
            {sec.key === "identity" && !files.length && profileId && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}><strong><UiText>Government ID</UiText></strong> <span className={`${s.chip} ${s.cM}`}><UiText>On file in your profile</UiText></span></div>
                <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void reuseId()}><UiText>Use this</UiText></button>
              </div>
            )}
            {(!files.length || optional) && (
              <div style={{ border: "2px dashed #b9c9de", borderRadius: 10, padding: 16, display: "flex", gap: 12, alignItems: "center", justifyContent: "center", background: "#f8fafd", flexWrap: "wrap" }}>
                <span style={{ color: "#1e3a60" }}><Icon name="upload" /></span>
                <label htmlFor={inputId} className={`${s.btn} ${s.bs}`}><UiText>Choose file</UiText></label>
                <input id={inputId} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(sec.key, sec.uploadAs, file); e.target.value = ""; }} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// F07 — A5 Declarations and review
/**
 * Bank details for the payout (owner, 2026-10-27). The account number is write-only: the server keeps it
 * encrypted and only ever sends back the last four digits, so this step shows "saved" instead of the number.
 */
function BankDetails({ app, set, onBack, onNext }: { app: FundraisingApplication; set: SetFn; onBack: () => void; onNext: () => void }) {
  const ui = useUiText();
  const [acct, setAcct] = useState("");
  const [acct2, setAcct2] = useState("");
  const [changing, setChanging] = useState(!app.payout.accountLast4);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 18);
  const acctOk = /^\d{9,18}$/.test(acct);
  const match = acct === acct2;
  const ifsc = app.payout.ifsc ?? "";
  const ifscOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  function saveAccount() {
    if (!acctOk || !match) return;
    set({ payoutAccountNumber: acct });
    setAcct(""); setAcct2(""); setChanging(false);
  }
  return (
    <>
      <Heading title={ui("Bank details")} sub={ui("Where the money raised will be sent. Only our team can see these details.")} />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
        <div><label className={s.lbl} htmlFor="bh"><UiText>Name on the bank account</UiText></label><input id="bh" className={s.in} maxLength={120} autoComplete="name" value={app.payout.holderName ?? ""} onChange={(e) => set({ payoutHolderName: e.target.value })} /><p className={s.hint}><UiText>Write it exactly as the bank has it.</UiText></p></div>
        {changing ? (
          <div className={s.grid2}>
            <div><label className={s.lbl} htmlFor="ba"><UiText>Account number</UiText></label><input id="ba" className={`${s.in} ${s.tabular}`} inputMode="numeric" autoComplete="off" value={acct} onChange={(e) => setAcct(digits(e.target.value))} />{acct && !acctOk && <p className={s.errText}><UiText>An account number has 9 to 18 digits.</UiText></p>}</div>
            <div><label className={s.lbl} htmlFor="ba2"><UiText>Type the account number again</UiText></label><input id="ba2" className={`${s.in} ${s.tabular}`} inputMode="numeric" autoComplete="off" value={acct2} onChange={(e) => setAcct2(digits(e.target.value))} onPaste={(e) => e.preventDefault()} />{acct2 && !match && <p className={s.errText}><UiText>The two numbers don&apos;t match.</UiText></p>}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className={`${s.btn} ${s.bp}`} disabled={!acctOk || !match} onClick={saveAccount}><UiText>Save account number</UiText></button>
              {app.payout.accountLast4 && <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => { setAcct(""); setAcct2(""); setChanging(false); }}><UiText>Cancel</UiText></button>}
            </div>
          </div>
        ) : (
          <div><span className={s.lbl}><UiText>Account number</UiText></span><p style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span className={s.tabular}>XXXX{app.payout.accountLast4}</span><span className={`${s.muted} ${s.small}`}><UiText>Saved</UiText></span><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => setChanging(true)}><UiText>Change</UiText></button></p></div>
        )}
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="bi"><UiText>IFSC code</UiText></label><input id="bi" className={s.in} maxLength={11} autoComplete="off" style={{ textTransform: "uppercase" }} value={ifsc} onChange={(e) => set({ payoutIfsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} /><p className={s.hint}>{ifsc && !ifscOk ? ui("11 characters, like SBIN0001234. It's printed in your passbook or cheque book.") : ui("Printed in your passbook or cheque book.")}</p></div>
          <div><label className={s.lbl} htmlFor="bb"><UiText>Bank and branch</UiText></label><input id="bb" className={s.in} maxLength={160} value={app.payout.bankBranch ?? ""} onChange={(e) => set({ payoutBankBranch: e.target.value })} /></div>
        </div>
        <div style={{ maxWidth: 420 }}><label className={s.lbl} htmlFor="bu"><UiText>UPI ID (if you have one)</UiText></label><input id="bu" className={s.in} maxLength={100} autoComplete="off" value={app.payout.upi ?? ""} onChange={(e) => set({ payoutUpi: e.target.value })} /></div>
        <Nav onBack={onBack} onNext={onNext} />
      </div>
    </>
  );
}

function Review({ app, set, flush, goTo, onSubmitted, page, setPage, reloadPage }: {
  app: FundraisingApplication; set: SetFn; flush: () => Promise<boolean>; goTo: (step: number) => void;
  onSubmitted: (a: FundraisingApplication) => void; page: FundraisingCampaign | null;
  setPage: CampaignSetFn; reloadPage: () => void;
}) {
  // The documents that can be shown depend on what was uploaded on step 3: refresh the list here.
  useEffect(() => { reloadPage(); }, [reloadPage]);
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

  const stillNeeded = [...app.missing, ...pageGaps(page, {
    title: ui("page title"), story: ui("your story"), cover: ui("cover photo"), consent: ui("cover photo permission"),
  })];

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
        {sec(ui("The need", "wizard step"), 2, <dl style={kv}><dt className={s.muted}><UiText>Category</UiText></dt><dd>{app.category ? fmt.category(app.category) : "—"}</dd><dt className={s.muted}><UiText>Costs</UiText></dt><dd>{t("costsAcross", { amount: formatINR(app.totalCosts), count: app.costItems.length })}</dd><dt className={s.muted}><UiText>Other help</UiText></dt><dd>{formatINR((app.insuranceAmount ?? 0) + (app.ownContribution ?? 0) + (app.grantsAmount ?? 0) + (app.otherFundraisingAmount ?? 0))}</dd><dt className={s.muted}><UiText>Raising</UiText></dt><dd>{formatINR(app.requestedAmount)}</dd></dl>)}
        {sec(ui("Evidence", "wizard step"), 3, <p className={s.small}>{t("documentsReady", { count: app.evidence.filter((e) => !e.superseded).length })}</p>)}
        {sec(ui("Your page", "wizard step"), 4, <dl style={kv}>
          <dt className={s.muted}><UiText>Title</UiText></dt><dd>{page?.title || "—"}</dd>
          <dt className={s.muted}><UiText>Cover photo</UiText></dt><dd>{page?.coverUrl ? ui("Added") : "—"}</dd>
          <dt className={s.muted}><UiText>Last day to collect money</UiText></dt><dd>{/^\d{4}-\d{2}-\d{2}$/.test(app.urgency ?? "") ? fmt.date(app.urgency!) : "—"}</dd>
          <dt className={s.muted}><UiText>Shown name</UiText></dt><dd>{page?.beneficiaryDisplayName || "—"}</dd>
        </dl>)}
        {sec(ui("Bank details", "wizard step"), 6, <dl style={kv}>
          <dt className={s.muted}><UiText>Account holder</UiText></dt><dd>{app.payout.holderName || "—"}</dd>
          <dt className={s.muted}><UiText>Account number</UiText></dt><dd>{app.payout.accountLast4 ? `XXXX${app.payout.accountLast4}` : "—"}</dd>
          <dt className={s.muted}><UiText>IFSC</UiText></dt><dd>{app.payout.ifsc || "—"}</dd>
        </dl>)}
        {sec(ui("Your story", "wizard step"), 5, <p className={s.small} style={{ whiteSpace: "pre-line" }}>{page?.story ? (page.story.length > 280 ? page.story.slice(0, 280) + "…" : page.story) : "—"}</p>)}
      </div>
      {page && <DocumentConsent page={page} set={setPage} />}
      <fieldset className={s.card} style={{ maxWidth: 860, padding: "20px 22px", margin: 0 }}>
        <legend style={{ fontWeight: 700, fontSize: 16, padding: "0 6px" }}><UiText>Please confirm</UiText></legend>
        {check("declaredAccurate", ui("What I've told you is true and complete as far as I know."))}
        {!app.forSelf && check("declaredAuthority", ui("I have their agreement to organise this fundraiser for them."))}
        {check("declaredUseOfFunds", ui("Money raised will be used only for the need described here."))}
        {check("declaredVerificationConsent", ui("CauseKind may check these documents to verify this application."))}
        <p className={`${s.muted} ${s.small}`} style={{ paddingTop: 10 }}><UiText>How we process your documents: [PRIVACY DISCLOSURE — to be written once processing is decided]. This is not consent to any other use.</UiText></p>
      </fieldset>
      {stillNeeded.length > 0 && (
        <div role="status" style={{ maxWidth: 860, padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }} className={s.small}>
          <strong><UiText>Still needed:</UiText></strong> {stillNeeded.join(", ")}.
        </div>
      )}
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div style={{ maxWidth: 860, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => goTo(6)}><UiText>Back</UiText></button>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`${s.muted} ${s.small}`}><UiText>Submitting doesn&apos;t make anything public.</UiText></span>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={submit} disabled={submitting || stillNeeded.length > 0}>{submitting ? ui("Submitting…") : ui("Submit for review")}</button>
        </div>
      </div>
    </>
  );
}
