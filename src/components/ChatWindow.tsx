"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatServerTime } from "@/lib/serverTime";
import {
  getChatMessages,
  getChatMessagesSince,
  sendChatMessage,
  markChatMessagesRead,
  type ChatMessage,
} from "@/lib/api";

interface Props {
  offerId: number;
  currentUserEmail: string;
  locked?: boolean;
  className?: string;
  /**
   * Inside a host card that has its own header and border (the handover hub):
   * no frame, no "Messages" header, and the list fills the height it is given.
   */
  embedded?: boolean;
  /** Shown while the thread is empty. */
  emptyText?: string;
  /** Header title when not embedded. */
  title?: string;
  /** Shortcuts shown above the input (e.g. the purchase hub's delivery-date templates). */
  quickActions?: ReactNode;
  /** Change it to fetch new messages now, e.g. after an action that posts to the thread. */
  refreshKey?: number;
  /** Shown instead of the input once the thread is read-only. */
  lockedText?: string;
}

const ROLE_LABEL: Record<NonNullable<ChatMessage["senderRole"]>, string> = {
  DONOR: "Donor",
  DONEE: "Recipient",
  ADMIN: "CauseKind team",
};

const POLL_INTERVAL_MS = 5_000;

/**
 * The "from the beginning" anchor, used until a thread has a message to anchor on.
 *
 * <p>Deliberately NOT `new Date(0).toISOString()`. That yields
 * `1970-01-01T00:00:00.000Z`, and this API's timestamps are `LocalDateTime` —
 * no zone, no `Z`. The server rejected the suffix and returned 500 on every
 * poll, so every empty chat thread failed forever. The server now accepts both,
 * but sending a shape the API actually speaks is the honest fix.
 */
const EPOCH_SINCE = "1970-01-01T00:00:00";

export default function ChatWindow({
  offerId, currentUserEmail, locked = false, className = "", embedded = false, emptyText = "No messages yet.",
  title = "Offer Messages", quickActions, refreshKey, lockedText,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSentAt = useRef<string | null>(null);
  /** Poll ticks to skip while backing off after failures. */
  const skipTicks = useRef(0);

  // Initial load
  useEffect(() => {
    getChatMessages(offerId)
      .then((msgs) => {
        setMessages(msgs);
        if (msgs.length > 0) lastSentAt.current = msgs[msgs.length - 1].sentAt;
        markChatMessagesRead(offerId).catch(() => {});
      })
      .catch(() => {});
  }, [offerId]);

  // Scroll to bottom on new messages — scroll ONLY the message list, never the
  // page. scrollIntoView walks every scrollable ancestor, so on mount it yanked
  // the whole handover page down to the chat.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Polling for new messages — skips when tab is in background. Kept as a fallback/
  // catch-up path even with the SSE push below (covers the SSE connection dropping,
  // reconnect gaps, etc.) — see [[Decisions and Gotchas]] on the dual SSE+poll pattern.
  useEffect(() => {
    // Consecutive failures back the poll off. Silently swallowing an error and
    // retrying on a fixed 5s timer turned one broken response into hundreds:
    // an empty thread produced a 500 every tick, forever, and nothing in the UI
    // ever said so. Backing off keeps the fallback alive without the flood.
    let failures = 0;

    const interval = setInterval(async () => {
      if (document.hidden) return;
      // 1 failure → skip 1 tick, 2 → 2, capped at 12 (a minute at 5s).
      if (failures > 0 && skipTicks.current > 0) { skipTicks.current -= 1; return; }

      try {
        const newMsgs = await getChatMessagesSince(offerId, lastSentAt.current ?? EPOCH_SINCE);
        failures = 0;
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            lastSentAt.current = fresh[fresh.length - 1].sentAt;
            markChatMessagesRead(offerId).catch(() => {});
            return [...prev, ...fresh];
          });
        }
      } catch (e) {
        failures += 1;
        skipTicks.current = Math.min(failures, 12);
        // Logged once per backoff step rather than never. A poll that has been
        // failing for a minute is worth knowing about; the previous bare
        // `catch {}` is why this ran broken indefinitely without anyone noticing.
        if (failures === 1 || failures % 6 === 0) {
          console.warn(`Chat poll failed for offer ${offerId} (${failures}x)`, e);
        }
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [offerId]);

  // An action elsewhere on the page posted to this thread: catch up now, not on the next tick.
  useEffect(() => {
    if (refreshKey === undefined) return;
    getChatMessagesSince(offerId, lastSentAt.current ?? EPOCH_SINCE)
      .then((newMsgs) => {
        if (newMsgs.length === 0) return;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          lastSentAt.current = fresh[fresh.length - 1].sentAt;
          return [...prev, ...fresh];
        });
      })
      .catch(() => {});
  }, [offerId, refreshKey]);

  // Real-time push — NotificationsProvider's single SSE connection rebroadcasts
  // "chat-message" events as a window CustomEvent; append instantly if it's for
  // this offer, instead of waiting for the next poll tick.
  useEffect(() => {
    function onPush(e: Event) {
      const detail = (e as CustomEvent).detail as {
        offerId: number; id: number; threadId: number; senderId: number; senderName: string;
        senderEmail: string | null; content: string; messageType: ChatMessage["messageType"];
        recipientTarget: ChatMessage["recipientTarget"]; sentAt: string; source?: string;
      } | undefined;
      if (!detail || detail.source !== "OFFER" || detail.offerId !== offerId) return;
      const message: ChatMessage = {
        id: detail.id, threadId: detail.threadId, senderId: detail.senderId, senderName: detail.senderName,
        // Pushes only reach the other participant, so a pushed message is never "mine".
        senderEmail: detail.senderEmail, mine: false, content: detail.content, messageType: detail.messageType,
        recipientTarget: detail.recipientTarget, readAt: null, sentAt: detail.sentAt,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        lastSentAt.current = message.sentAt;
        return [...prev, message];
      });
      markChatMessagesRead(offerId).catch(() => {});
    }
    window.addEventListener("ck-chat-message", onPush);
    return () => window.removeEventListener("ck-chat-message", onPush);
  }, [offerId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || locked) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendChatMessage(offerId, text);
      setMessages((prev) => [...prev, msg]);
      lastSentAt.current = msg.sentAt;
      setInput("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={embedded
      ? `flex min-h-0 flex-col ${className}`
      : `flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}>
      {/* Header (the host card has its own when embedded) */}
      {!embedded && <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </span>
        {locked && (
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
            Closed
          </span>
        )}
      </div>}

      {/* Messages */}
      <div ref={listRef} className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${embedded ? "min-h-0" : ""}`} style={embedded ? undefined : { maxHeight: 380 }}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">{emptyText}</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.mine ?? (!!msg.senderEmail && msg.senderEmail === currentUserEmail);
          const who = msg.senderRole ? `${ROLE_LABEL[msg.senderRole]} · ${msg.senderName}` : msg.senderName;
          if (msg.messageType === "SYSTEM") {
            return (
              <div key={msg.id} className="text-center" data-message-type="SYSTEM">
                <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-500">
                  {msg.content}
                </span>
                <p className="mt-0.5 text-3xs text-gray-400">{formatServerTime(msg.sentAt)}</p>
              </div>
            );
          }
          if (msg.messageType === "DELIVERY_UPDATE") {
            return (
              <div key={msg.id} data-message-type="DELIVERY_UPDATE"
                className="mx-auto max-w-[90%] rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Delivery update · {isMe ? "You" : who}</p>
                <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                <p className="mt-1 text-3xs text-amber-700/80 dark:text-amber-300/70">{formatServerTime(msg.sentAt)}</p>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {!isMe && (
                  <p className="mb-0.5 text-xs text-gray-400">{who}</p>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    isMe
                      ? "bg-[var(--ck-role-accent)] text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`mt-0.5 text-3xs text-gray-400 ${isMe ? "text-right" : ""}`}>
                  {formatServerTime(msg.sentAt)}
                  {msg.readAt && isMe && " · Read"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {locked && lockedText && (
        <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-800">{lockedText}</p>
      )}

      {/* Input */}
      {!locked && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
          {quickActions && <div className="mb-2">{quickActions}</div>}
          {error && <p className="mb-1 text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type a message"
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[var(--ck-role-accent)] placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 rounded-xl bg-[var(--ck-role-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[var(--ck-role-hover)] transition-colors"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
