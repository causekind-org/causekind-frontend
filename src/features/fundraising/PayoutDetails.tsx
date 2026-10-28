"use client";

import { useState } from "react";
import { fundraising, type FundraisingPayout } from "@/lib/api";
import a from "@/features/fundraising/admin.module.css";

/**
 * Admin view of the donee's bank details (owner, 2026-10-27). The account number is masked; "Show full number"
 * fetches it from the server, which records the reveal in the audit log.
 */
export function PayoutDetails({ applicationId, payout }: { applicationId: number; payout: FundraisingPayout | null }) {
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
