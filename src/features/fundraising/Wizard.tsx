"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import {
  fundraising, getDoneeNeedProfile, getProfile, ApiError,
  type DoneeNeedProfile, type FundraisingApplication, type FundraisingCategory,
  type FundraisingCostItem, type FundraisingEvidence, type FundraisingEvidenceType, type FundraisingSave,
} from "@/lib/api";
import { CATEGORY_LABEL, Icon, SaveIndicator, Stepper, formatINR, type SaveState } from "./ui";
import s from "./fundraising.module.css";

/** F03–F07 — the five-step application wizard (canvas F03…F07). Autosaves. */
export function Wizard({ initial, onLeftDraft }: { initial: FundraisingApplication; onLeftDraft: (a: FundraisingApplication) => void }) {
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
      const next = await fundraising.save(app.id, body);
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
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>Fundraiser application · Draft · {app.reference}</span>
          <SaveIndicator state={save} />
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={saveAndExit}>Save and exit</button>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        <Stepper current={step} />
        {save === "error" && (
          <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
            <Icon name="alert" />
            <p style={{ flex: "1 1 400px" }}><strong>Your last changes haven&apos;t been saved.</strong> They&apos;re still on this screen — don&apos;t close it. Check your connection and try again.</p>
            <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void flush()}>Try again</button>
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

function Nav({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: "1px solid #efe7de", paddingTop: 20 }}>
      {onBack ? <button type="button" className={`${s.btn} ${s.bs}`} onClick={onBack}>Back</button> : <Link href="/fundraising/start" className={`${s.btn} ${s.bs}`}>Back</Link>}
      <button type="button" className={`${s.btn} ${s.bp}`} onClick={onNext}>{nextLabel}<Icon name="arrow" /></button>
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

// F03 — A1 About you. Prefilled and read-only here: these live on the account
// and donee profile, and the handoff says never ask for them twice.
function AboutYou({ profile, onNext }: { profile: DoneeNeedProfile | null; onNext: () => void }) {
  const { user } = useAuth();
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => { getProfile().then((p) => setCity(p.city)).catch(() => {}); }, []);
  // Landmark is optional on the donee profile; the account city always exists.
  const address = profile?.details?.addressLandmark?.trim() || city || "";
  return (
    <>
      <Heading title="About you" sub="We filled in what we already know from your account and donee profile. Check it, and correct anything out of date." />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="nm">Legal name <span className={`${s.chip} ${s.cM}`}>From your profile</span></label><input id="nm" className={s.in} value={user?.fullName ?? ""} readOnly /><p className={s.hint}>As it appears on your government ID.</p></div>
          <div><label className={s.lbl} htmlFor="age">Age <span className={`${s.chip} ${s.cM}`}>From your profile</span></label><input id="age" className={s.in} value={profile?.details?.age ?? ""} readOnly /></div>
        </div>
        <div><label className={s.lbl} htmlFor="ad">Current address <span className={`${s.chip} ${s.cM}`}>From your profile</span></label><input id="ad" className={s.in} value={address} placeholder="Not in your profile yet" readOnly />{address
            ? <p className={s.hint}>Changing your address may mean we ask for a new residence proof.</p>
            : <p className={s.hint}>Not in your profile yet. <Link href="/profile/need-details">Add your address</Link> — your application is saved.</p>}</div>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="em">Email <span className={`${s.chip} ${s.cOk}`}><Icon name="check" />Verified</span></label><input id="em" className={s.in} value={user?.email ?? ""} readOnly style={{ background: "#f7f3ee" }} /><p className={s.hint}>Verified with a code when you signed up.</p></div>
          <div><label className={s.lbl} htmlFor="ph">Phone <span className={`${s.chip} ${s.cM}`}><Icon name="alert" />Not verified</span></label><input id="ph" className={s.in} value={user?.phone ?? ""} readOnly /><p className={s.hint}>We may ask you to verify this later.</p></div>
        </div>
        <p className={`${s.muted} ${s.small}`}>Something out of date? <Link href="/profile/need-details">Update your profile</Link>, then come back — your application is saved.</p>
        <Nav onNext={onNext} />
      </div>
    </>
  );
}

// F04 — A2 Who needs help
function WhoNeedsHelp({ app, set, onBack, onNext }: { app: FundraisingApplication; set: SetFn; onBack: () => void; onNext: () => void }) {
  const opt = (sel: boolean) => ({
    display: "flex", gap: 12, alignItems: "flex-start", padding: sel ? 15 : 16, borderRadius: 10, cursor: "pointer",
    border: sel ? "2px solid #1e3a60" : "1px solid #cfc3b6", background: sel ? "#f5f8fc" : "#fff",
  }) as const;
  return (
    <>
      <Heading title="Who needs help?" sub="You can organise a fundraiser for yourself or for someone you are helping." />
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24, maxWidth: 820 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <legend className={s.lbl} style={{ marginBottom: 10 }}>This fundraiser is for</legend>
          <div className={s.grid2} style={{ gap: 12 }}>
            <label style={opt(app.forSelf)}><input type="radio" name="who" checked={app.forSelf} onChange={() => set({ forSelf: true })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span><strong>Myself</strong><br /><span className={`${s.muted} ${s.small}`}>I am the person who needs help.</span></span></label>
            <label style={opt(!app.forSelf)}><input type="radio" name="who" checked={!app.forSelf} onChange={() => set({ forSelf: false })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60" }} /><span><strong>Someone else</strong><br /><span className={`${s.muted} ${s.small}`}>A family member or someone I support.</span></span></label>
          </div>
          <p className={s.hint}>Organising for a child or another adult may not be available at launch. We will tell you before you go further.</p>
        </fieldset>
        {!app.forSelf && (
          <>
            <div className={s.grid2}>
              <div><label className={s.lbl} htmlFor="bn">Their full legal name <span className={`${s.chip} ${s.cM}`}><Icon name="lock" />Private</span></label><input id="bn" className={s.in} value={app.beneficiaryLegalName ?? ""} onChange={(e) => set({ beneficiaryLegalName: e.target.value })} maxLength={160} /><p className={s.hint}>Only reviewers see this.</p></div>
              <div><label className={s.lbl} htmlFor="pn">Name shown to donors</label><input id="pn" className={s.in} value={app.beneficiaryDisplayName ?? ""} onChange={(e) => set({ beneficiaryDisplayName: e.target.value })} maxLength={80} /><p className={s.hint}>You can use a first name only. You can change this when you prepare the campaign.</p></div>
            </div>
            <div className={s.grid2}>
              <div><label className={s.lbl} htmlFor="ag">Their age</label>
                <select id="ag" className={s.in} value={app.beneficiaryAgeRange ?? ""} onChange={(e) => set({ beneficiaryAgeRange: e.target.value })}>
                  <option value="">Choose</option>{["Under 18", "18–39", "40–59", "60 or over"].map((o) => <option key={o}>{o}</option>)}
                </select></div>
              <div><label className={s.lbl} htmlFor="rl">Your relationship to them</label>
                <select id="rl" className={s.in} value={app.relationship ?? ""} onChange={(e) => set({ relationship: e.target.value })}>
                  <option value="">Choose</option>{["Parent", "Child", "Spouse", "Sibling", "Other relative", "Guardian", "Other"].map((o) => <option key={o}>{o}</option>)}
                </select></div>
            </div>
            <div><label className={s.lbl} htmlFor="au">Why are you the right person to organise this?</label><textarea id="au" className={s.in} rows={3} value={app.authorityExplanation ?? ""} onChange={(e) => set({ authorityExplanation: e.target.value })} maxLength={4000} style={{ resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#eaf0f8" }}>
              <span style={{ color: "#1e3a60", marginTop: 2 }}><Icon name="file" /></span>
              <p className={s.small}><strong>We&apos;ll ask for their consent in the Evidence step.</strong> Because you are organising for someone else, we need a signed consent or a short note from them. What counts is still being finalised.</p>
            </div>
          </>
        )}
        <p className={`${s.muted} ${s.small}`} style={{ borderTop: "1px solid #efe7de", paddingTop: 16 }}>We are not asking where donated money goes. That is decided later and the organiser and the person receiving the money do not have to be the same.</p>
        <Nav onBack={onBack} onNext={onNext} />
      </div>
    </>
  );
}

// F05 — A3 The need and funding gap
const CATEGORIES: FundraisingCategory[] = ["MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];

function TheNeed({ app, set, onBack, onNext }: { app: FundraisingApplication; set: SetFn; onBack: () => void; onNext: () => void }) {
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
  const rowErrors = costs.map((c) => c.expense.trim() !== "" && c.amount == null);
  const errors = tried ? rowErrors.map((e, i) => (e ? i : -1)).filter((i) => i >= 0) : [];
  const pill = (sel: boolean, open: boolean) => ({
    display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 16px", borderRadius: 999, fontWeight: 600, fontSize: 14,
    border: sel ? "2px solid #1e3a60" : "1px solid #cfc3b6", color: sel ? "#1e3a60" : open ? "#1f140c" : "#9a8b7f",
    background: sel ? "#f5f8fc" : "#fff", cursor: open ? "pointer" : "not-allowed",
  }) as const;

  return (
    <>
      <Heading title="The need and what it costs" sub="Plain facts are enough. You will write the public story later." />
      {errors.length > 0 && (
        <div role="alert" style={{ maxWidth: 820, border: "2px solid #b42318", borderRadius: 12, background: "#fff", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <strong style={{ color: "#8f1d1d" }}>{errors.length} thing(s) to fix before you continue</strong>
          {errors.map((i) => <a key={i} href={`#amt${i}`}>Cost breakdown, row {i + 1}: enter an amount</a>)}
        </div>
      )}
      <div className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 26, maxWidth: 820 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={s.lbl}>Category</legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => {
              const open = OPEN.includes(c);
              return <button key={c} type="button" aria-pressed={app.category === c} disabled={!open} style={pill(app.category === c, open)} onClick={() => set({ category: c })}>{CATEGORY_LABEL[c]}</button>;
            })}
          </div>
          <p className={s.hint}>Which categories are offered at launch is still being decided.</p>
        </fieldset>
        <div><label className={s.lbl} htmlFor="wh">What happened, and what help is needed?</label><textarea id="wh" className={s.in} rows={4} value={app.whatHappened ?? ""} onChange={(e) => set({ whatHappened: e.target.value })} maxLength={8000} style={{ resize: "vertical" }} /></div>
        <div className={s.grid2}>
          <div><label className={s.lbl} htmlFor="ur">How soon is it needed?</label>
            <select id="ur" className={s.in} value={app.urgency ?? ""} onChange={(e) => set({ urgency: e.target.value })}>
              <option value="">Choose</option>{["Within a week", "Within a month", "Within three months", "Not urgent"].map((o) => <option key={o}>{o}</option>)}
            </select></div>
          <div><label className={s.lbl} htmlFor="rq">Related CauseKind item request <span className={s.muted} style={{ fontWeight: 500 }}>(optional)</span></label><input id="rq" className={s.in} inputMode="numeric" placeholder="Request number" value={app.linkedItemRequestId ?? ""} onChange={(e) => set({ linkedItemRequestId: num(e.target.value) })} /></div>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="cbh">
          <h2 id="cbh" style={{ fontSize: 17, fontWeight: 700 }}>Cost breakdown</h2>
          <div aria-hidden="true" className={`${s.muted} ${s.small}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, fontWeight: 600 }}>
            <span>Expense</span><span style={{ textAlign: "right" }}>Estimated amount (₹)</span><span>Supporting reference</span><span />
          </div>
          {costs.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px minmax(0,190px) 40px", gap: 10, alignItems: "start" }}>
              <input className={s.in} aria-label={`Expense ${i + 1}`} value={c.expense} onChange={(e) => edit(i, { expense: e.target.value })} maxLength={160} />
              <div>
                <input id={`amt${i}`} className={`${s.in} ${s.tabular}`} style={{ textAlign: "right" }} aria-label={`Amount ${i + 1}`} inputMode="decimal" value={c.amount ?? ""} aria-invalid={errors.includes(i) || undefined} aria-describedby={errors.includes(i) ? `e${i}` : undefined} onChange={(e) => edit(i, { amount: num(e.target.value) })} />
                {errors.includes(i) && <p id={`e${i}`} className={s.errText}><Icon name="alert" />Enter an amount</p>}
              </div>
              <input className={s.in} aria-label={`Reference ${i + 1}`} placeholder="Optional" value={c.reference ?? ""} onChange={(e) => edit(i, { reference: e.target.value })} maxLength={160} />
              <button type="button" className={`${s.btn} ${s.bq}`} style={{ padding: 0 }} aria-label={`Remove row ${i + 1}`} onClick={() => setCosts(costs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => setCosts([...costs, { expense: "New expense", amount: null, reference: null }])}>+ Add an expense</button></div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="oh">
          <h2 id="oh" style={{ fontSize: 17, fontWeight: 700 }}>Other help received or expected</h2>
          <div className={s.grid2}>
            {([["insuranceAmount", "Insurance"], ["ownContribution", "Own or family contribution"], ["grantsAmount", "Grants or schemes"], ["otherFundraisingAmount", "Other fundraising"]] as const).map(([k, label]) => (
              <div key={k}><label className={s.lbl} htmlFor={k}>{label}</label><input id={k} className={`${s.in} ${s.tabular}`} inputMode="decimal" value={app[k] ?? ""} onChange={(e) => set({ [k]: num(e.target.value) })} /></div>
            ))}
          </div>
        </section>

        <section className={s.card} style={{ background: "#fbf8f4", padding: "18px 20px" }} aria-labelledby="gap">
          <h2 id="gap" className={s.sec} style={{ marginBottom: 6 }}>Funding gap</h2>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span>Total costs entered</span><span>{formatINR(total)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span>Other help</span><span>− {formatINR(help)}</span></div>
          <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #e7ddd2", fontWeight: 700 }}><span>Outstanding gap</span><span>{formatINR(gap)}</span></div>
          <div style={{ marginTop: 10 }}><label className={s.lbl} htmlFor="ask">Amount you want to raise (₹)</label><input id="ask" className={`${s.in} ${s.tabular}`} inputMode="decimal" style={{ maxWidth: 240 }} value={app.requestedAmount ?? ""} onChange={(e) => set({ requestedAmount: num(e.target.value) })} /></div>
          {mismatch && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "#fdf3e1", color: "#5c3800", flexDirection: "column" }}>
              <p className={s.small}><strong>These don&apos;t add up yet.</strong> The amount you want to raise differs from the gap shown. That&apos;s often a missing cost — add it above, or tell us why in a sentence. Reviewers will ask about any difference.</p>
              <input className={s.in} aria-label="Reason for the difference" placeholder="Reason for the difference" value={app.amountDifferenceReason ?? ""} onChange={(e) => set({ amountDifferenceReason: e.target.value })} />
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
  const [busy, setBusy] = useState<FundraisingEvidenceType | null>(null);
  const [failed, setFailed] = useState<Partial<Record<FundraisingEvidenceType, string>>>({});
  const profileId = profile?.documents.find((d) => d.docType === "GOVT_ID_ANY");
  const active = app.evidence.filter((e) => !e.superseded);

  async function upload(type: FundraisingEvidenceType, file: File, replaces?: FundraisingEvidence) {
    setBusy(type); setFailed((f) => ({ ...f, [type]: undefined }));
    try { setApp(await fundraising.uploadEvidence(app.id, type, file, replaces?.id)); }
    catch (e) { setFailed((f) => ({ ...f, [type]: e instanceof ApiError ? e.message : "Upload failed. The file is still on your device — try again." })); }
    finally { setBusy(null); }
  }
  async function remove(e: FundraisingEvidence) { setApp(await fundraising.removeEvidence(app.id, e.id)); }
  async function reuseId() { if (profileId) setApp(await fundraising.useProfileDocument(app.id, profileId.id, "ORGANISER_ID")); }

  return (
    <>
      <Heading title="Evidence for this need" sub={`This list is based on your answers${app.category ? ` — ${CATEGORY_LABEL[app.category].toLowerCase()} need` : ""}${app.forSelf ? "" : ", organised for someone else"}. PDF, JPG or PNG.`} />
      <div style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderRadius: 10, background: "#eaf0f8", color: "#1e3a60" }}>
        <Icon name="lock" />
        <p className={s.small}><strong>Private — only authorised reviewers can view these.</strong> Nothing here appears on a public page. You&apos;ll choose public photos separately, later.</p>
      </div>
      <div className={s.card} style={{ maxWidth: 860, overflow: "hidden" }}>
        {groupsFor(app).map((type, gi) => {
          const files = active.filter((e) => e.type === type);
          const inputId = `f-${type}`;
          return (
            <section key={type} aria-labelledby={`g-${type}`} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, borderTop: gi ? "1px solid #efe7de" : 0, background: failed[type] ? "#fffaf9" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div><h2 id={`g-${type}`} style={{ fontSize: 16, fontWeight: 700 }}>{EVIDENCE_LABEL[type]}{type === "OTHER" && <span className={s.muted} style={{ fontWeight: 500 }}> (optional)</span>}</h2>{EVIDENCE_HINT[type] && <p className={`${s.muted} ${s.small}`}>{EVIDENCE_HINT[type]}</p>}</div>
                {busy === type ? <span className={`${s.chip} ${s.cN}`}><Icon name="upload" />Uploading</span>
                  : failed[type] ? <span className={`${s.chip} ${s.cX}`}><Icon name="x" />Not uploaded</span>
                  : files.length ? <span className={`${s.chip} ${s.cOk}`}><Icon name="check" />Ready</span>
                  : type !== "OTHER" ? <span className={`${s.chip} ${s.cM}`}>Needed</span> : null}
              </div>
              {files.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, background: "#fff", flexWrap: "wrap" }}>
                  <span style={{ width: 40, height: 48, borderRadius: 6, background: "#f1ece6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5d52" }} aria-hidden="true"><Icon name="file" /></span>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}><strong>{f.fromProfile ? "Government ID" : f.fileName ?? "Document"}</strong>{f.fromProfile && <> <span className={`${s.chip} ${s.cM}`}>On file in your profile</span></>}<div className={`${s.muted} ${s.small}`}>Uploaded</div></div>
                  {f.viewUrl && <a className={`${s.btn} ${s.bq}`} href={f.viewUrl} target="_blank" rel="noreferrer">Preview</a>}
                  <label className={`${s.btn} ${s.bq}`}>Replace<input type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(type, file, f); e.target.value = ""; }} /></label>
                  <button type="button" className={`${s.btn} ${s.bq} ${s.danger}`} onClick={() => void remove(f)}>Remove</button>
                </div>
              ))}
              {failed[type] && <p className={s.errText}><Icon name="alert" />{failed[type]}</p>}
              {type === "ORGANISER_ID" && !files.length && profileId && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e7ddd2", borderRadius: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px" }}><strong>Government ID</strong> <span className={`${s.chip} ${s.cM}`}>On file in your profile</span></div>
                  <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void reuseId()}>Use this</button>
                </div>
              )}
              {(!files.length || type === "OTHER") && (
                <div style={{ border: "2px dashed #b9c9de", borderRadius: 10, padding: 16, display: "flex", gap: 12, alignItems: "center", justifyContent: "center", background: "#f8fafd", flexWrap: "wrap" }}>
                  <span style={{ color: "#1e3a60" }}><Icon name="upload" /></span>
                  <label htmlFor={inputId} className={`${s.btn} ${s.bs}`}>Choose file</label>
                  <input id={inputId} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(type, file); e.target.value = ""; }} />
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 860 }}>A file you choose is only saved once its upload finishes. Whether profile documents can be reused for fundraising is still being decided.</p>
      <div style={{ maxWidth: 860 }}><Nav onBack={onBack} onNext={onNext} /></div>
    </>
  );
}

// F07 — A5 Declarations and review
function Review({ app, set, flush, goTo, onSubmitted }: {
  app: FundraisingApplication; set: SetFn; flush: () => Promise<boolean>; goTo: (step: number) => void;
  onSubmitted: (a: FundraisingApplication) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kv = { display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: "6px 16px", fontSize: 14 } as const;
  const sec = (title: string, step: number, body: React.ReactNode, first = false) => (
    <section style={{ padding: "18px 22px", borderTop: first ? 0 : "1px solid #efe7de", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}><h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2><button type="button" className={`${s.btn} ${s.bq}`} onClick={() => goTo(step)}>Edit</button></div>
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
    if (!(await flush())) { setSubmitting(false); setError("Your last changes haven't saved yet. Try again before submitting."); return; }
    try { onSubmitted(await fundraising.submit(app.id)); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Submitting failed. Nothing was sent — try again."); setSubmitting(false); }
  }

  return (
    <>
      <Heading title="Check and submit" sub="Reviewers will see exactly what's below. You can't edit it while it's being reviewed." />
      <div className={s.card} style={{ maxWidth: 860, overflow: "hidden" }}>
        {sec("Who needs help", 1, <dl style={kv}><dt className={s.muted}>For</dt><dd>{app.forSelf ? "Myself" : `${app.beneficiaryLegalName ?? "—"} (private) · shown as "${app.beneficiaryDisplayName ?? "—"}"`}</dd>{!app.forSelf && <><dt className={s.muted}>Relationship</dt><dd>{app.relationship ?? "—"} · {app.beneficiaryAgeRange ?? "—"}</dd></>}</dl>, true)}
        {sec("The need", 2, <dl style={kv}><dt className={s.muted}>Category</dt><dd>{app.category ? CATEGORY_LABEL[app.category] : "—"}</dd><dt className={s.muted}>Costs</dt><dd>{formatINR(app.totalCosts)} across {app.costItems.length} item(s)</dd><dt className={s.muted}>Other help</dt><dd>{formatINR(app.totalCosts - app.outstandingGap)}</dd><dt className={s.muted}>Raising</dt><dd>{formatINR(app.requestedAmount)}</dd></dl>)}
        {sec("Evidence", 3, <p className={s.small}>{app.evidence.filter((e) => !e.superseded).length} document(s) ready · private to reviewers</p>)}
      </div>
      <fieldset className={s.card} style={{ maxWidth: 860, padding: "20px 22px", margin: 0 }}>
        <legend style={{ fontWeight: 700, fontSize: 16, padding: "0 6px" }}>Please confirm</legend>
        {check("declaredAccurate", "What I've told you is true and complete as far as I know.")}
        {!app.forSelf && check("declaredAuthority", "I have their agreement to organise this fundraiser for them.")}
        {check("declaredUseOfFunds", "Money raised will be used only for the need described here.")}
        {check("declaredVerificationConsent", "CauseKind may check these documents to verify this application.")}
        <p className={`${s.muted} ${s.small}`} style={{ paddingTop: 10 }}>How we process your documents: [PRIVACY DISCLOSURE — to be written once processing is decided]. This is not consent to any other use.</p>
      </fieldset>
      {app.missing.length > 0 && (
        <div role="status" style={{ maxWidth: 860, padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }} className={s.small}>
          <strong>Still needed:</strong> {app.missing.join(", ")}.
        </div>
      )}
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div style={{ maxWidth: 860, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => goTo(3)}>Back</button>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`${s.muted} ${s.small}`}>Submitting doesn&apos;t make anything public.</span>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={submit} disabled={submitting || app.missing.length > 0}>{submitting ? "Submitting…" : "Submit application"}</button>
        </div>
      </div>
    </>
  );
}
