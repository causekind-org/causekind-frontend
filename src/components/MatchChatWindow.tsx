"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMatchChatMessages,
  getMatchChatMessagesSince,
  sendMatchChatMessage,
  markMatchChatMessagesRead,
  type ChatMessage,
} from "@/lib/api";

interface Props {
  matchId: number;
  currentUserEmail: string;
  locked?: boolean;
  className?: string;
}

const POLL_INTERVAL_MS = 5_000;

export default function MatchChatWindow({ matchId, currentUserEmail, locked = false, className = "" }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentAt = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    getMatchChatMessages(matchId)
      .then((msgs) => {
        setMessages(msgs);
        if (msgs.length > 0) lastSentAt.current = msgs[msgs.length - 1].sentAt;
        markMatchChatMessagesRead(matchId).catch(() => {});
      })
      .catch(() => {});
  }, [matchId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling fallback — covers SSE reconnect gaps, same dual SSE+poll pattern as ChatWindow.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const since = lastSentAt.current ?? new Date(0).toISOString();
        const newMsgs = await getMatchChatMessagesSince(matchId, since);
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            lastSentAt.current = fresh[fresh.length - 1].sentAt;
            markMatchChatMessagesRead(matchId).catch(() => {});
            return [...prev, ...fresh];
          });
        }
      } catch {
        // Silent — polling failure is non-critical
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [matchId]);

  // Real-time push — same "ck-chat-message" window event ChatWindow uses, but filtered
  // to source==="MATCH" so an offer and a match sharing the same numeric id don't cross-post.
  useEffect(() => {
    function onPush(e: Event) {
      const detail = (e as CustomEvent).detail as {
        offerId: number; id: number; threadId: number; senderId: number; senderName: string;
        senderEmail: string; content: string; messageType: ChatMessage["messageType"];
        recipientTarget: ChatMessage["recipientTarget"]; sentAt: string; source?: string;
      } | undefined;
      if (!detail || detail.source !== "MATCH" || detail.offerId !== matchId) return;
      const message: ChatMessage = {
        id: detail.id, threadId: detail.threadId, senderId: detail.senderId, senderName: detail.senderName,
        senderEmail: detail.senderEmail, content: detail.content, messageType: detail.messageType,
        recipientTarget: detail.recipientTarget, readAt: null, sentAt: detail.sentAt,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        lastSentAt.current = message.sentAt;
        return [...prev, message];
      });
      markMatchChatMessagesRead(matchId).catch(() => {});
    }
    window.addEventListener("ck-chat-message", onPush);
    return () => window.removeEventListener("ck-chat-message", onPush);
  }, [matchId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || locked) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendMatchChatMessage(matchId, text);
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
    <div className={`flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Messages
        </span>
        {locked && (
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
            Closed
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 380 }}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderEmail === currentUserEmail;
          const isSystem = msg.messageType === "SYSTEM";
          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-500">
                  {msg.content}
                </span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {!isMe && (
                  <p className="mb-0.5 text-xs text-gray-400">{msg.senderName}</p>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    isMe
                      ? "bg-[#b04a15] text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`mt-0.5 text-[10px] text-gray-400 ${isMe ? "text-right" : ""}`}>
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {msg.readAt && isMe && " · Read"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!locked && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
          {error && <p className="mb-1 text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#b04a15] placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 rounded-xl bg-[#b04a15] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#c45520] transition-colors"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
