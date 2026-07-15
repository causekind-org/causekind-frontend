"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import MatchChatWindow from "@/components/MatchChatWindow";

// Floating chat preview — same MatchChatWindow (and thus the exact same thread,
// polling + SSE push) as the Handover Hub page, just docked bottom-right in a
// springy popup. Bottom sheet with a backdrop on mobile.

const ACCENTS = {
  copper: { bar: "bg-[#b04a15]", dot: "bg-orange-200" },
  navy:   { bar: "bg-[#1e3a60]", dot: "bg-blue-200" },
} as const;

export default function MatchChatPopup({
  matchId, partnerName, itemTitle, currentUserEmail, accent = "copper", locked = false, onClose,
}: {
  matchId: number;
  partnerName: string;
  itemTitle?: string | null;
  currentUserEmail: string;
  accent?: keyof typeof ACCENTS;
  locked?: boolean;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const colors = ACCENTS[accent];

  function requestClose() {
    setClosing(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Backdrop — mobile only, tap to dismiss */}
      <div
        className={`fixed inset-0 z-[69] bg-black/30 sm:hidden ${closing ? "opacity-0 transition-opacity duration-200" : "animate-chat-backdrop-in"}`}
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-label={`Chat with ${partnerName}`}
        onAnimationEnd={() => { if (closing) onClose(); }}
        className={`fixed z-[70] inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px] ${closing ? "animate-chat-pop-out" : "animate-chat-pop-in"}`}
      >
        <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/25 ring-1 ring-black/10 dark:ring-white/10">
          {/* Header */}
          <div className={`flex items-center justify-between gap-3 px-4 py-3 text-white ${colors.bar}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                <MessageCircle className="h-4 w-4" />
                <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${colors.dot}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">{partnerName}</p>
                <p className="truncate text-[11px] text-white/70">
                  {itemTitle ? itemTitle : "Live chat — synced with the Handover Hub"}
                </p>
              </div>
            </div>
            <button
              onClick={requestClose}
              aria-label="Close chat"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Same shared thread as the Handover Hub page */}
          <MatchChatWindow
            matchId={matchId}
            currentUserEmail={currentUserEmail}
            locked={locked}
            className="rounded-none border-0"
          />
        </div>
      </div>
    </>
  );
}
