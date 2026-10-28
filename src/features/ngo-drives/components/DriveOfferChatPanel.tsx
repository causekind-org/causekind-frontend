"use client";

import { useEffect, useState } from "react";
import { Lock, MessageCircle } from "lucide-react";
import MatchChatWindow, { type ChatEndpoints } from "@/components/MatchChatWindow";
import { driveOfferChat } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
/** The chat opens when the NGO accepts and is writable until the handover window closes. */
export const DRIVE_CHAT_WRITABLE = new Set([
  "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK",
  "ISSUE_WINDOW_OPEN", "ISSUE_RAISED",
]);
/** After it ends: read-only history, as in the donor↔donee handover chat. */
export const DRIVE_CHAT_READ_ONLY = new Set(["COMPLETED", "CANCELLED", "ENDED", "WITHDRAWN", "ADMIN_REJECTED"]);

export const DRIVE_CHAT_ENDPOINTS: ChatEndpoints = {
  source: "DRIVE_OFFER",
  messages: driveOfferChat.messages,
  since: driveOfferChat.since,
  send: driveOfferChat.send,
  markRead: driveOfferChat.markRead,
};

/**
 * Chat between a drive offer's donor and the drive's NGO, on both handover pages.
 * The shared chat window does the work; only the endpoints differ.
 */
export function DriveOfferChatPanel({ offerId, status, role }: { offerId: number; status: string; role: "DONOR" | "NGO" }) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const { user } = useAuth();
  const writable = DRIVE_CHAT_WRITABLE.has(status);
  const visible = writable || DRIVE_CHAT_READ_ONLY.has(status);
  const [open, setOpen] = useState(role === "NGO");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!visible || open) return;
    let live = true;
    const check = () => driveOfferChat.unreadCount(offerId).then(r => { if (live) setUnread(r.count); }).catch(() => {});
    void check();
    const t = setInterval(check, 15_000);
    return () => { live = false; clearInterval(t); };
  }, [offerId, visible, open]);

  if (!visible) {
    return (
      <p className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400" data-testid="drive-chat-locked">
        <Lock className="h-4 w-4" aria-hidden /> <UiText>Chat opens once the NGO accepts the offer.</UiText>
      </p>
    );
  }

  const title = role === "DONOR" ? ui("Chat with NGO") : ui("Chat with donor");
  return (
    <div className="space-y-2" data-testid="drive-chat">
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setUnread(0); }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-left transition-colors hover:bg-[var(--handover-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--handover-accent)] text-[var(--handover-on-accent)]">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <span className="flex-1 text-sm font-semibold text-stone-800 dark:text-stone-200">{title}</span>
          {unread > 0 && (
            <span data-testid="drive-chat-unread" className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white" aria-label={df("unreadCount", { count: unread })}>
              {unread}
            </span>
          )}
        </button>
      ) : (
        <MatchChatWindow matchId={offerId} currentUserEmail={user?.email ?? ""} endpoints={DRIVE_CHAT_ENDPOINTS} locked={!writable}
          emptyText={role === "DONOR" ? ui("Say hello to the NGO.") : ui("No messages from the donor yet.")} />
      )}
      {!writable && <p className="text-xs text-stone-500 dark:text-stone-400"><UiText>This chat is closed. You can still read it.</UiText></p>}
    </div>
  );
}
