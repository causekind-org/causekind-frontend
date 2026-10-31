"use client";

import { useTranslations } from "next-intl";
import { UiText, useUiText } from "@/components/UiText";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

/** Drive notices (NgoDriveNotifier) link here; nothing else does. */
const DRIVE_LINK = /^\/(dashboard\/ngo|ngo\/drives\/|ngo-drive-offers\/|drives\/\d+\/proof|dashboard\?segment=ngo|dashboard\/history\?type=drive)/;
export const isDriveNotice = (n: Pick<AppNotification, "id" | "link">) => n.id.startsWith("n-") && DRIVE_LINK.test(n.link ?? "");

const DISMISSED_KEY = "ck_drive_dock_dismissed_v1";
const dismissKey = (n: AppNotification) => `${n.id}@${n.timestamp}`;
function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveDismissed(keys: Set<string>) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys].slice(-200))); } catch { /* private mode */ }
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
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const waiting = notifications.filter((n) => isDriveNotice(n) && isUnread(n) && !dismissed.has(dismissKey(n)));
  const current = waiting[0];

  const dismiss = useCallback((n: AppNotification) => {
    setDismissed((prev) => { const next = new Set(prev).add(dismissKey(n)); saveDismissed(next); return next; });
  }, []);
  const open = useCallback((n: AppNotification) => {
    markRead(n.id);
    router.push(n.link);
  }, [markRead, router]);

  if (!user || !current) return null;
  const label = primaryLabel(current);

  return (
    <div role="status" aria-live="polite" data-testid="drive-notification-dock"
      className="fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-3xl flex-col gap-3 rounded-3xl bg-stone-900 p-3 pl-4 text-white shadow-[0_24px_50px_-18px_rgba(28,20,16,0.6)] sm:bottom-6 sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--ck-role-accent,#c4561c)] px-2 text-sm font-black" aria-label={t("unread", { count: waiting.length })}>{waiting.length}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{current.title}</p>
          <p className="truncate text-xs text-stone-300">{current.body}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {label !== "View details" && (
          <button type="button" onClick={() => open(current)}
            className="inline-flex h-11 items-center rounded-full border border-white/30 px-4 text-sm font-extrabold text-white hover:bg-white/10">
            <UiText>View details</UiText>
          </button>
        )}
        <button type="button" onClick={() => open(current)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ck-role-accent,#c4561c)] px-5 text-sm font-black text-white hover:brightness-110">
          {actionLabels[label] ?? label}
        </button>
        <button type="button" aria-label={ui("Close (it stays in your notifications)")} onClick={() => dismiss(current)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
