"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Handshake, ShieldCheck, CheckCircle2, Info, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

const TYPE_ICON = {
  match:     { Icon: Handshake,    bg: "bg-sky-100 dark:bg-sky-900/30",     ic: "text-sky-600 dark:text-sky-400"    },
  approved:  { Icon: ShieldCheck,  bg: "bg-emerald-100 dark:bg-emerald-900/30", ic: "text-emerald-600 dark:text-emerald-400" },
  fulfilled: { Icon: CheckCircle2, bg: "bg-[#b04a15]/10",                   ic: "text-[#b04a15]"                    },
  info:      { Icon: Info,         bg: "bg-stone-100 dark:bg-zinc-800",      ic: "text-stone-500 dark:text-stone-400" },
};

function NotifItem({ n }: { n: AppNotification }) {
  const cfg = TYPE_ICON[n.type];
  return (
    <Link href={n.link} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition-colors rounded-xl group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
        <cfg.Icon className={`w-4 h-4 ${cfg.ic}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">{n.title}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
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
