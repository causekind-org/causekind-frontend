"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getMatch, saveMatchLogistics, generateDeliveryOtp,
  confirmMatchHandoverDonor, confirmMatchHandoverDonee,
  sendMatchChatMessage, setMatchDoneeCallPermission,
  type ItemMatch,
} from "@/lib/api";
import MatchChatWindow from "@/components/MatchChatWindow";
import LocationPinPicker from "@/components/LocationPinPicker";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  ArrowLeft, ShieldCheck, CalendarDays, Phone, PhoneCall, Lock, ChevronRight,
  Package, type LucideIcon,
} from "lucide-react";

const STATUS_STEP_INFO: Record<string, { title: string; description: string }> = {
  BOTH_PARTIES_ACCEPTED:          { title: "Both Confirmed",       description: "Now set up how and when the handover will happen." },
  LOGISTICS_CONFIRMED:            { title: "Logistics Confirmed",  description: "Handover time and method are set — coordinate final details in chat." },
  TRANSPORT_DISCUSSION:           { title: "Arranging Transport",  description: "Discussing transport arrangements." },
  ARRANGEMENT_AGREED:             { title: "Arrangement Agreed",   description: "Details finalized — handover coming up." },
  PICKUP_SCHEDULED:               { title: "Pickup Scheduled",     description: "Pickup has been scheduled." },
  PICKED_UP:                      { title: "Picked Up",            description: "Item has been picked up." },
  IN_TRANSIT:                     { title: "In Transit",           description: "Item is on its way." },
  DELIVERY_ATTEMPTED:             { title: "Delivery Attempted",   description: "A delivery attempt was made." },
  DELIVERED_PENDING_CONFIRMATION: { title: "Delivered",            description: "Awaiting confirmation from both sides." },
  COMPLETED:                      { title: "Completed",            description: "This donation is complete — thank you for your contribution!" },
  FULFILLED:                      { title: "Completed",            description: "This donation is complete — thank you for your contribution!" },
  CANCELLED:                      { title: "Cancelled",            description: "This match was cancelled." },
  FAILED:                         { title: "Failed",               description: "This handover could not be completed." },
};

const HANDOVER_CONFIRMABLE_STATUSES = new Set([
  "LOGISTICS_CONFIRMED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT",
  "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION",
]);

const CLOSED_STATUSES = new Set(["COMPLETED", "FULFILLED", "CANCELLED", "FAILED", "REJECTED", "DONOR_REJECTED"]);

const MAX_RESCHEDULES = 2;

function statusStepColor(status: string) {
  if (status === "COMPLETED" || status === "FULFILLED") return { text: "text-green-700 dark:text-green-400", border: "border-green-300 dark:border-green-700", bg: "bg-green-50 dark:bg-green-950/30" };
  if (status === "CANCELLED" || status === "FAILED") return { text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-700", bg: "bg-red-50 dark:bg-red-950/30" };
  return { text: "text-[#b04a15] dark:text-[#e07b3a]", border: "border-[#b04a15]/30 dark:border-[#e07b3a]/40", bg: "bg-orange-50 dark:bg-orange-950/20" };
}

export default function MatchHandoverHubPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<ItemMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowingCall, setAllowingCall] = useState(false);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [handoverMethod, setHandoverMethod] = useState("IN_PERSON");
  const [pickupDateTime, setPickupDateTime] = useState("");
  const [handoverAddress, setHandoverAddress] = useState("");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Confirmation
  const [donorQty, setDonorQty] = useState("");
  const [doneeQty, setDoneeQty] = useState("");
  const [conditionRating, setConditionRating] = useState("AS_DESCRIBED");
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemDesc, setProblemDesc] = useState("");
  const [problemNote, setProblemNote] = useState("");
  const [problemSubmitting, setProblemSubmitting] = useState(false);
  const [problemSent, setProblemSent] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const isDonee = match ? user?.email === match.doneeEmail : user?.role === "DONEE";
  const isDonor = match ? user?.email === match.donorEmail : !isDonee;

  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId)
      .then(setMatch)
      .catch(() => setError("Failed to load handover details"))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEntityUpdates(["MATCH"], (_latest, batch) => {
    if (!matchId || !batch.some((d) => d.entityId === matchId)) return;
    getMatch(matchId).then(setMatch).catch(() => {});
  });

  // Show the one-time celebration overlay once this handover reaches a
  // terminal, successful state — gated per-user via localStorage so it
  // never reappears on a later visit.
  useEffect(() => {
    if (!match || !matchId) return;
    if (match.status !== "COMPLETED" && match.status !== "FULFILLED") return;
    const key = `ck_celebrated_MATCH_${matchId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setShowCelebration(true);
    } catch {
      // localStorage unavailable — skip silently, never block the page.
    }
  }, [match, matchId]);

  // Opens the schedule/reschedule form, seeding the pin from whatever lat/lng
  // is already stored on the match so re-opening to reschedule doesn't reset it.
  function openScheduleForm() {
    setPinLat(match?.handoverLatitude ?? null);
    setPinLng(match?.handoverLongitude ?? null);
    setShowScheduleForm(true);
  }

  async function handleSchedule() {
    if (!pickupDateTime) { setError("Please select a date and time"); return; }
    setSubmitting(true); setError(null);
    try {
      const updated = await saveMatchLogistics(matchId, {
        handoverMethod, pickupDateTime: new Date(pickupDateTime).toISOString(),
        handoverAddress: handoverAddress || undefined, notes: notes || undefined,
        ...(pinLat != null && pinLng != null ? { handoverLatitude: pinLat, handoverLongitude: pinLng } : {}),
      });
      setMatch(updated);
      setShowScheduleForm(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save logistics"); }
    finally { setSubmitting(false); }
  }

  async function handleGenerateOtp() {
    setSubmitting(true);
    try {
      const result = await generateDeliveryOtp(matchId);
      setOtp(result.otp);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDonorConfirm() {
    if (!donorQty) { setError("Enter quantity"); return; }
    setSubmitting(true); setError(null);
    try {
      const updated = await confirmMatchHandoverDonor(matchId, { quantityHandedOver: Number(donorQty) });
      setMatch(updated);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDoneeConfirm() {
    if (!doneeQty) { setError("Enter quantity"); return; }
    setSubmitting(true); setError(null);
    try {
      const updated = await confirmMatchHandoverDonee(matchId, {
        otp: otpInput || undefined, quantityReceived: Number(doneeQty), conditionRating,
      });
      setMatch(updated);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleToggleDoneeCall(next: boolean) {
    setAllowingCall(true);
    try {
      const updated = await setMatchDoneeCallPermission(matchId, next);
      setMatch(updated);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to update"); }
    finally { setAllowingCall(false); }
  }

  async function handleReportProblem() {
    if (!problemDesc.trim()) { setError("Please select what happened"); return; }
    const fullMessage = problemNote.trim() ? `${problemDesc}: ${problemNote.trim()}` : problemDesc;
    setProblemSubmitting(true); setError(null);
    try {
      await sendMatchChatMessage(matchId,
        `[HANDOVER PROBLEM] ${isDonee ? "Recipient" : "Donor"} reported an issue: ${fullMessage}`,
        "SYSTEM"
      );
      setProblemSent(true);
      setShowProblemForm(false);
      setProblemDesc("");
      setProblemNote("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to send problem report"); }
    finally { setProblemSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="animate-pulse text-gray-500">Loading...</p></div>;
  if (!match) return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">{error ?? "Match not found"}</p></div>;

  const itemTitle = match.listingTitle || match.requestTitle || "Item";
  const rescheduleCount = match.logisticsRescheduleCount ?? 0;

  return (
    <main className="min-h-screen bg-[#fdf6ef] dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-4xl px-4 pt-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.back()} className="group mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#b04a15]/80 hover:text-[#b04a15]">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            Back
          </button>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Handover Hub</h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#b04a15] dark:text-[#e07b3a]">
                <Package className="h-3.5 w-3.5" />
                {itemTitle}
                <span className="text-gray-300 dark:text-gray-700">•</span>
                {isDonee ? (match.donorName ? `Donor: ${match.donorName}` : "") : (match.doneeName ? `Recipient: ${match.doneeName}` : "")}
              </p>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Transaction ID: #CK-M{String(matchId).padStart(5, "0")}
            </p>
          </div>
        </div>

        {/* At-risk banner */}
        {match.logisticsAtRisk && (
          <div className="mb-6 border-l-4 border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            This handover has been rescheduled multiple times and requires admin review.
          </div>
        )}

        {error && (
          <div className="mb-6 border-l-4 border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Vertical timeline */}
        <div className="mb-10">
          {(() => {
            const info = STATUS_STEP_INFO[match.status] ?? { title: match.status.replace(/_/g, " "), description: "" };
            const colors = statusStepColor(match.status);
            return (
              <TimelineStep
                icon={ShieldCheck}
                label="Current Status"
                title={info.title}
                description={info.description}
                colorClasses={colors}
                titleClassName={colors.text}
                action={(match.status === "COMPLETED" || match.status === "FULFILLED") && match.verifiedDeliveryCertificate && (
                  <span className="rounded-xl bg-green-100 dark:bg-green-950/40 px-3 py-1.5 text-xs font-mono font-semibold text-green-700 dark:text-green-400">
                    {match.verifiedDeliveryCertificate}
                  </span>
                )}
              />
            );
          })()}

          <TimelineStep
            icon={CalendarDays}
            label="Step 2: Logistics"
            title="Handover Schedule"
            description={!match.handoverMethod
              ? (isDonor ? `Select a date and time that works for both you and the recipient.` : `Waiting for the donor to schedule the handover.`)
              : undefined}
            colorClasses={statusStepColor("")}
            action={isDonor && !match.handoverMethod && (
              <button
                onClick={openScheduleForm}
                className="rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
              >
                Schedule Handover
              </button>
            )}
          >
            {match.handoverMethod && (
              <div className="space-y-1.5 rounded-xl bg-white/60 dark:bg-white/5 p-4 text-sm text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">Method:</span> {match.handoverMethod.replace(/_/g, " ")}</div>
                <div><span className="font-medium">Date/Time:</span> {match.pickupDateTime ? new Date(match.pickupDateTime).toLocaleString() : "—"}</div>
                {match.handoverAddress && (
                  <div>
                    <span className="font-medium">Location:</span> {match.handoverAddress}
                    {match.handoverLatitude != null && match.handoverLongitude != null && (
                      <>
                        {" "}
                        <a
                          href={`https://www.google.com/maps?q=${match.handoverLatitude},${match.handoverLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#b04a15] dark:text-[#e07b3a] hover:underline"
                        >
                          View on Google Maps →
                        </a>
                      </>
                    )}
                  </div>
                )}
                {!match.handoverAddress && match.handoverLatitude != null && match.handoverLongitude != null && (
                  <div>
                    <span className="font-medium">Location:</span>{" "}
                    <a
                      href={`https://www.google.com/maps?q=${match.handoverLatitude},${match.handoverLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#b04a15] dark:text-[#e07b3a] hover:underline"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
                {match.fulfilmentNotes && <div><span className="font-medium">Notes:</span> {match.fulfilmentNotes}</div>}
                <div><span className="font-medium">Reschedules used:</span> {rescheduleCount} / {MAX_RESCHEDULES}</div>
                {isDonor && rescheduleCount < MAX_RESCHEDULES && !CLOSED_STATUSES.has(match.status) && (
                  <button onClick={openScheduleForm} className="mt-1 rounded-lg bg-white/80 dark:bg-black/20 px-3 py-1.5 text-xs font-semibold text-[#b04a15] hover:bg-white transition-colors">
                    Reschedule
                  </button>
                )}
                {!isDonor && (
                  <p className="text-xs text-gray-400 pt-1">Only the donor can schedule or reschedule this handover.</p>
                )}
              </div>
            )}
            {showScheduleForm && isDonor && (
              <div className="mt-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 p-5 space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {match.handoverMethod ? "Reschedule Handover" : "Schedule Handover"}
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Method</label>
                  <Select value={handoverMethod} onValueChange={setHandoverMethod}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 h-auto text-sm font-normal focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/25 data-[state=open]:border-[#b04a15]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PERSON" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">In Person</SelectItem>
                      <SelectItem value="COURIER" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">Courier</SelectItem>
                      <SelectItem value="THIRD_PARTY" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">Third Party</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Date & Time</label>
                  <input type="datetime-local" value={pickupDateTime} onChange={(e) => setPickupDateTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Address (optional)</label>
                  <input type="text" value={handoverAddress} onChange={(e) => setHandoverAddress(e.target.value)} placeholder="e.g. Andheri East, Mumbai"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Pin exact location (optional)</label>
                  <LocationPinPicker
                    lat={pinLat}
                    lng={pinLng}
                    onChange={(lat, lng) => { setPinLat(lat); setPinLng(lng); }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Notes (optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
                {error && (
                  <p className="text-xs font-medium text-red-500">{error}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSchedule} disabled={submitting}
                    className="flex-1 rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? "Saving..." : "Confirm"}
                  </button>
                  <button onClick={() => setShowScheduleForm(false)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </TimelineStep>

          {/* Contact — direct calls, real-time coordination lives in chat below */}
          {!CLOSED_STATUSES.has(match.status) && match.status !== "DONOR_REVIEW" && match.status !== "PENDING_APPROVAL"
            && match.status !== "AWAITING_DONEE_CONFIRMATION" && match.status !== "DONEE_ACCEPTED" && (
            <TimelineStep
              icon={Phone}
              label="Step 3: Direct Contact"
              title="Contact Coordination"
              description="Use platform chat for details. Tap the button below to call directly — numbers are never shown."
              colorClasses={statusStepColor("")}
              isLast={!HANDOVER_CONFIRMABLE_STATUSES.has(match.status)}
            >
              {isDonee ? (
                <CallButton
                  phone={match.donorContact}
                  label="Call Donor"
                  lockedMessage="The donor hasn't enabled calls yet — use chat, or check back soon."
                />
              ) : (
                <div className="space-y-3">
                  <CallButton
                    phone={match.doneeContact}
                    label="Call Recipient"
                    lockedMessage="The recipient's number isn't available yet."
                  />
                  <CallPermissionToggle
                    allowed={match.donorAllowsDoneeCall}
                    onToggle={handleToggleDoneeCall}
                    loading={allowingCall}
                  />
                </div>
              )}
            </TimelineStep>
          )}
        </div>

        {/* Handover Confirmation */}
        {HANDOVER_CONFIRMABLE_STATUSES.has(match.status) && (
          <div className="mb-10 rounded-2xl bg-white/80 dark:bg-gray-900/80 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Handover Confirmation</h2>

            {problemSent && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                ✓ Your problem report has been sent to CauseKind. Our team will review and contact you. You can also use the chat below to communicate.
              </div>
            )}

            {/* Donor side */}
            {isDonor && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Generate an OTP to share with the recipient at the time of handover.</p>
                {otp ? (
                  <div className="rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-4 py-3 text-center">
                    <div className="text-2xl font-mono font-bold text-green-700 dark:text-green-400 tracking-widest">{otp}</div>
                    <p className="text-xs text-green-600 mt-1">Share this code with the recipient only at the point of handover.</p>
                  </div>
                ) : (
                  <button onClick={handleGenerateOtp} disabled={submitting}
                    className="rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    Generate OTP
                  </button>
                )}

                {!match.donorConfirmedAt ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Quantity handed over</label>
                    <input type="number" value={donorQty} onChange={(e) => setDonorQty(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                    <button onClick={handleDonorConfirm} disabled={submitting}
                      className="w-full rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      ✓ Confirm I Handed Over
                    </button>
                    <div className="relative flex items-center pt-1">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      <span className="mx-3 text-xs text-gray-400">or</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <button onClick={() => setShowProblemForm(v => !v)}
                      className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                      ✕ Recipient didn&apos;t come / Handover failed
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-green-600">✓ You confirmed handover of {match.donorConfirmedQty} item(s).</p>
                )}
              </div>
            )}

            {/* Donee side */}
            {isDonee && (
              <div className="space-y-3">
                {!match.doneeConfirmedAt ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">OTP from donor (for in-person handover)</label>
                      <input type="text" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="6-digit OTP"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Quantity received</label>
                      <input type="number" value={doneeQty} onChange={(e) => setDoneeQty(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Condition matches description?</label>
                      <Select value={conditionRating} onValueChange={setConditionRating}>
                        <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 h-auto text-sm font-normal focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/25 data-[state=open]:border-[#b04a15]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AS_DESCRIBED" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">Yes, as described</SelectItem>
                          <SelectItem value="MINOR_DIFF" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">Minor differences — I still accept it</SelectItem>
                          <SelectItem value="MAJOR_DIFF" className="focus:bg-[#b04a15]/10 focus:text-[#b04a15]">Major differences — I have concerns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button onClick={handleDoneeConfirm} disabled={submitting}
                      className="w-full rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      ✓ Confirm Receipt
                    </button>
                    <div className="relative flex items-center pt-1">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      <span className="mx-3 text-xs text-gray-400">or</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <button onClick={() => setShowProblemForm(v => !v)}
                      className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                      ✕ I did not receive the item / There is a problem
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-green-600">✓ You confirmed receipt of {match.doneeConfirmedQty} item(s).</p>
                )}
              </div>
            )}

            {/* Problem form (shared) */}
            {showProblemForm && (
              <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">Report a Handover Problem</h3>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Do not use this for minor issues — only if the handover completely failed or you believe this donation cannot proceed as planned.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-red-600 dark:text-red-400">What happened? *</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(isDonee
                      ? ["Donor didn't show up", "Wrong item received", "Item in unusable condition", "Other"]
                      : ["Recipient didn't show up", "Recipient refused the item", "I can no longer donate this item", "Other"]
                    ).map(reason => (
                      <button key={reason} onClick={() => setProblemDesc(reason)}
                        className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${
                          problemDesc === reason
                            ? "border-red-500 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-semibold"
                            : "border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        }`}>
                        {reason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={problemNote}
                    onChange={(e) => setProblemNote(e.target.value)}
                    placeholder="Add more details (optional)..."
                    rows={2}
                    className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="rounded-lg bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">What would you like to do?</p>

                  {isDonor && rescheduleCount < MAX_RESCHEDULES && (
                    <button
                      onClick={() => { setShowProblemForm(false); openScheduleForm(); }}
                      className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 text-left hover:bg-amber-100 transition-colors">
                      📅 Reschedule for a different time
                      <span className="block text-xs font-normal opacity-70 mt-0.5">
                        {MAX_RESCHEDULES - rescheduleCount} reschedule{MAX_RESCHEDULES - rescheduleCount > 1 ? "s" : ""} remaining
                      </span>
                    </button>
                  )}
                  {isDonor && rescheduleCount >= MAX_RESCHEDULES && (
                    <div className="rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs text-stone-500">
                      Maximum reschedules reached — only admin intervention is available.
                    </div>
                  )}
                  {isDonee && (
                    <div className="rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs text-stone-500">
                      Only the donor can reschedule this handover. Notify CauseKind below if you need help coordinating a new time.
                    </div>
                  )}

                  <button
                    onClick={handleReportProblem}
                    disabled={!problemDesc.trim() || problemSubmitting}
                    className="w-full rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white text-left disabled:opacity-50 transition-colors">
                    🚨 Notify CauseKind — I need admin help
                    <span className="block text-xs font-normal opacity-80 mt-0.5">Our team will review and contact both parties within 24 hours.</span>
                  </button>
                </div>

                <button onClick={() => { setShowProblemForm(false); setProblemDesc(""); setProblemNote(""); }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                  Cancel — go back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {user && (
          <div>
            <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">Messages</h2>
            <MatchChatWindow
              matchId={matchId}
              currentUserEmail={user.email}
              locked={CLOSED_STATUSES.has(match.status)}
              className="shadow-sm"
            />
          </div>
        )}
      </div>

      <HandoverCelebration
        contextType="MATCH"
        contextId={matchId}
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </main>
  );
}

function TimelineStep({
  icon: Icon, label, title, description, action, isLast, colorClasses, titleClassName, children,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  isLast?: boolean;
  colorClasses: { text: string; border: string; bg: string };
  titleClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-5">
      {!isLast && <div className="absolute left-[19px] top-11 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />}
      <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 bg-[#fdf6ef] dark:bg-gray-950 ${colorClasses.border}`}>
        <Icon className={`h-4 w-4 ${colorClasses.text}`} />
      </div>
      <div className="min-w-0 flex-1 pb-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
            <h2 className={`mt-0.5 text-xl font-bold ${titleClassName ?? "text-gray-900 dark:text-gray-100"}`}>{title}</h2>
            {description && <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

// ── Direct-call button — numbers are never rendered as text. Tap to place the
// call straight away (tel: link), or see a locked state with a why-not notice.

function CallButton({
  phone, label, lockedMessage,
}: {
  phone: string | null;
  label: string;
  lockedMessage: string;
}) {
  const [showNotice, setShowNotice] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (phone) {
    return (
      <a
        href={`tel:${phone}`}
        className="flex w-full items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white dark:hover:bg-white/10"
      >
        <div className="animate-call-pulse flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#b04a15] text-white">
          <PhoneCall className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-400">Tap to call — numbers stay private</p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
      </a>
    );
  }

  function handleClick() {
    setShowNotice(true);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setShowNotice(false), 3200);
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="animate-locked-pulse flex w-full items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 px-4 py-3.5 text-left"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-400">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </button>

      {showNotice && (
        <div className="animate-notice-pop absolute inset-x-0 top-full z-10 mt-2 rounded-xl bg-gray-900 dark:bg-gray-800 px-4 py-3 text-xs text-white shadow-lg">
          {lockedMessage}
        </div>
      )}
    </div>
  );
}

// ── Donor-only permission switch — reversible any time, no numbers involved ────

function CallPermissionToggle({
  allowed, onToggle, loading,
}: {
  allowed: boolean;
  onToggle: (next: boolean) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-white/5 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Let the recipient call you</p>
          <p className="text-xs text-gray-400">
            {allowed ? "On — they can call you now. Turn off any time." : "Off — turn on whenever you're ready to take calls."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowed}
          disabled={loading}
          onClick={() => onToggle(!allowed)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${allowed ? "bg-[#b04a15]" : "bg-gray-300 dark:bg-gray-700"}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${allowed ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}
