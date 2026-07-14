"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Handshake, ShieldCheck, Info, X, AlertCircle, PartyPopper, ArrowRight } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

// Each notification type gets its own visual layout so the tray is scannable:
// match = action card with a CTA chip, approved = emerald accent-bar row,
// rejected = red alert card, fulfilled = celebration gradient, info = compact row.
function NotifItem({ n }: { n: AppNotification }) {
  const when = (
    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium shrink-0 whitespace-nowrap">
      {timeAgo(n.receivedAt)}
    </span>
  );

  if (n.type === "match") {
    return (
      <Link href={n.link} className="block mx-2 mb-1.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 px-3.5 py-3 hover:border-sky-400 dark:hover:border-sky-700 transition-colors group">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">{n.title}</p>
              {when}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 rounded-full px-2.5 py-1 group-hover:gap-1.5 transition-all">
              Take action <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (n.type === "approved") {
    return (
      <Link href={n.link} className="flex items-start gap-3 mx-2 mb-1.5 rounded-lg border-l-4 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25 pl-3 pr-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 leading-tight">{n.title}</p>
            {when}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
        </div>
      </Link>
    );
  }

  if (n.type === "rejected") {
    return (
      <Link href={n.link} className="block mx-2 mb-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/25 px-3.5 py-3 hover:border-red-300 dark:hover:border-red-800 transition-colors">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-red-700 dark:text-red-400 leading-tight">{n.title}</p>
              {when}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
          </div>
        </div>
      </Link>
    );
  }

  if (n.type === "fulfilled") {
    return (
      <Link href={n.link} className="block mx-2 mb-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/70 dark:border-amber-900/50 px-3.5 py-3 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#b04a15]/10 dark:bg-[#e07b3a]/15 flex items-center justify-center shrink-0">
            <PartyPopper className="w-4 h-4 text-[#b04a15] dark:text-[#e07b3a]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-extrabold text-[#b04a15] dark:text-[#e07b3a] leading-tight">{n.title}</p>
              {when}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
          </div>
        </div>
      </Link>
    );
  }

  // info — compact neutral row
  return (
    <Link href={n.link} className="flex items-start gap-2.5 mx-2 mb-1 rounded-lg px-3 py-2 hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition-colors">
      <Info className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 leading-tight">{n.title}</p>
          {when}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
      </div>
    </Link>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Don't show for unauthenticated users
  if (!user) return null;

  function toggle() {
    if (!open && unread > 0) markAllRead();
    setOpen(v => !v);
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell trigger */}
      <button
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all duration-200 active:scale-95 bg-white dark:bg-zinc-900"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[#b04a15] text-white text-[9px] font-black px-1 shadow-sm animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute right-0 top-[calc(100%+10px)] w-80 bg-white dark:bg-zinc-900 rounded-2xl border border-[#e5e2d5] dark:border-zinc-800 shadow-2xl shadow-stone-900/10 dark:shadow-zinc-950/40 z-[200] overflow-hidden transition-all duration-200 origin-top-right ${
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-zinc-800">
          <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Notifications</p>
          <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-stone-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">No notifications yet</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">We&apos;ll let you know when something happens.</p>
            </div>
          ) : (
            notifications.map(n => <NotifItem key={n.id} n={n} />)
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-stone-100 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-xs font-bold text-[#b04a15] hover:underline dark:text-[#e07b3a]">
              View dashboard
            </Link>
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">
              <CheckCheck className="w-3.5 h-3.5" /> Mark read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
