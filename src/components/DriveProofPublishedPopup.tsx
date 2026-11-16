"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, PartyPopper } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyNgoDriveOffers, getMyNotifications, markNotificationRead, type SavedNotification } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
        id: n.id, href: Number.isFinite(offerId) && offerId > 0 ? `/dashboard?tab=history&offer=${offerId}` : "/dashboard?tab=history",
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
      <DialogContent data-testid="drive-proof-popup" className="max-w-md rounded-2xl">
        <DialogHeader className="flex items-center gap-3 space-y-0" data-testid="drive-proof-popup-header">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ck-role-accent)]/15 text-[var(--ck-role-accent)]">
            <PartyPopper className="size-5" aria-hidden />
          </span>
          <DialogTitle className="font-serif text-lg font-bold">Your donation was distributed</DialogTitle>
          <DialogDescription className="sr-only">The NGO shared proof of where your items went.</DialogDescription>
        </DialogHeader>
        <DialogBody data-testid="drive-proof-popup-body">
          <ul className="space-y-3">
            {listed.map((r) => (
              <li key={r.id}>
                <Link href={r.href} onClick={close} data-testid="drive-proof-popup-row"
                  className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {r.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed storage link
                    <img src={r.photo} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                  ) : <span className="size-16 shrink-0 rounded-lg bg-stone-100 dark:bg-zinc-800" aria-hidden />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-2 break-words font-semibold text-stone-900 dark:text-stone-100">{r.title}</p>
                    {r.ngoName && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300">
                        <span className="truncate">{r.ngoName}</span>
                        <BadgeCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Verified NGO" />
                      </p>
                    )}
                    {r.reached != null && <p className="text-xs text-stone-600 dark:text-stone-300">{r.reached.toLocaleString("en-IN")} people reached</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > MAX_LISTED && <p className="mt-3 text-center text-xs text-stone-500">and {rows.length - MAX_LISTED} more</p>}
        </DialogBody>
        <DialogFooter data-testid="drive-proof-popup-footer" className="gap-3">
          <button type="button" onClick={close} className="min-h-11 w-full rounded-lg border border-stone-300 px-4 text-sm font-semibold sm:w-auto dark:border-zinc-700">Later</button>
          <Link href={listed[0].href} onClick={close}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--ck-role-accent)] px-5 text-sm font-bold text-white hover:brightness-110 sm:w-auto">
            See the proof
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
