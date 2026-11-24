"use client";

/**
 * Mail Center inbox (Phase 4b; inventory IN01–IN09, IN18).
 * All Mail IDs or one; folders; search; keyset "load older"; select + bulk
 * actions; reader with every message. Incoming HTML is shown in a sandboxed
 * frame with a strict content policy (no scripts, no network except images when
 * you choose "Show images"), because remote images can tell the sender you read it.
 */
import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcMailboxes, mcThreads, mcThread, mcInboxAction, mcDownloadInboxAttachment,
  mcDrafts, mcCreateDraft,
  type McFolder, type McInboxAction, type McMailbox, type McThread, type McThreadRow, type McDraft, type McComposeMode,
} from "@/lib/api";
import { ComposeWindow } from "./ComposeWindow";
import { Archive, ArchiveRestore, ArrowLeft, Forward, Keyboard, Loader2, Mail, MailOpen, Paperclip, PencilLine, RefreshCw, Reply, ReplyAll, RotateCcw, Star, Trash2 } from "lucide-react";
import { errText } from "./shared";

type Folder = McFolder | "DRAFTS";
const FOLDERS: { v: Folder; l: string }[] = [
  { v: "INBOX", l: "Inbox" }, { v: "STARRED", l: "Starred" }, { v: "SENT", l: "Sent" }, { v: "DRAFTS", l: "Drafts" },
  { v: "ALL", l: "All mail" }, { v: "TRASH", l: "Trash" },
];
const SHORTCUTS = "c compose · / search · j / k next / previous · o open · u back · e archive · # trash · s star · r reply · a reply all · f forward · Ctrl+Enter send";
const short = (s: string) => {
  const d = new Date(s);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const full = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Message HTML inside a locked-down document. */
function frameDoc(html: string, images: boolean) {
  const csp = `default-src 'none'; style-src 'unsafe-inline'; img-src data:${images ? " https:" : ""}; font-src data:`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`
    + `<base target="_blank"><style>body{font-family:Arial,sans-serif;font-size:14px;color:#111;margin:12px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

export function InboxView({ isDark, onUnreadChange }: { isDark: boolean; onUnreadChange?: (n: number) => void }) {
  const t = saTheme(isDark);
  const [boxes, setBoxes] = useState<McMailbox[] | null>(null);
  const [mailbox, setMailbox] = useState<number | null>(null);
  const [folder, setFolder] = useState<Folder>("INBOX");
  const [drafts, setDrafts] = useState<McDraft[] | null>(null);
  const [compose, setCompose] = useState<McDraft | null>(null);
  const [cursor, setCursor] = useState(0);
  const [showKeys, setShowKeys] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<McThreadRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<McThread | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const btn = `inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${t.btn}`;

  const loadBoxes = useCallback(() => {
    mcMailboxes().then((b) => { setBoxes(b.mailboxes); onUnreadChange?.(b.unreadTotal); }).catch(() => setBoxes([]));
  }, [onUnreadChange]);

  const load = useCallback(() => {
    setLoadError(null); setRows(null); setSelected(new Set()); setCursor(0);
    if (folder === "DRAFTS") {
      setDrafts(null);
      mcDrafts(mailbox).then((d) => { setDrafts(d); setRows([]); setHasMore(false); }).catch((e) => setLoadError(errText(e)));
      return;
    }
    mcThreads({ mailbox, folder: folder as McFolder, q: q.trim() })
      .then((r) => { setRows(r.rows); setHasMore(r.hasMore); })
      .catch((e) => setLoadError(errText(e)));
  }, [mailbox, folder, q]);

  useEffect(() => { loadBoxes(); }, [loadBoxes]);
  useEffect(() => { const h = window.setTimeout(load, 250); return () => window.clearTimeout(h); }, [load]);

  const loadOlder = async () => {
    if (!rows?.length) return;
    const last = rows[rows.length - 1];
    setMoreBusy(true);
    try {
      const r = await mcThreads({ mailbox, folder: folder as McFolder, q: q.trim(), before: last.lastMessageAt, beforeId: last.id });
      setRows([...rows, ...r.rows]); setHasMore(r.hasMore);
    } catch (e) { setLoadError(errText(e)); } finally { setMoreBusy(false); }
  };

  const act = async (ids: number[], action: McInboxAction) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      await mcInboxAction(ids, action);
      if (open && ids.includes(open.id)) {
        if (["ARCHIVE", "TRASH", "RESTORE", "UNARCHIVE"].includes(action)) setOpen(null);
        else setOpen({ ...open, starred: action === "STAR" ? true : action === "UNSTAR" ? false : open.starred });
      }
      load(); loadBoxes();
    } catch (e) { setLoadError(errText(e)); } finally { setBusy(false); }
  };

  const openThread = async (id: number) => {
    setOpenError(null); setShowImages(false);
    try {
      const th = await mcThread(id);
      setOpen(th);
      if (th.messages.some((m) => m.direction === "IN" && !m.read)) {
        await mcInboxAction([id], "READ");
        setRows((r) => r?.map((x) => (x.id === id ? { ...x, unread: 0 } : x)) ?? r);
        loadBoxes();
      }
    } catch (e) { setOpenError(errText(e)); }
  };

  const startCompose = async (mode: McComposeMode, sourceMessageId?: number) => {
    if (compose) { window.alert("Finish or close the message you're writing first."); return; }
    const from = mode === "NEW" ? (mailbox ?? boxes?.find((b) => b.status === "ACTIVE")?.id ?? null) : null;
    if (mode === "NEW" && from == null) { window.alert("Create an active Mail ID first."); return; }
    try { setCompose(await mcCreateDraft({ identityId: from, mode, sourceMessageId })); }
    catch (e) { setOpenError(errText(e)); }
  };
  const lastMessageId = open ? open.messages[open.messages.length - 1]?.id : undefined;

  // Keyboard shortcuts (IN16/IN17). Ignored while typing in a field or while composing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (compose || e.ctrlKey || e.metaKey || e.altKey) return;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const list = rows ?? [];
      const cur = list[cursor];
      const target = open ?? cur;
      const run = (fn: () => void) => { e.preventDefault(); fn(); };
      switch (e.key) {
        case "c": run(() => startCompose("NEW")); break;
        case "/": run(() => (document.querySelector('input[aria-label="Search mail"]') as HTMLInputElement | null)?.focus()); break;
        case "j": run(() => setCursor((i) => Math.min(i + 1, Math.max(list.length - 1, 0)))); break;
        case "k": run(() => setCursor((i) => Math.max(i - 1, 0))); break;
        case "o": case "Enter": if (cur) run(() => openThread(cur.id)); break;
        case "u": run(() => setOpen(null)); break;
        case "e": if (target) run(() => act([target.id], "ARCHIVE")); break;
        case "#": if (target) run(() => act([target.id], "TRASH")); break;
        case "s": if (target) run(() => act([target.id], target.starred ? "UNSTAR" : "STAR")); break;
        case "r": if (open && lastMessageId) run(() => startCompose("REPLY", lastMessageId)); break;
        case "a": if (open && lastMessageId) run(() => startCompose("REPLY_ALL", lastMessageId)); break;
        case "f": if (open && lastMessageId) run(() => startCompose("FORWARD", lastMessageId)); break;
        case "?": run(() => setShowKeys((x) => !x)); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = !!rows?.length && rows.every((r) => selected.has(r.id));
  const sel = [...selected];

  if (boxes && boxes.length === 0) {
    return <p className={`text-sm ${t.muted}`}>No Mail IDs yet. Create one under Mail IDs; once receiving is set up, its mail appears here.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Mailbox" className={`rounded-xl border px-3 py-2 text-sm ${t.input}`} value={mailbox ?? ""}
          onChange={(e) => { setMailbox(e.target.value ? Number(e.target.value) : null); setOpen(null); }}>
          <option value="">All Mail IDs{boxes ? ` (${boxes.reduce((s, b) => s + b.unread, 0)} unread)` : ""}</option>
          {boxes?.map((b) => <option key={b.id} value={b.id}>{b.address}{b.unread ? ` (${b.unread})` : ""}{b.receiveReady ? "" : " · not receiving yet"}</option>)}
        </select>
        <div role="tablist" aria-label="Folder" className="flex flex-wrap gap-1">
          {FOLDERS.map((f) => (
            <button key={f.v} type="button" role="tab" aria-selected={folder === f.v} onClick={() => { setFolder(f.v); setOpen(null); }}
              className={`min-h-8 rounded-full border px-3 text-xs font-bold ${folder === f.v ? t.chipActive : t.chipInactive}`}>{f.l}</button>
          ))}
        </div>
        <input type="search" aria-label="Search mail" placeholder="Search subject, sender, text" value={q} onChange={(e) => setQ(e.target.value)}
          className={`ml-auto w-full max-w-xs rounded-xl border px-3 py-2 text-sm ${t.input}`} />
        <button type="button" aria-label="Refresh" onClick={() => { load(); loadBoxes(); }} className={btn}><RefreshCw className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Keyboard shortcuts" onClick={() => setShowKeys((x) => !x)} className={btn}><Keyboard className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => startCompose("NEW")} className={`${btn} ${t.btnAccent}`}><PencilLine className="h-3.5 w-3.5" /> Compose</button>
      </div>
      {showKeys && <p className={`text-xs ${t.muted}`}>Shortcuts: {SHORTCUTS}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className={`${open ? "hidden lg:block" : ""} space-y-2`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows?.map((r) => r.id)))} aria-label="Select all loaded conversations" />
              {selected.size ? `${selected.size} selected` : "Select"}
            </label>
            {selected.size > 0 && (
              <>
                {folder === "TRASH"
                  ? <button type="button" disabled={busy} onClick={() => act(sel, "RESTORE")} className={btn}><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
                  : <>
                      <button type="button" disabled={busy} onClick={() => act(sel, "ARCHIVE")} className={btn} aria-label="Archive"><Archive className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={busy} onClick={() => act(sel, "TRASH")} className={btn} aria-label="Move to trash"><Trash2 className="h-3.5 w-3.5" /></button>
                    </>}
                <button type="button" disabled={busy} onClick={() => act(sel, "READ")} className={btn} aria-label="Mark read"><MailOpen className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={busy} onClick={() => act(sel, "UNREAD")} className={btn} aria-label="Mark unread"><Mail className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={busy} onClick={() => act(sel, "STAR")} className={btn} aria-label="Star"><Star className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>

          {folder === "DRAFTS" && !loadError ? (
            drafts == null ? <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
            : drafts.length === 0 ? <p className={`py-8 text-center text-sm ${t.muted}`}>No drafts.</p>
            : (
              <ul className={`divide-y overflow-hidden rounded-2xl border ${t.card}`}>
                {drafts.map((dr) => (
                  <li key={dr.id}>
                    <button type="button" onClick={() => (compose ? window.alert("Close the open message first.") : setCompose(dr))} className="w-full p-2.5 text-left">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-red-500">Draft</span>
                        <span className={`truncate text-sm ${t.text}`}>{dr.to || "(no recipients)"}</span>
                        <span className={`ml-auto text-3xs ${t.muted}`}>{short(dr.updatedAt)}</span>
                      </div>
                      <p className={`truncate text-xs ${t.text}`}>{dr.subject || "(no subject)"}</p>
                      <p className={`truncate text-3xs ${t.muted}`}>{dr.mailbox} · last edited by {dr.updatedBy ?? "—"}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : loadError ? (
            <p role="alert" className="text-sm text-red-500">Couldn&apos;t load mail: {loadError} <button type="button" className="underline" onClick={load}>Try again</button></p>
          ) : rows == null ? (
            <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
          ) : rows.length === 0 ? (
            <p className={`py-8 text-center text-sm ${t.muted}`}>{q ? "No mail matches." : folder === "TRASH" ? "Trash is empty." : "Nothing here yet."}</p>
          ) : (
            <ul className={`divide-y overflow-hidden rounded-2xl border ${t.card}`}>
              {rows.map((r) => (
                <li key={r.id} className={`flex items-start gap-2 p-2.5 ${open?.id === r.id ? "bg-sky-500/10" : ""} ${rows.indexOf(r) === cursor ? "ring-1 ring-inset ring-sky-500/50" : ""}`}>
                  <input type="checkbox" className="mt-1" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.subject}`} />
                  <button type="button" aria-label={r.starred ? "Unstar" : "Star"} onClick={() => act([r.id], r.starred ? "UNSTAR" : "STAR")} className="mt-0.5">
                    <Star className={`h-3.5 w-3.5 ${r.starred ? "fill-amber-400 text-amber-400" : t.muted}`} />
                  </button>
                  <button type="button" onClick={() => openThread(r.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2">
                      <span className={`truncate text-sm ${r.unread ? `font-black ${t.heading}` : t.text}`}>{r.fromName || r.fromAddress || "(unknown)"}</span>
                      {r.messageCount > 1 && <span className={`text-3xs ${t.muted}`}>{r.messageCount}</span>}
                      <span className={`ml-auto shrink-0 text-3xs ${t.muted}`}>{short(r.lastMessageAt)}</span>
                    </div>
                    <p className={`truncate text-xs ${r.unread ? `font-bold ${t.heading}` : t.text}`}>{r.subject}</p>
                    <p className={`truncate text-3xs ${t.muted}`}>{r.snippet}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {mailbox == null && r.mailbox && <span className={`rounded-full border px-1.5 text-3xs ${t.badgeAccent}`}>{r.mailbox}</span>}
                      {r.campaignName && <span className="rounded-full bg-sky-500/15 px-1.5 text-3xs text-sky-600">Reply to “{r.campaignName}”</span>}
                      {r.automated && <span className="rounded-full bg-stone-500/15 px-1.5 text-3xs text-stone-500">Automated</span>}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <button type="button" disabled={moreBusy} onClick={loadOlder} className={`${btn} w-full justify-center`}>
              {moreBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load older
            </button>
          )}
        </div>

        <div className={`${open ? "" : "hidden lg:block"} min-w-0`}>
          {openError && <p role="alert" className="text-sm text-red-500">{openError}</p>}
          {!open ? (
            <p className={`hidden py-16 text-center text-sm lg:block ${t.muted}`}>Choose a conversation to read it.</p>
          ) : (
            <div className={`space-y-3 rounded-2xl border p-4 ${t.card}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setOpen(null)} className={btn}><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
                {open.trashed
                  ? <button type="button" onClick={() => act([open.id], "RESTORE")} className={btn}><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
                  : <>
                      <button type="button" onClick={() => act([open.id], open.archived ? "UNARCHIVE" : "ARCHIVE")} className={btn}>
                        {open.archived ? <><ArchiveRestore className="h-3.5 w-3.5" /> Move to inbox</> : <><Archive className="h-3.5 w-3.5" /> Archive</>}
                      </button>
                      <button type="button" onClick={() => act([open.id], "TRASH")} className={btn}><Trash2 className="h-3.5 w-3.5" /> Trash</button>
                    </>}
                <button type="button" onClick={() => { act([open.id], "UNREAD"); setOpen(null); }} className={btn}><Mail className="h-3.5 w-3.5" /> Mark unread</button>
                <button type="button" onClick={() => act([open.id], open.starred ? "UNSTAR" : "STAR")} className={btn}>
                  <Star className={`h-3.5 w-3.5 ${open.starred ? "fill-amber-400 text-amber-400" : ""}`} /> {open.starred ? "Starred" : "Star"}
                </button>
                <label className="ml-auto flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={showImages} onChange={(e) => setShowImages(e.target.checked)} /> Show images
                </label>
              </div>
              <div>
                <h3 className={`text-lg font-black ${t.heading}`}>{open.subject}</h3>
                <p className={`text-xs ${t.muted}`}>
                  {open.mailbox}{open.campaignName ? ` · reply to campaign “${open.campaignName}”` : ""}{open.automated ? " · automated (not a person)" : ""}
                </p>
              </div>
              {open.messages.map((m, i) => (
                <details key={m.id} open={i === open.messages.length - 1 || !m.read} className={`rounded-xl border p-3 ${t.cardFlat}`}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-baseline gap-2 text-xs">
                      <span className={`font-bold ${t.heading}`}>{m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}</span>
                      {m.direction === "OUT" && <span className="rounded-full bg-emerald-500/15 px-1.5 text-3xs text-emerald-600">Sent</span>}
                      {m.automated && <span className="rounded-full bg-stone-500/15 px-1.5 text-3xs text-stone-500">Automated</span>}
                      <span className={`ml-auto ${t.muted}`}>{full(m.sentAt ?? m.receivedAt)}</span>
                    </div>
                    <p className={`text-3xs ${t.muted}`}>To: {m.to.join(", ") || "—"}{m.cc.length ? ` · Cc: ${m.cc.join(", ")}` : ""}</p>
                  </summary>
                  <div className="mt-2">
                    {m.skippedParts ? <p className="mb-1 text-3xs text-amber-500">{m.skippedParts} part(s) of this email couldn&apos;t be read.</p> : null}
                    {m.html ? (
                      <iframe title={`Message from ${m.fromAddress ?? "sender"}`} sandbox="allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={frameDoc(m.html, showImages)} className="h-[420px] w-full rounded-lg border bg-white" />
                    ) : (
                      <pre className={`whitespace-pre-wrap break-words font-sans text-sm ${t.text}`}>{m.text ?? "(empty message)"}</pre>
                    )}
                    {m.attachments.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {m.attachments.map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => mcDownloadInboxAttachment(a.id, a.fileName).catch((e) => setOpenError(errText(e)))}
                              className={btn}><Paperclip className="h-3.5 w-3.5" /> {a.fileName} <span className={t.muted}>{kb(a.sizeBytes)}</span></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))}
              {!open.trashed && lastMessageId && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => startCompose("REPLY", lastMessageId)} className={btn}><Reply className="h-3.5 w-3.5" /> Reply</button>
                  <button type="button" onClick={() => startCompose("REPLY_ALL", lastMessageId)} className={btn}><ReplyAll className="h-3.5 w-3.5" /> Reply all</button>
                  <button type="button" onClick={() => startCompose("FORWARD", lastMessageId)} className={btn}><Forward className="h-3.5 w-3.5" /> Forward</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {compose && boxes && (
        <ComposeWindow draft={compose} mailboxes={boxes} isDark={isDark}
          onClose={() => { setCompose(null); if (folder === "DRAFTS") load(); }}
          onSent={async (threadId) => { setCompose(null); load(); loadBoxes(); await openThread(threadId); }} />
      )}
    </div>
  );
}
