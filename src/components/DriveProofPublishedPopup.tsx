"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyNgoDriveOffers, getMyNotifications, markNotificationRead, type SavedNotification } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const TYPE = "proof_published";
const MAX_LISTED = 3;

type Row = { id: string; href: string; title: string; ngoName: string; reached: number | null; photo: string | null };

/** Another load-time overlay is on screen: wait for it instead of stacking on top. */
const blocked = () => sessionStorage.getItem("ck_welcome_pending") === "1" || !!document.querySelector(".ck-cat-backdrop-el");

/**
 * "Your donation was distributed": driven by the donor's unread proof_published notifications, on
 * any page or live. Showing one marks it read on the server, so it never reappears on another device.
 */
export function DriveProofPublishedPopup() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const handled = useRef(new Set<string>());

  const load = useCallback(async () => {
    const unread = (await getMyNotifications().catch(() => [] as SavedNotification[]))
      .filter((n) => n.type === TYPE && !n.read && !handled.current.has(n.id));
    if (unread.length === 0) return;
    const offers = await getMyNgoDriveOffers().catch(() => []);
    const next = unread.map((n): Row => {
      const offerId = Number(/[?&]offer=(\d+)/.exec(n.link ?? "")?.[1]);
      const o = offers.find((x) => x.id === offerId);
      return {
        id: n.id, href: n.link ?? "/dashboard?tab=history",
        title: o?.driveTitle ?? n.body ?? n.title, ngoName: o?.ngoName ?? "",
        reached: o?.driveBeneficiariesReached ?? null,
        photo: resolveMediaUrl(o?.proofPhotoUrls?.[0]) ?? null,
      };
    });
    const show = () => {
      next.forEach((r) => handled.current.add(r.id));
      setRows((cur) => [...(cur ?? []), ...next]);
      next.forEach((r) => { void markNotificationRead(r.id).catch(() => {}); });
    };
    if (!blocked()) return show();
    const wait = setInterval(() => { if (!blocked()) { clearInterval(wait); show(); } }, 1000);
  }, []);

  const userId = user?.id ?? user?.email ?? null;
  useEffect(() => { if (userId != null) void load(); }, [userId, load]);
  useEntityUpdates(["NGO_DRIVE"], () => { if (userId != null) void load(); });

  if (!rows || rows.length === 0) return null;
  const close = () => setRows(null);
  const listed = rows.slice(0, MAX_LISTED);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent data-testid="drive-proof-popup" className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--ck-role-accent)]/15 text-[var(--ck-role-accent)]">
            <PartyPopper className="size-7" aria-hidden />
          </span>
          <DialogTitle className="font-serif text-xl font-bold">Your donation was distributed</DialogTitle>
          <DialogDescription className="sr-only">The NGO shared proof of where your items went.</DialogDescription>
        </div>
        <ul className="space-y-3">
          {listed.map((r) => (
            <li key={r.id} data-testid="drive-proof-popup-row" className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-zinc-700">
              {r.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage link
                <img src={r.photo} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 text-sm">
                <p className="break-words font-semibold text-stone-900 dark:text-stone-100">{r.title}</p>
                {r.ngoName && <p className="text-xs text-stone-600 dark:text-stone-300">{r.ngoName}</p>}
                {r.reached != null && <p className="text-xs text-stone-600 dark:text-stone-300">{r.reached} people reached</p>}
              </div>
            </li>
          ))}
        </ul>
        {rows.length > MAX_LISTED && <p className="text-center text-xs text-stone-500">and {rows.length - MAX_LISTED} more</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-semibold dark:border-zinc-700">Later</button>
          <Link href={listed[0].href} onClick={close}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--ck-role-accent)] px-5 text-sm font-bold text-white hover:brightness-110">
            See the proof
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
