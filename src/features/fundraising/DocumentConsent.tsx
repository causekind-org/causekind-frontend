"use client";

import type { FundraisingCampaign } from "@/lib/api";
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

/**
 * "Show to donors" boxes for the documents the server says can be published. Only current-version
 * consent is ever checked; legacy selections start unchecked. Every save names the acknowledged version.
 */
export function DocumentConsent({ page, set, locked = false }: { page: FundraisingCampaign; set: SetFn; locked?: boolean }) {
  const chosen = new Set(page.publicEvidenceIds);
  function toggle(id: number, on: boolean) {
    const next = page.selectableEvidence.map((e) => e.evidenceId).filter((x) => (x === id ? on : chosen.has(x)));
    set({ publicEvidenceIds: next, acknowledgedDisclosureVersion: page.disclosureVersion });
  }
  return (
    <fieldset className={s.card} style={{ maxWidth: 860, padding: "20px 22px", margin: 0, display: "flex", flexDirection: "column", gap: 12 }} disabled={locked}>
      <legend style={{ fontWeight: 700, fontSize: 16, padding: "0 6px" }}><UiText>What donors can see</UiText></legend>
      <DisclosureNotice />
      {page.selectableEvidence.length === 0 ? (
        <p className={`${s.muted} ${s.small}`}><UiText>None of your documents can be shown to donors. They all stay private.</UiText></p>
      ) : page.selectableEvidence.map((e) => (
        <label key={e.evidenceId} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #efe7de" }}>
          <input type="checkbox" checked={chosen.has(e.evidenceId)} onChange={(ev) => toggle(e.evidenceId, ev.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1e3a60", flex: "none" }} />
          <span><strong><UiText>Show to donors</UiText></strong> — {e.fileName ?? label(e.type)} <span className={s.muted}>({label(e.type)})</span></span>
        </label>
      ))}
      {page.legacyPublicEvidenceIds.length > 0 && (
        <p className={`${s.muted} ${s.small}`}><UiText>Choices you made before this note was added no longer count. Tick a document again if you want donors to see it.</UiText></p>
      )}
    </fieldset>
  );
}
