"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getDonationOffer, getHandover, scheduleHandover, rescheduleHandover,
  generateHandoverOtp, confirmHandoverDonor, confirmHandoverDonee,
  sendChatMessage, setDoneeCallPermission,
  type DonationOffer, type HandoverRecord, type OfferHandoverMethod,
} from "@/lib/api";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  ArrowLeft, ShieldCheck, CalendarDays, Phone, PhoneCall, Package, ChevronRight,
  Lock, type LucideIcon,
} from "lucide-react";

const STATUS_STEP_INFO: Record<string, { title: string; description: string }> = {
  ADMIN_APPROVED:       { title: "Admin Approved",       description: "Your offer has been verified and is ready for the next step." },
  HANDOVER_IN_PROGRESS: { title: "Handover In Progress", description: "Coordinate the handover below, then confirm once it's done." },
  HANDOVER_AT_RISK:     { title: "Handover At Risk",     description: "This handover has been rescheduled multiple times and needs admin review." },
  ISSUE_WINDOW_OPEN:    { title: "Delivery Confirmed",   description: "Both sides confirmed the handover. Report a problem now if something's wrong." },
  ISSUE_RAISED:         { title: "Issue Under Review",   description: "Our team is reviewing a reported issue with this handover." },
  COMPLETED:            { title: "Completed",            description: "This donation is complete — thank you for your contribution!" },
};

function statusStepColor(status: string) {
  if (status === "COMPLETED") return { text: "text-green-700 dark:text-green-400", border: "border-green-300 dark:border-green-700", bg: "bg-green-50 dark:bg-green-950/30" };
  if (status === "HANDOVER_AT_RISK" || status === "ISSUE_RAISED") return { text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-700", bg: "bg-red-50 dark:bg-red-950/30" };
  return { text: "text-[#b04a15] dark:text-[#e07b3a]", border: "border-[#b04a15]/30 dark:border-[#e07b3a]/40", bg: "bg-orange-50 dark:bg-orange-950/20" };
}

export default function HandoverHubPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const offerId = Number(params.id);

  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [handover, setHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [method, setMethod] = useState<OfferHandoverMethod>("PICKUP");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  // Confirmation
  const [donorQty, setDonorQty] = useState("");
  const [doneeQty, setDoneeQty] = useState("");
  const [conditionRating, setConditionRating] = useState("AS_DESCRIBED");
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemDesc, setProblemDesc] = useState("");   // quick-select chip
  const [problemNote, setProblemNote] = useState("");   // free-text detail
  const [problemSubmitting, setProblemSubmitting] = useState(false);
  const [problemSent, setProblemSent] = useState(false);
  const [allowingCall, setAllowingCall] = useState(false);

  const isDonee = user?.role === "DONEE";

  useEffect(() => {
    if (!offerId) return;
    Promise.all([
      getDonationOffer(offerId).then(setOffer),
      getHandover(offerId).then(setHandover).catch(() => {}),
    ])
      .catch(() => setError("Failed to load handover details"))
      .finally(() => setLoading(false));
  }, [offerId]);

  // Real-time: refetch offer + handover whenever either changes server-side (donor/donee
  // actions, admin actions, scheduled jobs) — reflects within a second, no refresh needed.
  useEntityUpdates(["OFFER", "HANDOVER"], (_latest, batch) => {
    if (!offerId || !batch.some((d) => d.entityId === offerId)) return;
    getDonationOffer(offerId).then(setOffer).catch(() => {});
    getHandover(offerId).then(setHandover).catch(() => {});
  });

  async function handleSchedule() {
    if (!scheduledDateTime) { setError("Please select a date and time"); return; }
    setSubmitting(true); setError(null);
    try {
      const record = await scheduleHandover(offerId, {
        method, scheduledDateTime: new Date(scheduledDateTime).toISOString(),
        locationAddress: locationAddress || undefined,
      });
      setHandover(record);
      setShowScheduleForm(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to schedule"); }
    finally { setSubmitting(false); }
  }

  async function handleReschedule() {
    if (!scheduledDateTime) { setError("Please select a new date and time"); return; }
    setSubmitting(true); setError(null);
    try {
      const record = await rescheduleHandover(offerId, {
        scheduledDateTime: new Date(scheduledDateTime).toISOString(),
        locationAddress: locationAddress || undefined,
      });
      setHandover(record);
      setShowScheduleForm(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to reschedule"); }
    finally { setSubmitting(false); }
  }

  async function handleGenerateOtp() {
    setSubmitting(true);
    try {
      const result = await generateHandoverOtp(offerId);
      setOtp(result.otp);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDonorConfirm() {
    if (!donorQty) { setError("Enter quantity"); return; }
    setSubmitting(true); setError(null);
    try {
      const record = await confirmHandoverDonor(offerId, Number(donorQty));
      setHandover(record);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleToggleDoneeCall(next: boolean) {
    setAllowingCall(true);
    try {
      const updated = await setDoneeCallPermission(offerId, next);
      setOffer(updated);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to update"); }
    finally { setAllowingCall(false); }
  }

  async function handleReportProblem() {
    if (!problemDesc.trim()) { setError("Please select what happened"); return; }
    const fullMessage = problemNote.trim()
      ? `${problemDesc}: ${problemNote.trim()}`
      : problemDesc;
    setProblemSubmitting(true); setError(null);
    try {
      // Send to the chat thread so admin can see it
      await sendChatMessage(offerId,
        `[HANDOVER PROBLEM] ${isDonee ? "Recipient" : "Donor"} reported an issue: ${fullMessage}`,
        "SYSTEM"
      );
      // Also reschedule if possible
      if (handover && handover.rescheduleCount < 2) {
        // Just flag — they can use the Reschedule button for new time
      }
      setProblemSent(true);
      setShowProblemForm(false);
      setProblemDesc("");
      setProblemNote("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to send problem report"); }
    finally { setProblemSubmitting(false); }
  }

  async function handleDoneeConfirm() {
    if (!doneeQty) { setError("Enter quantity"); return; }
    setSubmitting(true); setError(null);
    try {
      const record = await confirmHandoverDonee(offerId, {
        otp: otpInput || undefined,
        quantityReceived: Number(doneeQty),
        conditionRating,
      });
      setHandover(record);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="animate-pulse text-gray-500">Loading...</p></div>;

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
              {offer && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#b04a15] dark:text-[#e07b3a]">
                  <Package className="h-3.5 w-3.5" />
                  {offer.requestTitle}
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  {isDonee
                    ? offer.donorName ? `Donor: ${offer.donorName}` : ""
                    : offer.doneeName ? `Recipient: ${offer.doneeName}` : ""}
                </p>
              )}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Transaction ID: #CK-{String(offerId).padStart(5, "0")}
            </p>
          </div>
        </div>

        {/* At-risk banner */}
        {handover?.atRisk && (
          <div className="mb-6 border-l-4 border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            This handover has been rescheduled multiple times and requires admin review.
          </div>
        )}

        {error && (
          <div className="mb-6 border-l-4 border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Vertical timeline — current status → schedule → contact → (confirmation) */}
        <div className="mb-10">
          {offer && (() => {
            const info = STATUS_STEP_INFO[offer.status] ?? { title: offer.status.replace(/_/g, " "), description: "" };
            const colors = statusStepColor(offer.status);
            return (
              <TimelineStep
                icon={ShieldCheck}
                label="Current Status"
                title={info.title}
                description={info.description}
                colorClasses={colors}
                titleClassName={colors.text}
                action={offer.status === "COMPLETED" && (
                  <button
                    onClick={() => router.push(`/certificate?offerId=${offerId}`)}
                    className="rounded-xl bg-[#b04a15] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c45520] transition-colors"
                  >
                    View Certificate
                  </button>
                )}
              />
            );
          })()}

          <TimelineStep
            icon={CalendarDays}
            label="Step 2: Logistics"
            title="Handover Schedule"
            description={!handover
              ? isDonee
                ? "The donor will pick a date and time — it's their item, so the schedule is theirs to set. You'll be notified as soon as it's fixed."
                : "Select a date and time that works for both you and the recipient."
              : undefined}
            colorClasses={statusStepColor("")}
            action={!handover && !isDonee && (
              <button
                onClick={() => setShowScheduleForm(true)}
                className="rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
              >
                Schedule Handover
              </button>
            )}
          >
            {!handover && isDonee && (
              <div className="rounded-xl bg-white/60 dark:bg-white/5 p-4 text-sm text-gray-500 dark:text-gray-400">
                ⏳ Waiting for the donor to schedule the handover…
              </div>
            )}
            {handover && (
              <div className="space-y-1.5 rounded-xl bg-white/60 dark:bg-white/5 p-4 text-sm text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">Method:</span> {handover.method}</div>
                <div><span className="font-medium">Date/Time:</span> {handover.scheduledDateTime ? new Date(handover.scheduledDateTime).toLocaleString() : "—"}</div>
                {handover.locationAddress && <div><span className="font-medium">Location:</span> {handover.locationAddress}</div>}
                <div><span className="font-medium">Reschedules used:</span> {handover.rescheduleCount} / 2</div>
                {!isDonee && handover.rescheduleCount < 2 && (
                  <button onClick={() => setShowScheduleForm(true)} className="mt-1 rounded-lg bg-white/80 dark:bg-black/20 px-3 py-1.5 text-xs font-semibold text-[#b04a15] hover:bg-white transition-colors">
                    Reschedule
                  </button>
                )}
                {isDonee && (
                  <p className="pt-1 text-xs text-gray-400">
                    Need a different time? Ask the donor in the chat below — scheduling is in their hands.
                  </p>
                )}
              </div>
            )}
            {showScheduleForm && !isDonee && (
              <div className="mt-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 p-5 space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {handover ? "Reschedule Handover" : "Schedule Handover"}
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as OfferHandoverMethod)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                    <option value="PICKUP">Donee picks up from donor</option>
                    <option value="DROP_OFF">Donor delivers to donee</option>
                    <option value="COURIER">Courier delivery</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Date & Time</label>
                  <input type="datetime-local" value={scheduledDateTime} onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">General Location (no full address needed yet)</label>
                  <input type="text" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="e.g. Andheri East, Mumbai"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handover ? handleReschedule : handleSchedule} disabled={submitting}
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

          {/* Contact coordination — visible from ADMIN_APPROVED onwards */}
          {offer && ["ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_WINDOW_OPEN", "ISSUE_RAISED"].includes(offer.status) && (
            <TimelineStep
              icon={Phone}
              label="Step 3: Direct Contact"
              title="Contact Coordination"
              description="Use platform chat for details. Tap the button below to call directly — numbers are never shown."
              colorClasses={statusStepColor("")}
              isLast={!(handover && offer.status === "HANDOVER_IN_PROGRESS")}
            >
              {isDonee ? (
                <CallButton
                  phone={offer.donorPhone}
                  label="Call Donor"
                  lockedMessage="The donor hasn't turned on calling yet — try again later, or use chat for now."
                />
              ) : (
                <div className="space-y-3">
                  <CallButton
                    phone={offer.doneePhone}
                    label="Call Recipient"
                    lockedMessage="The recipient's number isn't available yet."
                  />
                  <CallPermissionToggle
                    allowed={offer.donorAllowsDoneeCall}
                    onToggle={handleToggleDoneeCall}
                    loading={allowingCall}
                  />
                </div>
              )}
            </TimelineStep>
          )}
        </div>

        {/* Stage 10: OTP & Confirmation */}
        {handover && offer?.status === "HANDOVER_IN_PROGRESS" && (
          <div className="mb-10 rounded-2xl bg-white/80 dark:bg-gray-900/80 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Handover Confirmation</h2>

            {/* Problem sent banner */}
            {problemSent && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                ✓ Your problem report has been sent to CauseKind. Our team will review and contact you. You can also use the chat below to communicate.
              </div>
            )}

            {/* ── Donor side ─────────────────────────────────────────────── */}
            {!isDonee && (
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

                {!handover.confirmation?.donorConfirmedAt ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Quantity handed over</label>
                    <input type="number" value={donorQty} onChange={(e) => setDonorQty(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" />
                    {/* Primary confirm */}
                    <button onClick={handleDonorConfirm} disabled={submitting}
                      className="w-full rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      ✓ Confirm I Handed Over
                    </button>
                    {/* Problem divider */}
                    <div className="relative flex items-center pt-1">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      <span className="mx-3 text-xs text-gray-400">or</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <button onClick={() => setShowProblemForm(v => !v)}
                      className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                      ✕ Recipient didn't come / Handover failed
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-green-600">✓ You confirmed handover of {handover.confirmation.donorConfirmedQty} item(s).</p>
                )}
              </div>
            )}

            {/* ── Donee side ─────────────────────────────────────────────── */}
            {isDonee && (
              <div className="space-y-3">
                {!handover.confirmation?.doneeConfirmedAt ? (
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
                      <select value={conditionRating} onChange={(e) => setConditionRating(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                        <option value="AS_DESCRIBED">Yes, as described</option>
                        <option value="MINOR_DIFF">Minor differences — I still accept it</option>
                        <option value="MAJOR_DIFF">Major differences — I have concerns</option>
                      </select>
                    </div>
                    {/* Primary confirm */}
                    <button onClick={handleDoneeConfirm} disabled={submitting}
                      className="w-full rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      ✓ Confirm Receipt
                    </button>
                    {/* Problem divider */}
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
                  <p className="text-sm text-green-600">✓ You confirmed receipt of {handover.confirmation.doneeConfirmedQty} item(s).</p>
                )}
              </div>
            )}

            {/* ── Problem form (shared) ──────────────────────────────────── */}
            {showProblemForm && (
              <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">Report a Handover Problem</h3>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Do not use this for minor issues — only if the handover completely failed or you believe this donation cannot proceed as planned.
                  </p>
                </div>

                {/* What went wrong */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-red-600 dark:text-red-400">What happened? *</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(isDonee
                      ? ["Donor didn't show up", "Wrong item received", "Item in unusable condition", "Donor demanded payment", "Other"]
                      : ["Recipient didn't show up", "Recipient refused the item", "I can no longer donate this item", "Safety concern", "Other"]
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

                {/* Context-aware action section */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">What would you like to do?</p>

                  {/* Donor already confirmed — dispute scenario */}
                  {isDonee && handover?.confirmation?.donorConfirmedAt && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-2">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                        ⚠ The donor has already confirmed this handover
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Since the donor has confirmed they handed over the item, this is a dispute.
                        Rescheduling is not available — please notify CauseKind so we can investigate.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {/* Reschedule — donor only (it's their item and their schedule) */}
                    {!isDonee && handover && handover.rescheduleCount < 2 && (
                      <button
                        onClick={() => { setShowProblemForm(false); setShowScheduleForm(true); }}
                        className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 text-left hover:bg-amber-100 transition-colors">
                        📅 Reschedule for a different time
                        <span className="block text-xs font-normal opacity-70 mt-0.5">
                          {2 - handover.rescheduleCount} reschedule{2 - handover.rescheduleCount > 1 ? "s" : ""} remaining
                          {" "}— the other party will be notified of the new time
                        </span>
                      </button>
                    )}
                    {isDonee && handover && !handover.confirmation?.donorConfirmedAt && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        Scheduling is in the donor&apos;s hands — ask for a new time in the chat, or notify CauseKind below if you can&apos;t reach them.
                      </div>
                    )}

                    {/* Reschedule limit reached */}
                    {!isDonee && handover && handover.rescheduleCount >= 2 && (
                      <div className="rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs text-stone-500">
                        Maximum reschedules reached — only admin intervention is available.
                      </div>
                    )}

                    {/* Notify admin — always available */}
                    <button
                      onClick={handleReportProblem}
                      disabled={!problemDesc.trim() || problemSubmitting}
                      className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white text-left disabled:opacity-50 transition-colors">
                      🚨 Notify CauseKind — I need admin help
                      <span className="block text-xs font-normal opacity-80 mt-0.5">
                        {isDonee && handover?.confirmation?.donorConfirmedAt
                          ? "Admin will contact both parties and investigate this dispute."
                          : "Our team will review and contact both parties within 24 hours."}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Rescheduling explanation — donor only, since only they can reschedule */}
                {!isDonee && handover && handover.rescheduleCount < 2 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    <span className="font-medium">How rescheduling works:</span>{" "}
                    A new time is agreed between both parties. The recipient will need to confirm receipt at the new time.{" "}
                    After {2 - handover.rescheduleCount} more reschedule{2 - handover.rescheduleCount > 1 ? "s" : ""}, the case is automatically flagged for admin review.
                  </div>
                )}

                <button onClick={() => { setShowProblemForm(false); setProblemDesc(""); setProblemNote(""); }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                  Cancel — go back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat — full width below the timeline */}
        {offer && user && (
          <div>
            <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">Messages</h2>
            <ChatWindow
              offerId={offerId}
              currentUserEmail={user.email}
              locked={offer.status === "COMPLETED" || offer.status === "CANCELLED" || offer.status === "WITHDRAWN"}
              className="shadow-sm"
            />
          </div>
        )}
      </div>
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
