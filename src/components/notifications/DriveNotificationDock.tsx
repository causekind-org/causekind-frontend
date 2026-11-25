"use client";

import { useTranslations } from "next-intl";
import { UiText, useUiText } from "@/components/UiText";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

/** Drive notices (NgoDriveNotifier) link here; nothing else does. */
const DRIVE_LINK = /^\/(dashboard\/ngo|ngo\/drives\/|ngo-drive-offers\/|drives\/\d+\/proof|dashboard\?segment=ngo|dashboard\/history\?type=drive)/;
export const isDriveNotice = (n: Pick<AppNotification, "id" | "link">) => n.id.startsWith("n-") && DRIVE_LINK.test(n.link ?? "");

/**
 * Notices this browser has already shown in the dock, by id. Each notice pops up once:
 * it stays until the NGO acts on it, closes it or leaves the page, and never comes back
 * (it was keyed by id@timestamp before, so a refreshed timestamp showed it again).
 * It always stays in the bell.
 */
const SHOWN_KEY = "ck_drive_dock_shown_v2";
function loadShown(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveShown(keys: Set<string>) {
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify([...keys].slice(-300))); } catch { /* private mode */ }
}

/** The one action for a notice, from where it leads (see NgoDriveLinks). */
export function primaryLabel(n: Pick<AppNotification, "title" | "link">): string {
  const link = n.link ?? "";
  if (link.includes("filter=offers")) return "Review offer";
  if (link.includes("filter=proof")) return "Upload proof";
  if (/^\/drives\/\d+\/proof/.test(link)) return "View proof";
  if (link.startsWith("/ngo-drive-offers/")) return "Arrange handover";
  if (link.includes("filter=handovers") && /planned|rescheduled/i.test(n.title)) return "View handover";
  if (link.startsWith("/ngo/drives/") || link.includes("tab=drives")) return "View drive";
  return "View details";
}

/**
 * The bottom dock, on any page, for unread drive notices (NGO and donor): count circle,
 * title, subtitle, View details, one primary action, X. The action marks the notice read
 * and opens it; X only hides it here (it stays unread in the bell). Same look as the
 * match dock (MatchActionDock).
 */
export function DriveNotificationDock() {
  const ui = useUiText();
  const t = useTranslations("globalPrompts");
  const actionLabels: Record<string, string> = {
    "Review offer": ui("Review offer"),
    "Upload proof": ui("Upload proof"),
    "View proof": ui("View proof"),
    "Arrange handover": ui("Arrange handover"),
    "View handover": ui("View handover"),
    "View drive": ui("View drive"),
    "View details": ui("View details"),
  };
  const { user } = useAuth();
  const router = useRouter();
  const { notifications, isUnread, markRead } = useNotifications();
  const [shown] = useState<Set<string>>(() => loadShown());
  // The notice on screen now. Picked once from the unread drive notices never shown before,
  // then remembered as shown so it can't pop up a second time.
  const [currentId, setCurrentId] = useState<string | null>(null);

  const fresh = notifications.filter((n) => isDriveNotice(n) && isUnread(n) && !shown.has(n.id));
  const nextId = fresh[0]?.id ?? null;
  useEffect(() => {
    if (currentId || !nextId) return;
    shown.add(nextId);
    saveShown(shown);
    setCurrentId(nextId);
  }, [currentId, nextId, shown]);

  const current = currentId ? notifications.find((n) => n.id === currentId && isUnread(n)) : undefined;
  const remaining = 1 + notifications.filter((n) => isDriveNotice(n) && isUnread(n) && !shown.has(n.id) && n.id !== currentId).length;

  const dismiss = useCallback(() => { setCurrentId(null); }, []);
  const open = useCallback((n: AppNotification) => {
    markRead(n.id);
    setCurrentId(null);
    router.push(n.link);
  }, [markRead, router]);

  if (!user || !current) return null;
  const label = primaryLabel(current);

  return (
    <div role="status" aria-live="polite" data-testid="drive-notification-dock"
      className="fixed inset-x-3 bottom-[calc(var(--ck-bottom-chrome,0px)+0.75rem)] z-[60] mx-auto max-w-3xl rounded-3xl bg-stone-900 p-4 pr-12 text-white shadow-[0_24px_50px_-18px_rgba(28,20,16,0.6)] sm:bottom-6 sm:p-5 sm:pr-14">
      {/* Close: top-right corner. The notice stays in the bell. */}
      <button type="button" aria-label={ui("Close (it stays in your notifications)")} onClick={dismiss} data-testid="drive-dock-close"
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white">
        <X className="h-5 w-5" aria-hidden />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ck-role-accent,#c4561c)] px-2 text-sm font-black" aria-label={t("unread", { count: remaining })}>{remaining}</span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-snug sm:truncate">{current.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-300 sm:truncate">{current.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {label !== "View details" && (
            <button type="button" onClick={() => open(current)}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/30 px-4 text-sm font-extrabold text-white hover:bg-white/10 sm:flex-none">
              <UiText>View details</UiText>
            </button>
          )}
          <button type="button" onClick={() => open(current)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ck-role-accent,#c4561c)] px-5 text-sm font-black text-white hover:brightness-110 sm:flex-none">
            {actionLabels[label] ?? label}
          </button>
        </div>
      </div>
    </div>
  );
}
