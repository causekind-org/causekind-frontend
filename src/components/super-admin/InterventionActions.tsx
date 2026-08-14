"use client";

import { useState } from "react";
import {
  superAdminHold,
  superAdminReassess,
  superAdminRequestInfoFor,
  superAdminResume,
  type SaActionEntity,
  type SaInterventionAction,
  type SaInterventionType,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  Ban, CheckCircle2, ClipboardList, Loader2, PauseCircle, PlayCircle,
  RefreshCw, Send, TriangleAlert, Upload, type LucideIcon,
} from "lucide-react";

/**
 * The named domain actions, and why the unavailable ones are unavailable.
 *
 * <p>§8 of the rebuild plan: interventions are named actions delegating to the
 * service that owns the cascade, never status writes. Nothing here sends a
 * status, and there is no free-form field that could become one.
 *
 * <p><b>Blocked actions are rendered, not hidden.</b> "Why can't I do this" is
 * the question staff actually arrive with, and an action that vanishes from the
 * list answers it with a blank space. The server's `blockedReason` is shown
 * verbatim — every string on this screen is the policy's own.
 *
 * <p>Each mutation answers with the refreshed action list, so the panel re-renders
 * from the policy rather than guessing what the act changed.
 */

const ACTION_META: Record<SaInterventionType, { icon: LucideIcon; blurb: string }> = {
  HOLD: {
    icon: PauseCircle,
    blurb: "Pauses the record. The owner is told, and told why.",
  },
  RESUME: {
    icon: PlayCircle,
    blurb: "Returns it to the queue it came from.",
  },
  REQUEST_INFO: {
    icon: ClipboardList,
    blurb: "Asks the owner for something specific. The answer arrives structured and reviewable.",
  },
  REASSESS: {
    icon: RefreshCw,
    blurb: "Re-runs the automated assessment. This costs a real provider call.",
  },
  REPUBLISH: {
    icon: Upload,
    blurb: "Puts it back in front of its audience.",
  },
};

const ITEM_TYPES = ["TEXT", "PHOTO", "DOCUMENT", "CONFIRMATION"] as const;

export function InterventionActions({
  entity,
  id,
  actions,
  isDark,
  onChanged,
}: {
  entity: SaActionEntity;
  id: number;
  actions: SaInterventionAction[];
  isDark: boolean;
  /** Hand the refreshed list upstream so the whole panel stays on one answer. */
  onChanged: (next: SaInterventionAction[]) => void;
}) {
  const t = saTheme(isDark);

  const [open, setOpen] = useState<SaInterventionType | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Information-request composer state. Kept here rather than in a child so the
  // whole form clears when the action panel closes.
  const [items, setItems] = useState<{ itemType: string; label: string }[]>([
    { itemType: "DOCUMENT", label: "" },
  ]);
  const [dueAt, setDueAt] = useState("");
  const [holdWorkflow, setHoldWorkflow] = useState(false);

  function reset() {
    setOpen(null);
    setText("");
    setError(null);
    setItems([{ itemType: "DOCUMENT", label: "" }]);
    setDueAt("");
    setHoldWorkflow(false);
  }

  async function run(type: SaInterventionType) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      if (type === "HOLD") {
        onChanged(await superAdminHold(entity, id, text.trim()));
        setDone("Held. The owner has been told.");
      } else if (type === "RESUME") {
        onChanged(await superAdminResume(entity, id, text.trim() || undefined));
        setDone("Resumed.");
      } else if (type === "REASSESS") {
        onChanged(await superAdminReassess(entity, id));
        setDone("Reassessment triggered.");
      } else if (type === "REQUEST_INFO") {
        const created = await superAdminRequestInfoFor(entity, id, {
          instructions: text.trim(),
          dueAt: dueAt || undefined,
          holdWorkflow,
          items: items
            .filter((i) => i.label.trim().length > 0)
            .map((i) => ({ itemType: i.itemType, label: i.label.trim(), required: true })),
        });
        setDone(`Asked. Information request #${created.informationRequestId} is now open.`);
      }
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That action was refused.");
    } finally {
      setBusy(false);
    }
  }

  const namedItems = items.filter((i) => i.label.trim().length > 0);
  const openAction = actions.find((a) => a.type === open) ?? null;
  const textMissing = !!openAction?.requiresText && text.trim().length === 0;
  const infoIncomplete = open === "REQUEST_INFO" && (text.trim().length === 0 || namedItems.length === 0);
  const canRun = !busy && !textMissing && !infoIncomplete;

  return (
    <div className="space-y-3">
      <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>Actions</h3>

      {done && (
        <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${t.accentPanel}`}>
          <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${t.text}`} />
          <p className={`text-xs ${t.text}`}>{done}</p>
        </div>
      )}

      <ul className={`divide-y rounded-lg border ${t.cardFlat} ${t.divide}`}>
        {actions.map((a) => {
          const meta = ACTION_META[a.type];
          const Icon = meta?.icon ?? ClipboardList;
          const isOpen = open === a.type;

          return (
            <li key={a.type} className="p-3">
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 size-4 shrink-0 ${a.available ? t.text : t.dim}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${a.available ? t.text : t.dim}`}>
                    {/* The server's label when it has one; the raw type otherwise,
                        so an action this console cannot name is still visible. */}
                    {a.label ?? a.type.replace(/_/g, " ")}
                  </p>

                  {a.available ? (
                    <p className={`text-xs ${t.muted}`}>{meta?.blurb}</p>
                  ) : (
                    <p className={`flex items-start gap-1.5 text-xs ${t.muted}`}>
                      <Ban className="mt-0.5 size-3 shrink-0" />
                      {a.blockedReason}
                    </p>
                  )}

                  {a.warning && a.available && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                      {a.warning}
                    </p>
                  )}
                </div>

                {a.available && (
                  <button
                    type="button"
                    onClick={() => (isOpen ? reset() : (reset(), setOpen(a.type)))}
                    className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold ${t.btn}`}
                  >
                    {isOpen ? "Cancel" : a.label ?? "Do it"}
                  </button>
                )}
              </div>

              {/* ── The one open form ─────────────────────────────────────── */}
              {isOpen && (
                <div className={`mt-3 space-y-2 rounded-lg border p-3 ${t.card}`}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    aria-label={a.type === "REQUEST_INFO" ? "Instructions" : "Reason"}
                    placeholder={
                      a.type === "REQUEST_INFO"
                        ? "What are you asking for? The user sees this and nothing else."
                        : a.requiresText
                        ? "Required — the owner is told this"
                        : "Optional context"
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
                  />
                  {textMissing && (
                    <p className="text-xs text-red-500">
                      {a.type === "REQUEST_INFO"
                        ? "An instruction nobody can read cannot be answered."
                        : "The owner reads this. It cannot be blank."}
                    </p>
                  )}

                  {a.type === "REQUEST_INFO" && (
                    <>
                      <div className="space-y-2">
                        <p className={`text-xs font-bold ${t.text}`}>What to ask for</p>
                        {items.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <select
                              value={item.itemType}
                              aria-label={`Item ${i + 1} type`}
                              onChange={(e) => {
                                const next = [...items];
                                next[i] = { ...next[i], itemType: e.target.value };
                                setItems(next);
                              }}
                              className={`w-36 rounded-lg border px-2 py-1.5 text-xs ${t.input}`}
                            >
                              {ITEM_TYPES.map((it) => (
                                <option key={it} value={it}>{it}</option>
                              ))}
                            </select>
                            <input
                              value={item.label}
                              aria-label={`Item ${i + 1} label`}
                              onChange={(e) => {
                                const next = [...items];
                                next[i] = { ...next[i], label: e.target.value };
                                setItems(next);
                              }}
                              placeholder="What exactly — e.g. “Photo of the serial number”"
                              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs ${t.input}`}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setItems([...items, { itemType: "DOCUMENT", label: "" }])}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${t.btn}`}
                        >
                          Add another
                        </button>
                        {text.trim().length > 0 && namedItems.length === 0 && (
                          <p className="text-xs text-red-500">
                            Ask for at least one thing — an unlabelled item is not a question.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className={`flex items-center gap-1.5 text-xs ${t.text}`}>
                          Due
                          <input
                            type="date"
                            value={dueAt}
                            aria-label="Due date"
                            onChange={(e) => setDueAt(e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-xs ${t.input}`}
                          />
                        </label>
                        <label className={`flex cursor-pointer items-center gap-1.5 text-xs ${t.text}`}>
                          <input
                            type="checkbox"
                            checked={holdWorkflow}
                            onChange={(e) => setHoldWorkflow(e.target.checked)}
                            className="size-3.5"
                          />
                          Hold the workflow until this is answered
                        </label>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className={`rounded-lg border p-2 text-xs ${t.dangerPanel}`}>{error}</div>
                  )}

                  <button
                    type="button"
                    onClick={() => run(a.type)}
                    disabled={!canRun}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btnAccent} disabled:opacity-40 disabled:pointer-events-none`}
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    {a.label ?? "Confirm"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
