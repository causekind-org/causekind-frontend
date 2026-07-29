"use client";

import { CalendarPlus, CircleCheck, Clock, MessageCircle, TriangleAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { nextStepCopy, type HandoverViewModel } from "./model";
import { handoverPrimary, handoverSecondary } from "./handoverStyles";
import { ConfirmNoIssueButton } from "./HandoverSafetyActions";
import { HandoverConfirmationPanel, type DonorConfirmPayload, type DoneeConfirmPayload } from "./HandoverConfirmationPanel";

/**
 * "Your next step" — the one panel the main column always opens with.
 *
 * <p>The old hubs made the user assemble this themselves from a vertical timeline
 * of every stage at equal weight. Here exactly one thing is prominent, it is
 * role-specific, and it changes as the state advances — with a short transform
 * transition so the change is noticed without being animated at.
 */
export function HandoverNextAction({
  vm, otp, onSchedule, onGenerateOtp, onDonorConfirm, onDoneeConfirm, onOpenChat, onChanged,
}: {
  vm: HandoverViewModel;
  otp: string | null;
  onSchedule: () => void;
  onGenerateOtp: () => Promise<void>;
  onDonorConfirm: (p: DonorConfirmPayload) => Promise<void>;
  onDoneeConfirm: (p: DoneeConfirmPayload) => Promise<void>;
  onOpenChat?: () => void;
  onChanged: () => void;
}) {
  const copy = nextStepCopy(vm);
  const donor = vm.role === "DONOR";

  return (
    <motion.section
      key={vm.state}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      aria-labelledby="next-step-heading"
      className="rounded-lg border border-[var(--handover-accent)]/25 bg-[var(--handover-soft)] p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--handover-accent)]">
        Your next step
      </p>
      <h1 id="next-step-heading" className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
        {copy.title}
      </h1>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {copy.body}
      </p>

      <div className="mt-4">
        {/* Deliberately not a switch over every state — several states have no
            action at all, and inventing a button for them would be noise. */}
        {vm.state === "awaiting_schedule" && (
          donor ? (
            <Button onClick={onSchedule} className={`${handoverPrimary} w-full sm:w-auto`}>
              <CalendarPlus aria-hidden /> Schedule handover
            </Button>
          ) : (
            <WaitingRow onOpenChat={onOpenChat} label="Message the donor" />
          )
        )}

        {vm.state === "scheduled" && !donor && (
          <WaitingRow onOpenChat={onOpenChat} label="Ask for another time" />
        )}

        {(vm.state === "ready_to_handover" || vm.state === "partially_confirmed") && (
          <NeedsConfirmation
            vm={vm} otp={otp}
            onGenerateOtp={onGenerateOtp}
            onDonorConfirm={onDonorConfirm}
            onDoneeConfirm={onDoneeConfirm}
            onOpenChat={onOpenChat}
          />
        )}

        {vm.state === "at_risk" && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Our team has been notified. Keep talking in the chat if you can still make it work.
          </p>
        )}

        {vm.state === "issue_window" && (
          donor ? (
            <p className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
              Nothing to do — this closes on its own shortly.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <ConfirmNoIssueButton offerId={vm.id} onDone={onChanged} />
              <p className="w-full text-xs text-stone-500 dark:text-stone-400">
                If something is wrong, use “Report a problem” below instead.
              </p>
            </div>
          )
        )}

        {vm.state === "completed" && <Completion vm={vm} />}
      </div>
    </motion.section>
  );
}

function NeedsConfirmation({ vm, otp, onGenerateOtp, onDonorConfirm, onDoneeConfirm, onOpenChat }: {
  vm: HandoverViewModel;
  otp: string | null;
  onGenerateOtp: () => Promise<void>;
  onDonorConfirm: (p: DonorConfirmPayload) => Promise<void>;
  onDoneeConfirm: (p: DoneeConfirmPayload) => Promise<void>;
  onOpenChat?: () => void;
}) {
  const donor = vm.role === "DONOR";
  const youConfirmed = donor ? vm.confirmation.donorConfirmedAt : vm.confirmation.doneeConfirmedAt;

  // Already done your part: there is genuinely nothing to submit, so offer the
  // only useful thing left — a nudge.
  if (youConfirmed) {
    return <WaitingRow onOpenChat={onOpenChat} label="Send them a nudge" />;
  }

  return (
    <div className="-mx-1">
      <HandoverConfirmationPanel
        vm={vm}
        otp={otp}
        onGenerateOtp={onGenerateOtp}
        onDonorConfirm={onDonorConfirm}
        onDoneeConfirm={onDoneeConfirm}
      />
    </div>
  );
}

function WaitingRow({ onOpenChat, label }: { onOpenChat?: () => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
        <Clock className="h-4 w-4" aria-hidden /> Nothing needed from you right now
      </span>
      {onOpenChat && (
        <Button variant="outline" onClick={onOpenChat} className={handoverSecondary}>
          <MessageCircle aria-hidden /> {label}
        </Button>
      )}
    </div>
  );
}

/**
 * Completion, role-specific.
 *
 * <p>A donor gave something and may be thanked for it. A recipient received help,
 * and telling them they "performed an act of kindness" would be both untrue and
 * patronising — so the donee sees a plain receipt.
 */
function Completion({ vm }: { vm: HandoverViewModel }) {
  const qty = vm.confirmation.doneeConfirmedQty ?? vm.confirmation.donorConfirmedQty;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          {qty != null && <><strong>{qty}</strong> item{qty === 1 ? "" : "s"} — </>}
          {vm.role === "DONOR" ? "handed over and confirmed by both sides." : "received and confirmed by both sides."}
        </span>
      </div>

      {/* MATCH mints a certificate code at dual confirmation; OFFER issues a
          downloadable certificate after the issue window. Different artefacts,
          shown as what each actually is. */}
      {vm.certificateCode && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Delivery record:{" "}
          <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800">
            {vm.certificateCode}
          </span>
        </p>
      )}
      {vm.certificateHref && (
        <Button onClick={() => { window.location.href = vm.certificateHref!; }} className={handoverPrimary}>
          View your certificate
        </Button>
      )}
      {vm.role === "DONEE" && vm.flow === "OFFER" && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          If a problem surfaces in the next few days, you can still report it below.
        </p>
      )}
    </div>
  );
}
