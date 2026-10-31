"use client";

import { useState } from "react";
import { fundraising, type FundraisingPayout } from "@/lib/api";
import a from "@/features/fundraising/admin.module.css";

/**
 * Admin view of the donee's bank details (owner, 2026-10-27). The account number is masked; "Show full number"
 * fetches it from the server, which records the reveal in the audit log.
 */
/** Trimmed, lower-case, single spaces; null when nothing is left. */
const normalName = (n?: string | null) => (n ?? "").trim().toLowerCase().replace(/\s+/g, " ") || null;

/**
 * Account holder vs the people on the application. "mismatch" only when both names were checked and
 * neither matches; "organiserOnly" when just the organiser was checked and differs (the beneficiary's
 * name is unavailable here, or there is none), so it never implies a check it didn't make;
 * "unknown" when the holder, or both other names, are missing.
 */
function nameCheck(holder?: string | null, organiser?: string | null, beneficiary?: string | null): "match" | "mismatch" | "organiserOnly" | "beneficiaryOnly" | "unknown" {
  const h = normalName(holder), o = normalName(organiser), b = normalName(beneficiary);
  if (!h || (!o && !b)) return "unknown";
  if (h === o || h === b) return "match";
  return o && b ? "mismatch" : o ? "organiserOnly" : "beneficiaryOnly";
}

export function PayoutDetails({ applicationId, payout, organiserName, beneficiaryName }: {
  applicationId: number; payout: FundraisingPayout | null;
  /**
   * For the account-holder name check. beneficiaryName: undefined = not available on this screen;
   * null = no separate beneficiary (raising for yourself).
   */
  organiserName?: string | null; beneficiaryName?: string | null;
}) {
  const [full, setFull] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const has = !!payout?.accountLast4;
  async function reveal() {
    setBusy(true); setErr(null);
    try { setFull((await fundraising.admin.revealPayoutAccount(applicationId)).accountNumber); }
    catch { setErr("Couldn't show the account number."); }
    finally { setBusy(false); }
  }
  return (
    <section className={`${a.card} ${a.pane}`} aria-labelledby="bank">
      <h2 id="bank" className={a.h}>Bank details</h2>
      {!payout || (!has && !payout.holderName && !payout.ifsc) ? <p className={`${a.small} ${a.muted}`}>The donee hasn&apos;t given bank details yet.</p> : (
        <>
          <p className={a.small}><span className={a.muted}>Account holder:</span> {payout.holderName || "—"}</p>
          {(() => {
            const check = nameCheck(payout.holderName, organiserName, beneficiaryName);
            const warn = (text: string) => <p className={a.small} role="status" style={{ padding: "8px 10px", borderRadius: 8, background: "#fdf3e1", color: "#4a3000" }}>{text} Check before confirming bank details.</p>;
            return check === "mismatch" ? warn("The account holder's name matches neither the organiser nor the beneficiary.")
              : check === "organiserOnly" ? warn(beneficiaryName === undefined
                  ? "Does not match organiser; beneficiary name unavailable."
                  : "Does not match the organiser, and there is no separate beneficiary.")
              : check === "beneficiaryOnly" ? warn("Does not match the beneficiary; organiser name unavailable.")
              : check === "unknown"
              ? <p className={`${a.small} ${a.muted}`}>Name check: Unable to compare.</p>
              : <p className={`${a.small} ${a.muted}`}>Name check: matches the {normalName(payout.holderName) === normalName(organiserName) ? "organiser" : "beneficiary"}.</p>;
          })()}
          <p className={a.small} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span><span className={a.muted}>Account number:</span> <span style={{ fontVariantNumeric: "tabular-nums" }}>{full ?? (has ? `XXXX${payout.accountLast4}` : "—")}</span></span>
            {has && (full
              ? <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setFull(null)}>Hide</button>
              : <button type="button" className={`${a.btn} ${a.bs}`} disabled={busy} onClick={reveal}>Show full number</button>)}
          </p>
          <p className={a.small}><span className={a.muted}>IFSC:</span> {payout.ifsc || "—"} · <span className={a.muted}>Bank and branch:</span> {payout.bankBranch || "—"}</p>
          <p className={a.small}><span className={a.muted}>UPI:</span> {payout.upi || "—"}</p>
          {err && <p className={a.err} role="alert">{err}</p>}
          <p className={`${a.small} ${a.muted}`}>Stored encrypted. Every &quot;Show full number&quot; is recorded in the audit log.</p>
        </>
      )}
    </section>
  );
}
