"use client";

import { useState } from "react";
import { Camera, Check, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  scheduleNgoDriveOfferHandover, rescheduleNgoDriveOfferHandover, generateNgoDriveOfferHandoverOtp,
  uploadNgoDriveHandoverPhotos, uploadNgoDriveReceiptPhotos, confirmNgoDriveOfferHandoverNgo,
  setNgoDriveOfferCallPermission,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { HandoverHubShell } from "@/features/handover/HandoverHubShell";
import { adaptNgoOffer } from "@/features/handover/adapters";
import { PhotoCaptureDialog } from "./PhotoCaptureDialog";
import { DriveDropOffPlanner } from "./DriveDropOffPlanner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import type { SchedulePayload } from "@/features/handover/HandoverScheduleDialog";

export type DriveHandoverRole = "DONOR" | "NGO";

const unitWords = (u?: string | null) => (u ? u.replaceAll("_", " ").toLowerCase() : "items");
const IN_HANDOVER = new Set([
  "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED",
  "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_WINDOW_OPEN", "COMPLETED",
]);

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message.replace(/^\{.*"(?:detail|message)":"([^"]+)".*\}$/, "$1") : fallback;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</h2>
      {children}
    </section>
  );
}

function PhotoStrip({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {urls.map((u, i) => (
        <li key={`${u}-${i}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
          <img src={u} alt={`${label} ${i + 1}`} className="h-16 w-16 rounded-md border border-stone-200 object-cover dark:border-zinc-700" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Donor handover panel:
 * Step 1 (Code first): Donor generates/views 6-digit code without needing any photo.
 * Step 2 (Photo completes it): Once NGO confirms code, donor sees the photo step.
 * On reload in confirmed state, shows the photo step directly.
 */
export function DriveDonorCodePanel({
  offer,
  handover,
  onChanged,
}: {
  offer: NgoDriveOfferResponse;
  handover: NgoDriveOfferHandoverRecordResponse | null;
  onChanged: () => void;
}) {
  const [otp, setOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"photos" | "otp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const codeConfirmed = handover?.confirmation?.otpVerified === true;
  const isCompleted = offer.status === "ISSUE_WINDOW_OPEN" || offer.status === "COMPLETED";
  const heldQty = handover?.confirmation?.ngoConfirmedQty ?? offer.quantity ?? 1;
  const photos = offer.handoverPhotos ?? [];

  async function run(key: "photos" | "otp", work: () => Promise<void>, fallback: string) {
    setBusy(key); setError(null);
    try { await work(); } catch (e) { setError(errorText(e, fallback)); } finally { setBusy(null); }
  }

  async function handleCapturedPhoto(file: File) {
    setCameraOpen(false);
    await run("photos", async () => {
      await uploadNgoDriveHandoverPhotos(offer.id, [file]);
      onChanged();
    }, "We couldn't upload that photo.");
  }

  // Once completed or code confirmed:
  if (codeConfirmed || isCompleted) {
    return (
      <Panel title="Handover photo">
        <div className="space-y-4" data-testid="drive-donor-code">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm font-semibold text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              <span>The NGO confirmed your code ({heldQty} {unitWords(offer.driveUnit)}).</span>
            </div>
            {!isCompleted && (
              <p className="mt-1 text-xs font-normal text-green-700 dark:text-green-400">
                Take a handover photo to complete the handover.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <PhotoStrip urls={photos} label="Your handover photo" />
            {photos.length < 8 && (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)] hover:bg-[var(--handover-accent-hover)] disabled:opacity-50"
              >
                {busy === "photos" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
                {photos.length ? "Add another photo" : "Take a handover photo"}
              </button>
            )}
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400">
            The code has already been confirmed. You cannot reschedule or cancel this handover.
          </p>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <PhotoCaptureDialog
            open={cameraOpen}
            onCancel={() => setCameraOpen(false)}
            onCaptured={handleCapturedPhoto}
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Hand over the items">
      <div className="space-y-4" data-testid="drive-donor-code">
        <div className="space-y-2">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Show your code to the NGO when you meet. They enter it to confirm what was received.
          </p>
          {otp ? (
            <div className="rounded-lg bg-[var(--handover-soft)] p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-3xl font-bold tracking-[0.4em] text-[var(--handover-on-soft)]" data-testid="drive-otp">{otp}</p>
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--handover-accent)] hover:bg-[var(--handover-accent)]/10"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">Valid for 30 minutes. Showing it again gives the same code.</p>
              <button
                type="button"
                onClick={() => void run("otp", async () => setOtp((await generateNgoDriveOfferHandoverOtp(offer.id, true)).otp), "We couldn't get a new code.")}
                disabled={busy !== null}
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[var(--handover-accent)] hover:underline"
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Get a new code
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run("otp", async () => setOtp((await generateNgoDriveOfferHandoverOtp(offer.id)).otp), "We couldn't show your code.")}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)] hover:bg-[var(--handover-accent-hover)] disabled:opacity-50"
            >
              {busy === "otp" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />} Show my code
            </button>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Panel>
  );
}

/**
 * NGO handover panel:
 * Step 1 (Code & Qty first): NGO enters donor's 6-digit code with InputOTP animation and quantity received.
 * Step 2 (Photo completes it): Once confirmed, shows the photo step.
 * On reload in confirmed state, shows the photo step directly.
 */
export function DriveNgoReceivePanel({
  offer,
  handover,
  onChanged,
}: {
  offer: NgoDriveOfferResponse;
  handover: NgoDriveOfferHandoverRecordResponse | null;
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(String(offer.quantity ?? ""));
  const [busy, setBusy] = useState<"photos" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const codeConfirmed = handover?.confirmation?.otpVerified === true;
  const isCompleted = offer.status === "ISSUE_WINDOW_OPEN" || offer.status === "COMPLETED";
  const heldQty = handover?.confirmation?.ngoConfirmedQty ?? offer.quantity ?? 1;
  const photos = offer.receiptPhotos ?? [];
  const max = offer.quantity ?? 0;
  const qtyNum = Number(qty);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && (max === 0 || qtyNum <= max);
  const codeValid = /^\d{6}$/.test(code.trim());

  async function run(key: "photos" | "confirm", work: () => Promise<void>, fallback: string) {
    setBusy(key); setError(null);
    try { await work(); onChanged(); } catch (e) { setError(errorText(e, fallback)); } finally { setBusy(null); }
  }

  async function handleCapturedPhoto(file: File) {
    setCameraOpen(false);
    await run("photos", async () => {
      await uploadNgoDriveReceiptPhotos(offer.driveId, offer.id, [file]);
    }, "We couldn't upload that photo.");
  }

  // Once code confirmed or completed:
  if (codeConfirmed || isCompleted) {
    return (
      <Panel title="Handover receipt photo">
        <div className="space-y-4" data-testid="drive-ngo-receive">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm font-semibold text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              <span>Code confirmed ({heldQty} {unitWords(offer.driveUnit)}).</span>
            </div>
            {!isCompleted && (
              <p className="mt-1 text-xs font-normal text-green-700 dark:text-green-400">
                Take a photo of the received items to complete the handover (or wait for the donor&apos;s photo).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <PhotoStrip urls={photos} label="Receipt photo" />
            {photos.length < 8 && (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)] hover:bg-[var(--handover-accent-hover)] disabled:opacity-50"
              >
                {busy === "photos" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
                {photos.length ? "Add more photos" : "Take receipt photo"}
              </button>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <PhotoCaptureDialog
            open={cameraOpen}
            onCancel={() => setCameraOpen(false)}
            onCaptured={handleCapturedPhoto}
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Confirm what you received">
      <div className="space-y-4" data-testid="drive-ngo-receive">
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            if (codeValid && qtyValid) {
              void run("confirm", async () => {
                await confirmNgoDriveOfferHandoverNgo(offer.driveId, offer.id, { otp: code.trim(), quantity: qtyNum });
              }, "We couldn't confirm the handover.");
            }
          }}
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
              Donor&apos;s code
            </label>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={busy !== null}
              aria-label="Six digit handover code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ask the donor for the 6-digit code shown on their screen.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ngo-drive-qty-input" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
              Quantity received {max > 0 && <span className="text-stone-500">(offered {max})</span>}
            </label>
            <input
              id="ngo-drive-qty-input"
              type="number"
              min={1}
              max={max || undefined}
              value={qty}
              onChange={e => setQty(e.target.value)}
              disabled={busy !== null}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus-visible:outline-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100"
            />
            {max > 0 && qtyValid && qtyNum < max && (
              <p className="text-xs text-stone-500">The other {max - qtyNum} will return to still needed.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy !== null || !codeValid || !qtyValid}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)] hover:bg-[var(--handover-accent-hover)] disabled:opacity-50"
          >
            {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            Confirm code & quantity
          </button>
        </form>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Panel>
  );
}

/** Both photo sets, visible to both sides with 'From you' / 'From the donor' / 'From the NGO'. */
function DrivePhotoSets({
  offer,
  viewerRole,
}: {
  offer: NgoDriveOfferResponse;
  viewerRole: DriveHandoverRole;
}) {
  const handover = offer.handoverPhotos ?? [];
  const receipt = offer.receiptPhotos ?? [];
  if (!handover.length && !receipt.length) return null;

  const donorPhotosLabel = viewerRole === "DONOR" ? "From you" : "From the donor";
  const ngoPhotosLabel = viewerRole === "NGO" ? "From you" : "From the NGO";

  return (
    <Panel title="Handover photos">
      <div className="space-y-4" data-testid="drive-photo-sets">
        {handover.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-stone-500">{donorPhotosLabel}</p>
            <PhotoStrip urls={handover} label="Donor's handover photos" />
          </div>
        )}
        {receipt.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-stone-500">{ngoPhotosLabel}</p>
            <PhotoStrip urls={receipt} label="NGO's receipt photos" />
          </div>
        )}
      </div>
    </Panel>
  );
}

/**
 * The drive handover on the shared donor↔donee hub (same layout, stepper, schedule
 * popup, chat, call, safety actions), in NGO green, with the drive's own rules for
 * code-first and photo-completed handover.
 */
export function DriveHandoverHub({
  role,
  offer,
  handover,
  userEmail,
  onChanged,
}: {
  role: DriveHandoverRole;
  offer: NgoDriveOfferResponse;
  handover: NgoDriveOfferHandoverRecordResponse | null;
  userEmail: string;
  onChanged: () => void;
}) {
  const vm = adaptNgoOffer(offer, handover, userEmail, role === "NGO" ? "DONEE" : "DONOR");
  if (!vm) return null;

  const toApi = (p: SchedulePayload) => ({
    method: p.method === "NGO_PICKUP" ? "PICKUP" : "DROP_OFF",
    scheduledDateTime: p.scheduledDateTime,
    locationAddress: p.method === "NGO_PICKUP" ? p.address : undefined,
  });

  const inHandover = IN_HANDOVER.has(offer.status) && handover?.scheduledDateTime != null;
  const confirmPanel = inHandover
    ? (role === "DONOR"
        ? <DriveDonorCodePanel offer={offer} handover={handover} onChanged={onChanged} />
        : <DriveNgoReceivePanel offer={offer} handover={handover} onChanged={onChanged} />)
    : null;

  // Outside the pickup radius: no method choice and no "Schedule handover" popup. The donor
  // sees the NGO's address and picks a drop-off time right on the page.
  const schedulePanel = role === "DONOR" && offer.dropOffOnly === true && !handover?.scheduledDateTime
    ? <DriveDropOffPlanner offer={offer} onDone={onChanged} />
    : undefined;

  const codeConfirmed = handover?.confirmation?.otpVerified === true;
  const noop = async () => {};

  return (
    <HandoverHubShell
      vm={vm}
      userEmail={userEmail}
      otp={null}
      onChanged={onChanged}
      actions={{
        schedule: async p => {
          await scheduleNgoDriveOfferHandover(offer.id, toApi(p));
          onChanged();
        },
        reschedule: async p => {
          if (codeConfirmed) {
            throw new Error("The code has already been confirmed. You cannot reschedule this handover.");
          }
          await rescheduleNgoDriveOfferHandover(offer.id, { ...toApi(p), rescheduleReason: p.reason });
          onChanged();
        },
        generateOtp: noop,
        confirmDonor: noop,
        confirmDonee: noop,
        setCallPermission: role === "NGO" ? async (allowed: boolean) => {
          await setNgoDriveOfferCallPermission(offer.driveId, offer.id, allowed);
          onChanged();
        } : undefined,
      }}
      drive={{
        backHref: role === "NGO" ? `/ngo/drives/${offer.driveId}` : "/dashboard",
        subtitle: `${offer.ngoName}${offer.quantity ? ` · ${offer.quantity} ${unitWords(offer.driveUnit)}` : ""}${offer.driveItemName ? ` of ${offer.driveItemName}` : ""}`,
        confirmPanel,
        schedulePanel,
        aside: <DrivePhotoSets offer={offer} viewerRole={role} />,
      }}
    />
  );
}
