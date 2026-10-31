"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyNotifications, markNotificationRead, type SavedNotification } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const TYPE = "pickup_scheduled";

/** Another load-time overlay is on screen: wait for it instead of stacking on top. */
const blocked = () => sessionStorage.getItem("ck_welcome_pending") === "1" || !!document.querySelector(".ck-cat-backdrop-el");

/**
 * "Donor scheduled a pickup": driven by the NGO's unread pickup_scheduled notifications, live or on
 * the next visit. Showing one marks it read on the server, so each offer's popup appears once.
 */
export function DrivePickupScheduledPopup() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedNotification[]>([]);
  const handled = useRef(new Set<string>());

  const load = useCallback(async () => {
    const unread = (await getMyNotifications().catch(() => [] as SavedNotification[]))
      .filter((n) => n.type === TYPE && !n.read && !handled.current.has(n.id));
    if (unread.length === 0) return;
    unread.forEach((n) => handled.current.add(n.id));
    const show = () => {
      setRows((cur) => [...cur, ...unread]);
      unread.forEach((n) => { void markNotificationRead(n.id).catch(() => {}); });
    };
    if (!blocked()) return show();
    const wait = setInterval(() => { if (!blocked()) { clearInterval(wait); show(); } }, 1000);
  }, []);

  const userId = user?.id ?? user?.email ?? null;
  useEffect(() => { if (userId != null) void load(); }, [userId, load]);
  useEntityUpdates(["NGO_DRIVE_OFFER"], () => { if (userId != null) void load(); });

  if (rows.length === 0) return null;
  const close = () => setRows([]);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent data-testid="pickup-scheduled-popup" className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--ck-role-accent)]/15 text-[var(--ck-role-accent)]">
            <Truck className="size-7" aria-hidden />
          </span>
          <DialogTitle className="font-serif text-xl font-bold">Donor scheduled a pickup</DialogTitle>
          <DialogDescription className="sr-only">Choose who will collect the items.</DialogDescription>
        </div>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} data-testid="pickup-scheduled-row" className="flex flex-col gap-2 rounded-xl border border-stone-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700">
              <span className="min-w-0 break-words text-stone-800 dark:text-stone-200">{r.body}</span>
              <Link href={r.link ?? "/dashboard/ngo?tab=activity&filter=handovers"} onClick={close}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white hover:brightness-110">
                Assign a person
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" onClick={close} className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-semibold dark:border-zinc-700">Later</button>
      </DialogContent>
    </Dialog>
  );
}
