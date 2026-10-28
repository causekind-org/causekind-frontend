"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
/** Display copy for DRIVE_OFFER_NEXT_STEPS, translated (was a module constant). */
function useDriveOfferNextStepsCopy() {
  const ui = useUiText();
  return [
  [ui("We check your photos"), ui("Usually within minutes.")],
  [ui("The NGO accepts or declines"), ui("You'll get a notification either way. The drive contact person's phone number is shared after the NGO accepts your offer.")],
  [ui("You plan the handover"), ui("Drop off at the NGO or ask for a pickup, on a day and time that suits the NGO.")],
  [ui("Show your code at the handover"), ui("The NGO enters it to confirm it received your items.")],
  [ui("See the impact"), ui("Once the NGO distributes the items, you'll see the photos and your certificate.")],
] as const;
}

export type DriveOfferSent = { quantity: number; unit?: string | null; ngoName?: string | null; driveTitle: string };

/** Kept for this tab only, so the drive page can show the success popup once after the redirect. */
export const offerSentKey = (driveId: number) => `ck-drive-offer-sent-${driveId}`;

/** "Offer sent" over the drive page, after the donor submits. Green, like the give form. */
export function DriveOfferSentModal({ sent, onClose }: { sent: DriveOfferSent; onClose: () => void }) {
  const DRIVE_OFFER_NEXT_STEPS = useDriveOfferNextStepsCopy();
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      {/* The dialog portals out of the page, so the NGO theme goes on the content itself. */}
      <DialogContent
        data-ck-role-theme="ngo"
        data-testid="drive-offer-sent"
        className="block max-h-[calc(100dvh-1rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] max-[700px]:overflow-y-auto md:overflow-visible p-3.5 sm:p-5 md:p-6 max-w-[calc(100vw-1.5rem)] sm:max-w-2xl md:max-w-[760px]"
      >
        <p className="pr-8 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"><UiText>Offer sent</UiText></p>
        <DialogTitle className="mt-0.5 pr-8 text-[clamp(16px,2vw,20px)] font-black text-stone-900 dark:text-stone-100 leading-snug">
          Thank you! {sent.quantity} {sent.unit?.toLowerCase()} reserved for this drive
        </DialogTitle>
        <DialogDescription className="mt-1 text-[clamp(12px,1.2vw,13px)] text-stone-600 dark:text-stone-400 leading-snug">
          Your offer to {sent.ngoName || ui("the NGO")} for &ldquo;{sent.driveTitle}&rdquo; is on its way. Here&apos;s what happens next:
        </DialogDescription>
        <ol className="mt-2.5 sm:mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-x-5 md:gap-y-2">
          {DRIVE_OFFER_NEXT_STEPS.map(([title, body], i) => (
            <li key={title} className={`flex items-start gap-2 sm:gap-2.5 ${i === 4 ? "md:col-span-2" : ""}`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[clamp(12px,1.2vw,13px)] font-bold text-stone-900 dark:text-stone-100 leading-tight">{title}</p>
                <p className="text-[12px] text-stone-600 dark:text-stone-400 leading-snug mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 sm:mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/dashboard" className="inline-flex min-h-[38px] sm:min-h-[40px] flex-1 items-center justify-center rounded-xl bg-emerald-700 px-3.5 text-[12px] sm:text-[13px] font-bold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 transition-colors"><UiText>Track it on your dashboard</UiText></Link>
          <button type="button" onClick={onClose} className="inline-flex min-h-[38px] sm:min-h-[40px] flex-1 items-center justify-center rounded-xl border border-stone-300 px-3.5 text-[12px] sm:text-[13px] font-bold text-stone-800 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800 transition-colors"><UiText>Back to the drive</UiText></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
