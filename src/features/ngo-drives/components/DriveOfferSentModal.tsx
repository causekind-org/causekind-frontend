"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const DRIVE_OFFER_NEXT_STEPS = [
  ["We check your photos", "Usually within minutes."],
  ["The NGO accepts or declines", "You'll get a notification either way. The drive contact person's phone number is shared after the NGO accepts your offer."],
  ["You plan the handover", "Drop off at the NGO or ask for a pickup, on a day and time that suits the NGO."],
  ["Show your code at the handover", "The NGO enters it to confirm it received your items."],
  ["See the impact", "Once the NGO distributes the items, you'll see the photos and your certificate."],
] as const;

export type DriveOfferSent = { quantity: number; unit?: string | null; ngoName?: string | null; driveTitle: string };

/** Kept for this tab only, so the drive page can show the success popup once after the redirect. */
export const offerSentKey = (driveId: number) => `ck-drive-offer-sent-${driveId}`;

/** "Offer sent" over the drive page, after the donor submits. Green, like the give form. */
export function DriveOfferSentModal({ sent, onClose }: { sent: DriveOfferSent; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      {/* The dialog portals out of the page, so the NGO theme goes on the content itself. */}
      <DialogContent data-ck-role-theme="ngo" data-testid="drive-offer-sent" className="block max-h-[90dvh] overflow-y-auto p-6 sm:max-w-lg sm:p-8">
        <p className="pr-10 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Offer sent</p>
        <DialogTitle className="mt-1 pr-10 text-2xl font-black text-stone-900 dark:text-stone-100">
          Thank you! {sent.quantity} {sent.unit?.toLowerCase()} reserved for this drive
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Your offer to {sent.ngoName || "the NGO"} for &ldquo;{sent.driveTitle}&rdquo; is on its way. Here&apos;s what happens next:
        </DialogDescription>
        <ol className="mt-5 space-y-4">
          {DRIVE_OFFER_NEXT_STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{i + 1}</span>
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-100">{title}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">Track it on your dashboard</Link>
          <button type="button" onClick={onClose} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-stone-300 px-5 text-sm font-bold text-stone-800 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800">Back to the drive</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
