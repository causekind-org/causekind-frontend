"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getAnonymizedRequest,
  getQuantityAllocation,
  getMyDonationOffers,
  createOfferDraft,
  updateOfferItemDetails,
  uploadOfferMedia,
  checkOfferCompatibility,
  submitOffer,
  type AnonymizedRequest,
  type QuantityAllocation,
  type DonationOffer,
  type OfferStatus,
  type DonorFlowType,
  type CompatibilityCheck,
} from "@/lib/api";
import CompatibilityIndicator from "@/components/CompatibilityIndicator";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// ── Existing offer status → guidance ──────────────────────────────────────────

type OfferGuidance = {
  title: string;
  explanation: string;
  action?: { label: string; href: string };
  resumeStep?: 2 | 3;
  color: "blue" | "amber" | "green" | "red";
};

function getOfferGuidance(offer: DonationOffer): OfferGuidance {
  const s = offer.status as OfferStatus;
  switch (s) {
    case "DRAFT":
    case "NEEDS_INFORMATION":
      return { title: "Continue your offer", explanation: s === "NEEDS_INFORMATION" ? "More information is required before your offer can proceed. Please update your item details." : "Your draft is saved. Pick up where you left off.", resumeStep: 3, color: "amber" };
    case "SUBMITTED":
    case "AI_ELIGIBILITY_SCREENING":
    case "AI_COMPATIBILITY_SCREENING":
    case "COMPATIBILITY_CHECKED":
      return { title: "AI screening in progress", explanation: "Your offer has been submitted and is being automatically checked. No action needed — we will notify you when it's done.", color: "blue" };
    case "PENDING_DONEE_REVIEW":
    case "SOFT_RESERVED_PRIMARY":
    case "SOFT_RESERVED_BACKUP":
      return { title: "Waiting for recipient", explanation: "Your offer has been sent to the recipient for review. They will accept or decline it. You will be notified as soon as they respond.", color: "blue" };
    case "DONEE_ACCEPTED":
    case "DONOR_RECONFIRMATION_REQUIRED":
      return { title: "Recipient accepted — please reconfirm", explanation: "The recipient accepted your offer. Please confirm that your item is still available and in the same condition.", action: { label: "Go to My Offers", href: "/offers" }, color: "amber" };
    case "DONOR_RECONFIRMED":
    case "PENDING_ADMIN_APPROVAL":
    case "CONDITION_CHANGED_RESCREENING":
      return { title: "Admin is reviewing", explanation: "Your offer has been accepted by the recipient and is now being reviewed by the CauseKind admin team before final approval.", color: "blue" };
    case "ADMIN_APPROVED":
      return { title: "Approved! Schedule your handover", explanation: "Your offer was approved. Go to the Handover Hub to schedule when and how you will hand over the item.", action: { label: "Open Handover Hub", href: `/offers/${offer.id}/handover` }, color: "green" };
    case "HANDOVER_IN_PROGRESS":
    case "HANDOVER_AT_RISK":
      return { title: s === "HANDOVER_AT_RISK" ? "Handover needs attention" : "Handover in progress", explanation: s === "HANDOVER_AT_RISK" ? "The handover has been rescheduled multiple times. Please contact the recipient or admin to resolve this." : "Your handover is scheduled. Go to the Handover Hub to generate the OTP and confirm the handover.", action: { label: "Open Handover Hub", href: `/offers/${offer.id}/handover` }, color: s === "HANDOVER_AT_RISK" ? "amber" : "blue" };
    case "ISSUE_WINDOW_OPEN":
      return { title: "Delivery confirmed", explanation: "Both parties confirmed the handover. The issue reporting window is open for a short time. If there's any problem, report it now.", action: { label: "Report an issue", href: `/offers/${offer.id}/issues` }, color: "green" };
    case "ISSUE_RAISED":
      return { title: "Issue under review", explanation: "An issue was reported for this donation. Our team is reviewing it. We will contact you if any action is needed.", color: "amber" };
    case "COMPLETED":
      return { title: "Donation complete!", explanation: "Your donation was successfully completed. You can now download your certificate.", action: { label: "View Certificate", href: `/certificate?offerId=${offer.id}` }, color: "green" };
    default:
      return { title: "Offer status: " + s, explanation: "Please check My Offers for more details.", action: { label: "View My Offers", href: "/offers" }, color: "blue" };
  }
}

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface FormState {
  flowType: DonorFlowType | null;
  brand: string;
  model: string;
  approximateAge: string;
  condition: string;
  workingStatus: string;
  knownDefects: string;
  accessoriesIncluded: string;
  quantity: string;
  specNotes: string;
  pickupCity: string;
  pickupPincode: string;
  pickupLocality: string;
  maxTravelDistanceKm: string;
  deliveryCostBornBy: string;
  donorDropOffAvailable: boolean;
  declarationsAccepted: boolean;
}

const INITIAL: FormState = {
  flowType: null,
  brand: "", model: "", approximateAge: "", condition: "", workingStatus: "",
  knownDefects: "", accessoriesIncluded: "", quantity: "1", specNotes: "",
  pickupCity: "", pickupPincode: "", pickupLocality: "",
  maxTravelDistanceKm: "", deliveryCostBornBy: "DONOR",
  donorDropOffAvailable: false, declarationsAccepted: false,
};

type Action = { type: "SET"; key: keyof FormState; value: string | boolean | DonorFlowType };
function reducer(state: FormState, action: Action): FormState {
  return { ...state, [action.key]: action.value };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OfferWizardPage() {
  const params = useParams();
  const router = useRouter();
  useAuth();
  const requestId = Number(params.id);

  const [step, setStep] = useState<Step>(1);
  const [form, dispatch] = useReducer(reducer, INITIAL);
  const [request, setRequest] = useState<AnonymizedRequest | null>(null);
  const [qty, setQty] = useState<QuantityAllocation | null>(null);
  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [existingOffer, setExistingOffer] = useState<DonationOffer | null>(null);
  const [compat, setCompat] = useState<CompatibilityCheck | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load request data and check for an existing offer
  useEffect(() => {
    if (!requestId) return;
    getAnonymizedRequest(requestId).then(setRequest).catch(() => {});
    getQuantityAllocation(requestId).then(setQty).catch(() => {});
    // Check if the donor already has an offer for this request
    getMyDonationOffers()
      .then((offers) => {
        const found = offers.find((o) => o.requestId === requestId &&
          !["WITHDRAWN", "CANCELLED", "ADMIN_REJECTED", "DONEE_DECLINED"].includes(o.status));
        if (found) setExistingOffer(found);
      })
      .catch(() => {});
  }, [requestId]);

  // Debounced compatibility check
  useEffect(() => {
    if (!offer || step !== 3) return;
    if (compatTimer.current) clearTimeout(compatTimer.current);
    compatTimer.current = setTimeout(async () => {
      try {
        const result = await checkOfferCompatibility(offer.id);
        setCompat(result);
      } catch {}
    }, 600);
    return () => { if (compatTimer.current) clearTimeout(compatTimer.current); };
  }, [form.condition, form.quantity, offer, step]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    dispatch({ type: "SET", key, value: value as string | boolean | DonorFlowType });
  }

  // ── Step 2: Select flow type + create/resume draft ────────────────────────
  async function handleFlowSelect(flowType: DonorFlowType) {
    set("flowType", flowType);
    setLoading(true);
    setError(null);
    try {
      const returned = await createOfferDraft(requestId, flowType);
      setOffer(returned);
      // If backend returned an existing active offer (not a fresh draft), handle it
      if (returned.status !== "DRAFT" && returned.status !== "NEEDS_INFORMATION") {
        setExistingOffer(returned);
        return; // Stay on Step 1 — the existing offer banner will appear
      }
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create offer draft");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Save item details ──────────────────────────────────────────────
  async function saveDetails() {
    if (!offer) return;
    setLoading(true);
    setError(null);
    try {
      await updateOfferItemDetails(offer.id, {
        brand: form.brand || undefined,
        model: form.model || undefined,
        approximateAge: form.approximateAge || undefined,
        condition: form.condition || undefined,
        workingStatus: form.workingStatus || undefined,
        knownDefects: form.knownDefects || undefined,
        accessoriesIncluded: form.accessoriesIncluded || undefined,
        quantity: Number(form.quantity),
        specNotes: form.specNotes || undefined,
        pickupCity: form.pickupCity || undefined,
        pickupPincode: form.pickupPincode || undefined,
        pickupLocality: form.pickupLocality || undefined,
        maxTravelDistanceKm: form.maxTravelDistanceKm ? Number(form.maxTravelDistanceKm) : undefined,
        deliveryCostBornBy: form.deliveryCostBornBy || undefined,
        donorDropOffAvailable: form.donorDropOffAvailable,
      });

      // Only upload if donor selected new files AND the offer doesn't already have media
      // (prevents duplicate uploads on re-submission after a failed submit)
      if (files.length > 0 && (offer.media?.length ?? 0) === 0) {
        await uploadOfferMedia(offer.id, files);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save details");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3Submit() {
    if (!form.condition) { setError("Please select item condition"); return; }
    if (!form.pickupCity) { setError("Pickup city is required"); return; }
    if (files.length < 2) { setError("Please upload at least 2 photos"); return; }
    if (!form.declarationsAccepted) { setError("Please accept all declarations"); return; }
    setError(null);
    try {
      await saveDetails();
      setStep(4);
      await handleSubmit();
    } catch {}
  }

  async function handleSubmit() {
    if (!offer) return;
    setLoading(true);
    try {
      const submitted = await submitOffer(offer.id, true);
      setOffer(submitted);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected].slice(0, 8));
    setPreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ].slice(0, 8));
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading request...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  s < step ? "bg-green-500 text-white"
                  : s === step ? "bg-[#b04a15] text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 4 && <div className={`h-0.5 w-8 ${s < step ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-400">
            {["View Request", "Choose How", "Item Details", "Submitted"][step - 1]}
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Step 1: Request overview ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Existing offer banner — shown prominently when an offer is in progress */}
            {existingOffer && (() => {
              const guidance = getOfferGuidance(existingOffer);
              const colorMap = {
                blue:  { card: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",   title: "text-blue-800 dark:text-blue-200", text: "text-blue-700 dark:text-blue-300",   btn: "bg-blue-600 hover:bg-blue-700" },
                amber: { card: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", title: "text-amber-800 dark:text-amber-200", text: "text-amber-700 dark:text-amber-300", btn: "bg-amber-500 hover:bg-amber-600" },
                green: { card: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800", title: "text-green-800 dark:text-green-200", text: "text-green-700 dark:text-green-300",  btn: "bg-green-600 hover:bg-green-700" },
                red:   { card: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",         title: "text-red-800 dark:text-red-200",   text: "text-red-700 dark:text-red-300",    btn: "bg-red-600 hover:bg-red-700" },
              };
              const c = colorMap[guidance.color];
              return (
                <div className={`rounded-2xl border p-5 ${c.card}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {guidance.color === "green" ? "✓" : guidance.color === "amber" ? "⚠" : guidance.color === "red" ? "✕" : "ℹ"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${c.title}`}>{guidance.title}</p>
                      <p className={`text-sm mt-1 leading-relaxed ${c.text}`}>{guidance.explanation}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {guidance.resumeStep && (
                          <button
                            onClick={() => { setOffer(existingOffer); setStep(guidance.resumeStep!); }}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${c.btn}`}
                          >
                            Continue offer →
                          </button>
                        )}
                        {guidance.action && (
                          <Link
                            href={guidance.action.href}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${c.btn}`}
                          >
                            {guidance.action.label} →
                          </Link>
                        )}
                        <Link href="/offers" className="rounded-xl border border-current px-4 py-2 text-sm font-semibold transition-colors opacity-70 hover:opacity-100">
                          View all my offers
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Request detail card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-green-100 dark:bg-green-950 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                  Verified Request
                </span>
                <span className="text-xs text-gray-400">{request.urgency}</span>
              </div>
              <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                {request.title}
              </h1>
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">Category:</span> {request.category}</div>
                <div><span className="font-medium">Location:</span> {request.city}</div>
                <div><span className="font-medium">Quantity needed:</span> {request.quantityRequired}</div>
                <div><span className="font-medium">Still needed:</span> {request.quantityRemaining}</div>
              </div>
              {request.description && (
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{request.description}</p>
              )}
              {qty && (
                <div className="mb-4 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="font-semibold text-gray-700 dark:text-gray-300">{qty.quantityRequired}</div>Required</div>
                    <div><div className="font-semibold text-amber-600">{qty.quantityReserved}</div>Reserved</div>
                    <div><div className="font-semibold text-green-600">{qty.quantityDelivered}</div>Delivered</div>
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-5">
                Donee contact details are kept private until admin approves the match.
              </div>

              {/* Hide the main CTA if offer is already past DRAFT */}
              {existingOffer && existingOffer.status !== "DRAFT" && existingOffer.status !== "NEEDS_INFORMATION" ? (
                <p className="text-center text-sm text-gray-400 py-2">
                  Your offer for this request is already in progress.
                </p>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl bg-[#b04a15] py-3 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
                >
                  {existingOffer ? "Continue My Offer" : "I Can Donate This Item"}
                </button>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={() => router.back()} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Flow type selection ───────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              How would you like to help?
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Choosing the right option helps us process your offer correctly.
            </p>
            <div className="space-y-3">
              {[
                {
                  type: "ALREADY_OWN" as DonorFlowType,
                  title: "I already own this item",
                  desc: "You have the item physically available and ready to give.",
                  badge: "Fastest",
                  badgeColor: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                },
                {
                  type: "WILL_PURCHASE" as DonorFlowType,
                  title: "I will purchase a new item",
                  desc: "You intend to buy the item after the offer is accepted.",
                  badge: null,
                  badgeColor: "",
                },
                {
                  type: "SIMILAR_ITEM" as DonorFlowType,
                  title: "I have a similar item",
                  desc: "Your item may not exactly match the specs — the donee will review it.",
                  badge: null,
                  badgeColor: "",
                },
              ].map(({ type, title, desc, badge, badgeColor }) => (
                <button
                  key={type}
                  onClick={() => handleFlowSelect(type)}
                  disabled={loading}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-left shadow-sm hover:border-[#b04a15] hover:shadow-md transition-all disabled:opacity-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                      <div className="mt-0.5 text-sm text-gray-500">{desc}</div>
                    </div>
                    {badge && (
                      <span className={`ml-3 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </button>
          </div>
        )}

        {/* ── Step 3: Item details form ─────────────────────────────────────── */}
        {step === 3 && offer && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Item Details</h2>
              <p className="text-sm text-gray-500">
                {form.flowType === "ALREADY_OWN" && "Tell us about the item you already have."}
                {form.flowType === "WILL_PURCHASE" && "Describe the item you plan to purchase."}
                {form.flowType === "SIMILAR_ITEM" && "Describe your item — note any differences from the request."}
              </p>
            </div>

            {compat && (
              <CompatibilityIndicator
                indicator={compat.indicator}
                explanation={compat.explanation}
                breakdown={compat}
              />
            )}

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)} placeholder="Optional" />
                <Field label="Model" value={form.model} onChange={(v) => set("model", v)} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Condition *"
                  value={form.condition}
                  onChange={(v) => set("condition", v)}
                  options={["Unused", "Like New", "Good", "Fair", "Needs Minor Repair", "Not Working"]}
                />
                <Field label="Approximate Age" value={form.approximateAge} onChange={(v) => set("approximateAge", v)} placeholder="e.g. 2 years" />
              </div>
              <Field label="Quantity to donate *" value={form.quantity} onChange={(v) => set("quantity", v)} type="number" />
              <Field label="Known Defects (write 'None' if none) *" value={form.knownDefects} onChange={(v) => set("knownDefects", v)} placeholder="e.g. Minor scratch on lid" />
              <Field label="Accessories Included" value={form.accessoriesIncluded} onChange={(v) => set("accessoriesIncluded", v)} placeholder="e.g. Charger, original box" />
              {form.flowType === "SIMILAR_ITEM" && (
                <Field label="How is your item different?" value={form.specNotes} onChange={(v) => set("specNotes", v)} placeholder="e.g. 4 GB RAM instead of 8 GB, same brand" />
              )}
            </div>

            {/* Logistics */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Pickup / Delivery</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City *" value={form.pickupCity} onChange={(v) => set("pickupCity", v)} placeholder="e.g. Mumbai" />
                <Field label="Pincode" value={form.pickupPincode} onChange={(v) => set("pickupPincode", v)} />
              </div>
              <Field label="Locality" value={form.pickupLocality} onChange={(v) => set("pickupLocality", v)} placeholder="e.g. Andheri West" />
              <div className="flex items-center gap-3">
                <input type="checkbox" id="dropoff" checked={form.donorDropOffAvailable}
                  onChange={(e) => set("donorDropOffAvailable", e.target.checked)}
                  className="h-4 w-4 rounded" />
                <label htmlFor="dropoff" className="text-sm text-gray-700 dark:text-gray-300">
                  I can deliver/drop off the item
                </label>
              </div>
              <SelectField
                label="Who pays delivery?"
                value={form.deliveryCostBornBy}
                onChange={(v) => set("deliveryCostBornBy", v)}
                options={["DONOR", "DONEE", "SHARED", "ADMIN_APPROVAL"]}
                displayMap={{ DONOR: "I will pay", DONEE: "Recipient pays", SHARED: "Share cost", ADMIN_APPROVAL: "Platform to decide" }}
              />
            </div>

            {/* Photos */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-800 dark:text-gray-200">Photos (min. 2, max. 8) *</h3>
              <p className="mb-3 text-xs text-gray-500">Upload recent, genuine photos. Include full item view, condition, and any defects.</p>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#b04a15] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => { setFiles((f) => f.filter((_, j) => j !== i)); setPreviews((p) => p.filter((_, j) => j !== i)); }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Declarations */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">Declarations</h3>
              <ul className="mb-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {[
                  "I own this item or am authorised to donate it.",
                  "The photographs are recent and genuine.",
                  "The item details and condition are accurate.",
                  "I have disclosed all known defects.",
                  "I will not request payment for the donated item.",
                  "I understand that the donation is subject to donee and admin approval.",
                  "I agree to follow the CauseKind handover process.",
                ].map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#b04a15]">✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="decl" checked={form.declarationsAccepted}
                  onChange={(e) => set("declarationsAccepted", e.target.checked)}
                  className="h-4 w-4 rounded" />
                <label htmlFor="decl" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  I accept all the above declarations
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            <button
              onClick={handleStep3Submit}
              disabled={loading}
              className="w-full rounded-xl bg-[#b04a15] py-3.5 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Donation Offer"}
            </button>
          </div>
        )}

        {/* ── Step 4: Submitted / AI screening ─────────────────────────────── */}
        {step === 4 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
            {loading ? (
              <>
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#b04a15] border-t-transparent" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Screening in Progress</h2>
                <p className="mt-2 text-sm text-gray-500">We are checking your item details and photos. This usually takes a few minutes.</p>
              </>
            ) : offer?.status === "PENDING_DONEE_REVIEW" || offer?.status === "SOFT_RESERVED_PRIMARY" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950 text-2xl">✓</div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Offer Submitted!</h2>
                <p className="mt-2 text-sm text-gray-500">Your offer looks suitable and has been sent to the recipient for review.</p>
                <button onClick={() => router.push("/offers")} className="mt-6 rounded-xl bg-[#b04a15] px-6 py-2.5 text-sm font-semibold text-white">
                  View My Offers
                </button>
              </>
            ) : offer?.status === "NEEDS_INFORMATION" ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-2xl">!</div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">More Information Needed</h2>
                <p className="mt-2 text-sm text-gray-500">Please provide additional details before your offer can proceed.</p>
                <button onClick={() => setStep(3)} className="mt-6 rounded-xl bg-[#b04a15] px-6 py-2.5 text-sm font-semibold text-white">
                  Update Details
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Offer Submitted</h2>
                <p className="mt-2 text-sm text-gray-500">Status: {offer?.status ?? "Processing..."}</p>
                <button onClick={() => router.push("/offers")} className="mt-6 rounded-xl bg-[#b04a15] px-6 py-2.5 text-sm font-semibold text-white">
                  View My Offers
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Reusable field components ──────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#b04a15]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, displayMap }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; displayMap?: Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#b04a15]"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>{displayMap?.[o] ?? o}</option>
        ))}
      </select>
    </div>
  );
}
