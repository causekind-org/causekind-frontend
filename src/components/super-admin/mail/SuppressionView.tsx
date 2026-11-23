"use client";

import { useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcSuppressionLookup,
  mcSuppress,
  mcUnsuppress,
  type McSuppression,
} from "@/lib/api";
import { errText } from "./shared";

/** Mail Center: blocked addresses. */

// ------------------------------------------------------------------ blocked addresses

export function SuppressionView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<McSuppression | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;

  const run = async (fn: () => Promise<McSuppression>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError(null);
    try { setResult(await fn()); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl space-y-4">
      <p className={`text-xs ${t.muted}`}>
        Look up one address to see if CauseKind is blocked from emailing it. Addresses get blocked automatically when an
        email bounces for good or the person reports it as spam. There is no full list on purpose — it is people&apos;s private data.
      </p>
      <div className="flex gap-2">
        <input type="email" className={field} placeholder="someone@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-label="Email address to look up" />
        <button type="button" disabled={busy || !email.includes("@")} onClick={() => run(() => mcSuppressionLookup(email))}
          className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>Look up</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className={`space-y-3 rounded-2xl border p-4 ${t.card}`}>
          <p className={`text-sm font-bold ${t.heading}`}>{result.email}</p>
          {result.suppressed ? (
            <p className="text-sm text-red-500">
              Blocked for all email (reason: {result.reason}, from {result.source}
              {result.since ? `, since ${new Date(result.since).toLocaleDateString("en-IN")}` : ""}).
              This also stops OTPs and receipts to this address.
            </p>
          ) : (
            <p className="text-sm text-emerald-500">Not blocked.</p>
          )}
          <p className={`text-xs ${t.muted}`}>
            {result.optedOut ? "Has unsubscribed from campaign emails." : "Has not unsubscribed from campaign emails."}
          </p>
          {result.suppressed ? (
            <button type="button" disabled={busy}
              onClick={() => run(() => mcUnsuppress(result.email),
                "Unblock this address? Only do this if the problem is fixed — Amazon may still refuse to deliver until it is removed in the AWS console too.")}
              className={`min-h-9 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Unblock</button>
          ) : (
            <div className="flex gap-2">
              <input className={field} placeholder="Why (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
              <button type="button" disabled={busy}
                onClick={() => run(() => mcSuppress(result.email, note), "Block this address from ALL CauseKind email, including OTPs?")}
                className={`min-h-9 rounded-xl border px-4 text-xs font-bold text-red-500 ${t.btn}`}>Block</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
