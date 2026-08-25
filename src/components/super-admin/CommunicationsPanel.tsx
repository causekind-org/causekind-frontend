"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminCommunicationLog,
  superAdminCommunicationPreview,
  superAdminCommunicationSend,
  superAdminCommunicationTemplates,
  type SaCommunication,
  type SaCommunicationPreview,
  type SaCommunicationTemplate,
  type SaComposeRequest,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Eye, Loader2, Mail, Send, XCircle,
} from "lucide-react";

/**
 * Phase 6: saying something to a user, on purpose, with a record of it.
 *
 * <p><b>The preview is a server call, not a local render.</b> It comes back from
 * the same compose step the send uses, so what the agent approves is what leaves.
 * Rendering the message in the browser would be a second implementation of it,
 * and two implementations drift — the same reasoning that keeps every string on
 * the intervention screens server-authored.
 *
 * <p><b>Sending is gated on having previewed.</b> Not as ceremony: this is free
 * text going to a real person's inbox under CauseKind's name, and the warnings
 * the preview carries — a phone number, an email address, the word "OTP" — are
 * exactly the things nobody notices until afterwards.
 */

const STATUS_META = {
  SENT:   { icon: CheckCircle2, className: "text-emerald-500", label: "Sent" },
  FAILED: { icon: XCircle,      className: "text-red-500",     label: "Failed" },
  QUEUED: { icon: Clock,        className: "text-amber-500",   label: "Queued" },
} as const;

export function CommunicationsPanel({
  isDark,
  initialUserId,
}: {
  isDark: boolean;
  /** Set when arriving from a user's 360, so the composer opens on them. */
  initialUserId?: number;
}) {
  const t = saTheme(isDark);

  const [templates, setTemplates] = useState<SaCommunicationTemplate[]>([]);
  const [userIdText, setUserIdText] = useState(initialUserId ? String(initialUserId) : "");
  const [template, setTemplate] = useState("FREE_TEXT");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [detail, setDetail] = useState("");

  const [preview, setPreview] = useState<SaCommunicationPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SaCommunication | null>(null);

  const [log, setLog] = useState<SaCommunication[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const selected = templates.find((x) => x.name === template);
  const isFreeText = selected?.freeText ?? template === "FREE_TEXT";

  useEffect(() => {
    superAdminCommunicationTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const loadLog = useCallback(async (userId?: number) => {
    setLogLoading(true);
    try {
      const page = await superAdminCommunicationLog({ userId, size: 25 });
      setLog(page.items);
    } catch {
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => { void loadLog(initialUserId); }, [loadLog, initialUserId]);

  function compose(): SaComposeRequest | null {
    const targetUserId = Number(userIdText.trim());
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      setError("Enter the numeric id of the user to write to.");
      return null;
    }
    return {
      targetUserId,
      channel: "EMAIL",
      template,
      subject: isFreeText ? subject : undefined,
      body: isFreeText ? body : undefined,
      values: isFreeText ? undefined : { detail },
    };
  }

  async function onPreview() {
    const req = compose();
    if (!req) return;
    setPreviewing(true);
    setError(null);
    setSent(null);
    try {
      setPreview(await superAdminCommunicationPreview(req));
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Could not build the preview.");
    } finally {
      setPreviewing(false);
    }
  }

  async function onSend() {
    const req = compose();
    if (!req || !preview?.sendable) return;
    setSending(true);
    setError(null);
    try {
      const result = await superAdminCommunicationSend(req);
      setSent(result);
      setPreview(null);
      setSubject(""); setBody(""); setDetail("");
      await loadLog(result.targetUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The message was not sent.");
    } finally {
      setSending(false);
    }
  }

  // Editing after previewing invalidates the approval — the agent would be
  // sending something they never saw.
  function edited<T>(setter: (v: T) => void) {
    return (v: T) => { setPreview(null); setter(v); };
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-lg font-bold ${t.heading}`}>Communications</h2>
        <p className={`text-xs ${t.muted}`}>
          Writing to a user, and the record of everything staff has sent.
        </p>
      </div>

      {/* ── Composer ────────────────────────────────────────────────────── */}
      <div className={`space-y-3 rounded-xl border p-4 ${t.card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={userIdText}
            onChange={(e) => edited(setUserIdText)(e.target.value)}
            inputMode="numeric"
            aria-label="User id"
            placeholder="User id"
            className={`w-32 rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
          />
          <select
            value={template}
            aria-label="Template"
            onChange={(e) => edited(setTemplate)(e.target.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
          >
            {templates.map((x) => (
              <option key={x.name} value={x.name}>
                {x.freeText ? "Free text" : x.name.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
          <span className={`flex items-center gap-1 text-[11px] ${t.dim}`}>
            <Mail className="size-3" /> Email
          </span>
        </div>

        {isFreeText ? (
          <>
            <input
              value={subject}
              onChange={(e) => edited(setSubject)(e.target.value)}
              aria-label="Subject"
              placeholder="Subject"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
            />
            <textarea
              value={body}
              onChange={(e) => edited(setBody)(e.target.value)}
              rows={6}
              aria-label="Message"
              placeholder="What do you want to say? This is sent exactly as written."
              className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
            />
          </>
        ) : (
          <>
            <p className={`text-xs ${t.muted}`}>
              {selected?.subject && <>Subject: <span className={t.text}>{selected.subject}</span></>}
            </p>
            <textarea
              value={detail}
              onChange={(e) => edited(setDetail)(e.target.value)}
              rows={4}
              aria-label="Detail"
              placeholder="The specific detail this template asks for — what exactly is needed, or what is on hold."
              className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
            />
          </>
        )}

        {error && <div className={`rounded-lg border p-3 text-xs ${t.dangerPanel}`}>{error}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            disabled={previewing}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btn}`}
          >
            {previewing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
            Preview
          </button>
          {/* Absent, not disabled, until there is an approved preview: a send
              button with nothing behind it invites the click that skips the step
              this screen exists for. */}
          {preview?.sendable && (
            <button
              type="button"
              onClick={onSend}
              disabled={sending}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-bold ${t.btnAccent}`}
            >
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send it
            </button>
          )}
        </div>
      </div>

      {/* ── Preview ─────────────────────────────────────────────────────── */}
      {preview && (
        <div className={`space-y-3 rounded-xl border p-4 ${t.card}`}>
          <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
            Exactly what will be sent
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`font-bold ${t.text}`}>{preview.recipientName}</span>
            <span className={t.muted}>{preview.recipient}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
              {preview.channel}
            </span>
          </div>

          {!preview.sendable && (
            <div className={`flex gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
              <Ban className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold">This cannot be sent</p>
                <p className="text-xs">{preview.blockedReason}</p>
              </div>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className={`space-y-1.5 rounded-lg border p-3 ${t.dangerPanel}`}>
              {preview.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {w}
                </p>
              ))}
              <p className="text-[11px] opacity-80">
                These do not block the send. Check they belong in this message before
                you go ahead.
              </p>
            </div>
          )}

          <div className={`rounded-lg border p-3 ${t.cardFlat}`}>
            <p className={`text-sm font-bold ${t.heading}`}>{preview.subject}</p>
            <p className={`mt-2 whitespace-pre-wrap text-xs ${t.text}`}>{preview.body}</p>
          </div>
        </div>
      )}

      {sent && (
        <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${t.accentPanel}`}>
          <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${t.text}`} />
          <div className={`text-xs ${t.text}`}>
            <p className="font-bold">
              {sent.status === "SENT" ? "Sent." : `Recorded as ${sent.status}.`}
            </p>
            {sent.failureReason && <p className={t.muted}>{sent.failureReason}</p>}
          </div>
        </div>
      )}

      {/* ── Delivery log ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
          Delivery log
        </h3>
        {logLoading ? (
          <p className={`text-xs ${t.muted}`}>Loading…</p>
        ) : log.length === 0 ? (
          <p className={`rounded-xl border p-6 text-center text-xs ${t.card} ${t.muted}`}>
            Nothing has been sent yet.
          </p>
        ) : (
          <ul className={`divide-y rounded-xl border ${t.card} ${t.divide}`}>
            {log.map((m) => {
              const meta = STATUS_META[m.status];
              const Icon = meta?.icon ?? Clock;
              return (
                <li key={m.id} className="flex items-start gap-2.5 p-3">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta?.className ?? t.dim}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${t.text}`}>
                      {m.subject || "(no subject)"}
                    </p>
                    <p className={`truncate text-xs ${t.muted}`}>
                      user {m.targetUserId} · {m.sentByEmail} ·{" "}
                      {new Date(m.sentAt).toLocaleString()}
                      {m.template ? ` · ${m.template}` : ""}
                    </p>
                    {/* The failure is the thing worth keeping. Shown, not hidden
                        behind the status chip. */}
                    {m.failureReason && (
                      <p className="mt-0.5 text-xs text-red-500">{m.failureReason}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
