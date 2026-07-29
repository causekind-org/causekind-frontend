"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { handoverScope, type HandoverViewModel } from "./model";
import {
  handoverPrimary, handoverInput, handoverLabel,
  handoverSelectTrigger, handoverSelectItem,
} from "./handoverStyles";
import { Panel } from "./HandoverScheduleSummary";

export type DonorConfirmPayload = { quantity: number };
export type DoneeConfirmPayload = { otp?: string; quantity: number; conditionRating: string };

const CONDITIONS = [
  { value: "AS_DESCRIBED", label: "Exactly as described" },
  { value: "MINOR_DIFF",   label: "Small differences — I'm still happy with it" },
  { value: "MAJOR_DIFF",   label: "Significantly different — I have concerns" },
];

/** Five failed attempts locks the code server-side; warn before that, not after. */
const OTP_LOCKOUT_ATTEMPTS = 5;

/**
 * The irreversible half of the hub: generating a code, and recording what actually
 * changed hands.
 *
 * <p><b>No optimistic UI anywhere in here.</b> Confirmation cannot be undone by
 * either party, so the panel shows a pending state and waits for the server rather
 * than rendering success it hasn't been told about. Everything else in the app can
 * afford to guess; this cannot.
 */
export function HandoverConfirmationPanel({
  vm, onGenerateOtp, onDonorConfirm, onDoneeConfirm, otp,
}: {
  vm: HandoverViewModel;
  otp: string | null;
  onGenerateOtp: () => Promise<void>;
  onDonorConfirm: (p: DonorConfirmPayload) => Promise<void>;
  onDoneeConfirm: (p: DoneeConfirmPayload) => Promise<void>;
}) {
  const donor = vm.role === "DONOR";
  const alreadyConfirmed = donor
    ? vm.confirmation.donorConfirmedAt != null
    : vm.confirmation.doneeConfirmedAt != null;

  if (alreadyConfirmed) {
    const qty = donor ? vm.confirmation.donorConfirmedQty : vm.confirmation.doneeConfirmedQty;
    return (
      <Panel title="Your confirmation">
        <p className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            You confirmed {qty ?? "the"} item{qty === 1 ? "" : "s"}
            {donor ? " handed over" : " received"}. Waiting on the other side to close this.
          </span>
        </p>
      </Panel>
    );
  }

  return donor
    ? <DonorConfirm vm={vm} otp={otp} onGenerateOtp={onGenerateOtp} onConfirm={onDonorConfirm} />
    : <DoneeConfirm vm={vm} onConfirm={onDoneeConfirm} />;
}

// ── Donor ───────────────────────────────────────────────────────────────────

function DonorConfirm({ vm, otp, onGenerateOtp, onConfirm }: {
  vm: HandoverViewModel;
  otp: string | null;
  onGenerateOtp: () => Promise<void>;
  onConfirm: (p: DonorConfirmPayload) => Promise<void>;
}) {
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState<"otp" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qtyNum = Number(qty);
  const qtyValid = qty.trim() !== "" && Number.isInteger(qtyNum) && qtyNum > 0;

  async function generate() {
    if (busy) return;
    setBusy("otp"); setError(null);
    try { await onGenerateOtp(); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't generate a code."); }
    finally { setBusy(null); }
  }

  async function confirm() {
    if (busy || !qtyValid) return;
    setBusy("confirm"); setError(null);
    try { await onConfirm({ quantity: qtyNum }); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't record your confirmation."); }
    finally { setBusy(null); }
  }

  return (
    <Panel title="Confirm the handover">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">
            Give the recipient this code when you hand the item over. It proves you were both there.
          </p>
          <AnimatePresence mode="wait" initial={false}>
            {otp ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
              >
                <div>
                  <p className="font-mono text-2xl font-bold tracking-[0.3em] text-green-700 dark:text-green-400">
                    {otp}
                  </p>
                  {/* Session-only: never written to localStorage and gone on refresh,
                      so a shared or stolen device can't replay it. */}
                  <p className="mt-0.5 text-xs text-green-700/80 dark:text-green-400/80">
                    Share only at the moment of handover. Disappears if you reload.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(otp).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }).catch(() => {});
                  }}
                  aria-label="Copy code"
                  title="Copy code"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-green-700 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:text-green-400 dark:hover:bg-green-900/40"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </button>
              </motion.div>
            ) : (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
                <Button onClick={generate} disabled={busy !== null} className={handoverPrimary}>
                  {busy === "otp"
                    ? <><Loader2 className="animate-spin" aria-hidden /> Generating</>
                    : <><KeyRound aria-hidden /> Generate code</>}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="sr-only" aria-live="polite">
            {otp ? "A six digit handover code has been generated." : ""}
          </span>
        </div>

        <div className="space-y-1.5 border-t border-stone-100 pt-4 dark:border-zinc-800">
          <label htmlFor="donor-qty" className={handoverLabel}>
            How many items did you hand over? <span className="text-red-500" aria-hidden>*</span>
          </label>
          <Input
            id="donor-qty"
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={qty.trim() !== "" && !qtyValid}
            aria-describedby={qty.trim() !== "" && !qtyValid ? "donor-qty-err" : undefined}
            className={handoverInput}
          />
          {qty.trim() !== "" && !qtyValid && (
            <p id="donor-qty-err" className="text-xs text-red-600 dark:text-red-400">
              Enter a whole number of 1 or more.
            </p>
          )}

          <p className="pt-1 text-xs text-stone-500 dark:text-stone-400">
            You can&apos;t undo this — it&apos;s the record of what was given.
          </p>
          <Button onClick={confirm} disabled={!qtyValid || busy !== null} className={`${handoverPrimary} w-full`}>
            {busy === "confirm"
              ? <><Loader2 className="animate-spin" aria-hidden /> Recording</>
              : <><ShieldCheck aria-hidden /> I handed it over</>}
          </Button>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </Panel>
  );
}

// ── Donee ───────────────────────────────────────────────────────────────────

function DoneeConfirm({ vm, onConfirm }: {
  vm: HandoverViewModel;
  onConfirm: (p: DoneeConfirmPayload) => Promise<void>;
}) {
  const [otp, setOtp] = useState("");
  const [qty, setQty] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const qtyNum = Number(qty);
  const qtyValid = qty.trim() !== "" && Number.isInteger(qtyNum) && qtyNum > 0;
  const lockedOut = failedAttempts >= OTP_LOCKOUT_ATTEMPTS;
  const otpInvalid = error != null && /otp|code/i.test(error);

  async function confirm() {
    if (busy || !qtyValid || lockedOut) return;
    setBusy(true); setError(null);
    try {
      await onConfirm({ otp: otp.trim() || undefined, quantity: qtyNum, conditionRating: condition });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't record your confirmation.";
      // Track locally only to warn ahead of the lockout — the server holds the
      // real count, and this resets on reload, which is the safe direction.
      if (/otp|code/i.test(message)) setFailedAttempts((n) => n + 1);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const attemptsLeft = OTP_LOCKOUT_ATTEMPTS - failedAttempts;

  return (
    <Panel title="Confirm what you received">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className={handoverLabel}>
            Code from the donor
          </label>
          <InputOTP
            maxLength={6}
            inputMode="numeric"
            pattern="^\d*$"
            value={otp}
            onChange={setOtp}
            disabled={busy || lockedOut}
            aria-label="Six digit handover code"
            aria-invalid={otpInvalid}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} aria-invalid={otpInvalid} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-stone-400">
            For in-person handovers. Leave it blank if the item came by courier.
          </p>
          {failedAttempts > 0 && !lockedOut && (
            <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
              That code didn&apos;t match. {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before it locks.
            </p>
          )}
          {lockedOut && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              Too many incorrect attempts. Ask the donor to generate a fresh code.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="donee-qty" className={handoverLabel}>
            How many did you receive? <span className="text-red-500" aria-hidden>*</span>
          </label>
          <Input
            id="donee-qty"
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={qty.trim() !== "" && !qtyValid}
            aria-describedby={qty.trim() !== "" && !qtyValid ? "donee-qty-err" : undefined}
            className={handoverInput}
          />
          {qty.trim() !== "" && !qtyValid && (
            <p id="donee-qty-err" className="text-xs text-red-600 dark:text-red-400">
              Enter a whole number of 1 or more.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="donee-condition" className={handoverLabel}>
            How was it?
          </label>
          <Select value={condition} onValueChange={setCondition} disabled={busy}>
            <SelectTrigger id="donee-condition" className={handoverSelectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={handoverScope(vm.role)}>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value} className={handoverSelectItem}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          {vm.flow === "OFFER"
            ? "Once you both confirm, there's a short window to report a problem before this closes."
            : "Once you both confirm, this handover closes and a delivery record is created."}
        </p>
        <Button onClick={confirm} disabled={!qtyValid || busy || lockedOut} className={`${handoverPrimary} w-full`}>
          {busy
            ? <><Loader2 className="animate-spin" aria-hidden /> Recording</>
            : <><ShieldCheck aria-hidden /> I received it</>}
        </Button>
        {error && !otpInvalid && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </Panel>
  );
}
