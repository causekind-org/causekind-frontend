"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Package, Truck, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyNotifications, markNotificationRead, type SavedNotification } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const TYPE = "pickup_scheduled";

/**
 * The notice body: "Asha · 5 Blankets · 5 Nov 2026, 10:00 AM IST · Andheri, Mumbai". Older notices
 * carry only the time and area, as one line.
 */
export function pickupDetails(body: string | null | undefined) {
  const parts = (body ?? "").split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return { donor: null, item: null, when: parts[0] ?? "", area: parts[1] ?? null };
  const area = parts.length >= 4 ? parts[3] : null;
  return { donor: parts[0], item: parts[1], when: parts[2], area };
}

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
      <DialogContent data-testid="pickup-scheduled-popup" data-ck-role-theme="ngo"
        className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md gap-5 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-ngo-50 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300">
            <Truck className="size-7" aria-hidden />
          </span>
          <DialogTitle className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Donor scheduled a pickup</DialogTitle>
          <DialogDescription className="text-sm text-stone-600 dark:text-stone-300">Choose who will collect the items.</DialogDescription>
        </div>
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const d = pickupDetails(r.body);
            const href = r.link ?? "/dashboard/ngo?tab=activity&filter=handovers";
            return (
              <li key={r.id} data-testid="pickup-scheduled-row" className="space-y-3">
                <dl className="space-y-2 rounded-xl bg-stone-50 p-4 text-sm text-stone-800 dark:bg-zinc-800/60 dark:text-stone-200">
                  {([[UserRound, "Donor", d.donor], [Package, "Item", d.item], [CalendarDays, "When", d.when], [MapPin, "Area", d.area]] as const).map(([Icon, label, value]) => value && (
                    <div key={label} className="flex items-start gap-2.5">
                      <dt className="mt-0.5 shrink-0 text-ngo-700 dark:text-ngo-300"><Icon className="size-4" aria-hidden /><span className="sr-only">{label}</span></dt>
                      <dd className="min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Link href={href} onClick={close}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-ngo-700 px-5 text-sm font-bold text-white hover:bg-ngo-800">
                  Assign a person
                </Link>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={close} className="mx-auto mt-2 block min-h-11 px-4 text-sm font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-300">Later</button>
      </DialogContent>
    </Dialog>
  );
}
