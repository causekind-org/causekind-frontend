"use client";

import type { FundraisingCampaign, FundraisingEvidence } from "@/lib/api";
import type { SetFn } from "./CampaignWizard";
import { Icon } from "./ui";
import s from "./fundraising.module.css";
import { UiText } from "@/components/UiText";

/**
 * Versioned publication consent (owner, 2026-10-30). The wording is fixed for disclosure version
 * 2026-10-30; changing it means bumping CampaignPublicEvidence.CURRENT_DISCLOSURE_VERSION on the server.
 */
export function DisclosureNotice() {
  return (
    <div style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 10, background: "#eaf0f8", color: "#1e3a60" }}>
      <Icon name="lock" />
      <p className={s.small}>
        <strong><UiText>Identity, family and profile documents always stay private.</UiText></strong>{" "}
        <UiText>Other documents stay private unless you select &ldquo;Show to donors.&rdquo; Selected documents become publicly accessible when your fundraiser is published. Anyone may view, download or share them. Your choices are locked when you submit for review.</UiText>
      </p>
    </div>
  );
}

function label(type: string) {
  const t = type.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const row = { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #efe7de" } as const;

/**
 * "Show to donors" boxes for the documents the server says can be published; every other current
 * document (identity, family, profile-sourced) is listed as "Always private". Only current-version
 * consent is ever checked; legacy selections start unchecked. Every save names the acknowledged version.
 */
export function DocumentConsent({ page, evidence, set, locked = false }: {
  page: FundraisingCampaign; evidence: FundraisingEvidence[]; set: SetFn; locked?: boolean;
}) {
  const chosen = new Set(page.publicEvidenceIds);
  const selectable = new Set(page.selectableEvidence.map((e) => e.evidenceId));
  const alwaysPrivate = evidence.filter((e) => !e.superseded && !selectable.has(e.id));
  function toggle(id: number, on: boolean) {
    const next = page.selectableEvidence.map((e) => e.evidenceId).filter((x) => (x === id ? on : chosen.has(x)));
    set({ publicEvidenceIds: next, acknowledgedDisclosureVersion: page.disclosureVersion });
  }
  return (
    <fieldset className={s.card} style={{ maxWidth: 860, padding: "20px 22px", margin: 0, display: "flex", flexDirection: "column", gap: 12 }} disabled={locked}>
      <legend style={{ fontWeight: 700, fontSize: 16, padding: "0 6px" }}><UiText>What donors can see</UiText></legend>
      <DisclosureNotice />
      {page.selectableEvidence.map((e) => (
        <label key={e.evidenceId} style={row}>
          <input type="checkbox" checked={chosen.has(e.evidenceId)} onChange={(ev) => toggle(e.evidenceId, ev.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60", flex: "none" }} />
          <span><strong><UiText>Show to donors</UiText></strong> — {e.fileName ?? label(e.type)}</span>
        </label>
      ))}
      {alwaysPrivate.map((e) => (
        <div key={e.id} style={row}>
          <Icon name="lock" />
          <span><strong><UiText>Always private</UiText></strong> — {e.fileName ?? label(e.type)}</span>
        </div>
      ))}
      {page.selectableEvidence.length === 0 && alwaysPrivate.length === 0 && (
        <p className={`${s.muted} ${s.small}`}><UiText>You haven&apos;t added any documents yet.</UiText></p>
      )}
      {page.legacyPublicEvidenceIds.length > 0 && (
        <p className={`${s.muted} ${s.small}`}><UiText>Choices you made before this note was added no longer count. Tick a document again if you want donors to see it.</UiText></p>
      )}
    </fieldset>
  );
}
