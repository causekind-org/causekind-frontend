"use client";

import { useState } from "react";
import { ApiError, fundraisingCampaigns, type FundraisingCampaign, type FundraisingEvidence } from "@/lib/api";
import { Icon } from "./ui";
import s from "./fundraising.module.css";
import { UiText, useUiText } from "@/components/UiText";
import { FIELD_HELP } from "./FieldInfo";

/**
 * What donors can see (owner, 2026-10-30, option A): every document except identity, family and profile
 * ones is shown once the fundraiser is published. The donee doesn't choose per document; submitting under
 * this notice is the consent. Changing the wording means bumping CampaignPublicEvidence.CURRENT_DISCLOSURE_VERSION.
 */
export function DisclosureNotice() {
  return (
    <div style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 10, background: "#eaf0f8", color: "#1e3a60" }}>
      <Icon name="lock" />
      <p className={s.small}>
        <strong><UiText>Identity, family and profile documents always stay private.</UiText></strong>{" "}
        <UiText>All your other documents will be shown to donors on your fundraiser page once it is published. Anyone may view, download or share them.</UiText>
      </p>
    </div>
  );
}

function label(type: string) {
  const t = type.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The document's name, as the upload step titles it ("Medical report", "Proof of relationship"). */
function documentName(e: FundraisingEvidence) {
  if (e.fromProfile) return "Government ID (from your profile)";
  return FIELD_HELP[`ev_${e.type}`]?.title ?? label(e.type);
}

const row = { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #efe7de" } as const;

/** Read-only: which of the current documents donors will see, and which always stay private. */
export function DocumentVisibility({ page, evidence }: { page: FundraisingCampaign; evidence: FundraisingEvidence[] }) {
  const shown = new Set(page.selectableEvidence.map((e) => e.evidenceId));
  const current = evidence.filter((e) => !e.superseded);
  return (
    <section className={s.card} aria-labelledby="dcs" style={{ maxWidth: 860, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 id="dcs" style={{ fontWeight: 700, fontSize: 16 }}><UiText>What donors can see</UiText></h2>
      <DisclosureNotice />
      {current.length === 0 && <p className={`${s.muted} ${s.small}`}><UiText>You haven&apos;t added any documents yet.</UiText></p>}
      {current.map((e) => (
        <div key={e.id} style={row}>
          <Icon name={shown.has(e.id) ? "check" : "lock"} />
          {/* Name first (2026-11-26, owner): every row used to read "Shown to donors — <file>.jpg",
              so with several uploads of the same file you couldn't tell which document was which. */}
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <strong><UiText>{documentName(e)}</UiText></strong>
            <span className={`${s.muted} ${s.small}`} style={{ overflowWrap: "anywhere" }}>
              {shown.has(e.id) ? <UiText>Shown to donors</UiText> : <UiText>Always private</UiText>}
              {!e.fromProfile && e.fileName ? <> · {e.fileName}</> : null}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}

/**
 * One-time opt-in for fundraisers submitted before the notice existed: those documents were uploaded under
 * a "private" promise, so nothing is shown until the donee agrees here.
 */
export function ShowDocumentsOptIn({ c, onDone }: { c: FundraisingCampaign; onDone: (c: FundraisingCampaign) => void }) {
  const ui = useUiText();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waiting = c.applicationId != null && c.publicEvidenceIds.length === 0 && c.selectableEvidence.length > 0
    && !["DRAFT", "CHANGES_REQUESTED", "CANCELLED", "PUBLICATION_DECLINED"].includes(c.status);
  if (!waiting) return null;
  async function send() {
    setBusy(true); setError(null);
    try { onDone(await fundraisingCampaigns.showDocuments(c.id, c.disclosureVersion)); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("That didn't save. Try again.")); setBusy(false); }
  }
  return (
    <div className={s.wrap} style={{ paddingTop: 24 }}>
    <section className={s.card} aria-labelledby="sdo" style={{ maxWidth: 860, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 id="sdo" style={{ fontWeight: 700, fontSize: 16 }}><UiText>Show your documents to donors?</UiText></h2>
      <p className={s.small}><UiText>You uploaded these when we said documents stay private, so donors can&apos;t see them yet. Fundraisers that show their documents are easier for donors to trust.</UiText></p>
      <DisclosureNotice />
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60", flex: "none" }} />
        <span className={s.small}><UiText>I agree that my documents, except identity, family and profile ones, can be shown to donors.</UiText></span>
      </label>
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
      <div><button type="button" className={`${s.btn} ${s.bp}`} disabled={!agree || busy} onClick={send}>{busy ? ui("Saving…") : ui("Show my documents")}</button></div>
    </section>
    </div>
  );
}
