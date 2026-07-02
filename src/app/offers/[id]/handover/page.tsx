"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getDonationOffer, getHandover, scheduleHandover, rescheduleHandover,
  generateHandoverOtp, confirmHandoverDonor, confirmHandoverDonee,
  sendChatMessage, requestOfferCall,
  type DonationOffer, type HandoverRecord, type OfferHandoverMethod,
} from "@/lib/api";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/hooks/useAuth";

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
  const [callRequesting, setCallRequesting] = useState(false);

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

  async function handleRequestCall() {
    setCallRequesting(true);
    try {
      const updated = await requestOfferCall(offerId);
      setOffer(updated);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to request contact"); }
    finally { setCallRequesting(false); }
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-8 space-y-5">
        {/* Header */}
        <div>
          <button onClick={() => router.back()} className="mb-2 text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Handover Hub</h1>
          {offer && (
            <p className="text-sm text-gray-500">
              {offer.requestTitle}
              {isDonee
                ? offer.donorName ? ` · Donor: ${offer.donorName}` : ""
                : offer.doneeName ? ` · Recipient: ${offer.doneeName}` : ""}
            </p>
          )}
        </div>

        {/* At-risk banner */}
        {handover?.atRisk && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            This handover has been rescheduled multiple times and requires admin review.
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Offer status */}
        {offer && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">Offer Status</div>
                <StatusChip status={offer.status} />
              </div>
              {offer.status === "COMPLETED" && (
                <button
                  onClick={() => router.push(`/certificate?offerId=${offerId}`)}
                  className="rounded-xl bg-[#b04a15] px-4 py-2 text-xs font-semibold text-white"
                >
                  View Certificate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Handover scheduling */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">Handover Schedule</h2>
          {handover ? (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">Method:</span> {handover.method}</div>
              <div><span className="font-medium">Date/Time:</span> {handover.scheduledDateTime ? new Date(handover.scheduledDateTime).toLocaleString() : "—"}</div>
              {handover.locationAddress && <div><span className="font-medium">Location:</span> {handover.locationAddress}</div>}
              <div><span className="font-medium">Reschedules used:</span> {handover.rescheduleCount} / 2</div>
              {handover.rescheduleCount < 2 && (
                <button onClick={() => setShowScheduleForm(true)} className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                  Reschedule
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowScheduleForm(true)}
              className="rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Schedule Handover
            </button>
          )}
        </div>

        {/* Schedule form */}
        {showScheduleForm && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
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
                <option value="CAUSEKIND_LOGISTICS">CauseKind arranges</option>
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

        {/* Phone Contact Card — visible from ADMIN_APPROVED onwards */}
        {offer && ["ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_WINDOW_OPEN", "ISSUE_RAISED"].includes(offer.status) && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h2 className="mb-1 font-semibold text-gray-800 dark:text-gray-200">📞 Contact the Other Party</h2>
            <p className="text-xs text-gray-500 mb-3">
              Use in-platform chat first. Request phone contact only when needed to coordinate handover logistics.
            </p>

            {/* Determine which phone to show based on role */}
            {(() => {
              const myPhone = isDonee ? offer.donorPhone : offer.doneePhone;
              const otherLabel = isDonee ? "Donor" : "Recipient";

              if (myPhone) {
                return (
                  <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
                      {otherLabel}&apos;s Phone Number
                    </p>
                    <a href={`tel:${myPhone}`}
                      className="text-xl font-mono font-bold text-green-800 dark:text-green-300 hover:underline tracking-widest">
                      {myPhone}
                    </a>
                    <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
                      This number has been shared with consent. Do not share it with third parties.
                    </p>
                  </div>
                );
              }

              if (offer.callMaskingRequested) {
                return (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    Phone contact was requested. The {otherLabel.toLowerCase()}&apos;s number will appear here once available.
                  </div>
                );
              }

              return (
                <button
                  onClick={handleRequestCall}
                  disabled={callRequesting}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-[#b04a15] hover:text-[#b04a15] transition-colors disabled:opacity-50">
                  {callRequesting ? "Requesting..." : `📞 Request ${otherLabel}'s Phone Number`}
                  <span className="block text-xs font-normal text-gray-400 mt-0.5">
                    Both parties will see each other&apos;s number
                  </span>
                </button>
              );
            })()}
          </div>
        )}

        {/* Stage 10: OTP & Confirmation */}
        {handover && offer?.status === "HANDOVER_IN_PROGRESS" && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
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
                    {/* Reschedule — only if no dispute (donor hasn't confirmed yet or it's the donor reporting) */}
                    {handover && handover.rescheduleCount < 2 &&
                      !(isDonee && handover.confirmation?.donorConfirmedAt) && (
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

                    {/* Reschedule limit reached */}
                    {handover && handover.rescheduleCount >= 2 &&
                      !(isDonee && handover.confirmation?.donorConfirmedAt) && (
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

                {/* Rescheduling explanation */}
                {handover && handover.rescheduleCount < 2 && !(isDonee && handover?.confirmation?.donorConfirmedAt) && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    <span className="font-medium">How rescheduling works:</span>{" "}
                    A new time is agreed between both parties. {isDonee
                      ? "The donor will need to re-confirm the handover at the new time."
                      : "The recipient will need to confirm receipt at the new time."}{" "}
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

        {/* Chat */}
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

function StatusChip({ status }: { status: string }) {
  const color = status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
    : status === "HANDOVER_AT_RISK" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
    : status === "ADMIN_APPROVED" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{status.replace(/_/g, " ")}</span>;
}
