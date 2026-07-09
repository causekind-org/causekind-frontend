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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import Link from "next/link";
import {
  MapPin, Package, Tag, ShieldCheck, Share2, Clock, ArrowLeft,
  ShoppingBag, Shuffle, Loader2, type LucideIcon,
  Camera, ImagePlus, CheckCircle2, Eye,
} from "lucide-react";

const URGENCY_STYLE: Record<string, { label: string; text: string; bg: string }> = {
  CRITICAL: { label: "Urgent",   text: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" },
  HIGH:     { label: "High Priority", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
};

// ── Step 1: flow-type options (no card boxes — plain columns with a 3D tilt) ───

const FLOW_OPTIONS: {
  type: DonorFlowType;
  title: string;
  desc: string;
  badge: string | null;
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
  tags: string[];
}[] = [
  {
    type: "ALREADY_OWN",
    title: "I already own this item",
    desc: "You have the item physically available and ready to give.",
    badge: "Fastest",
    icon: Package,
    iconBg: "bg-green-100 dark:bg-green-950",
    iconText: "text-green-600 dark:text-green-400",
    tags: ["No purchase needed", "Photos required", "Fastest match"],
  },
  {
    type: "WILL_PURCHASE",
    title: "I will purchase a new item",
    desc: "You intend to buy the item after the offer is accepted.",
    badge: null,
    icon: ShoppingBag,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconText: "text-blue-600 dark:text-blue-400",
    tags: ["Buy after approval", "Flexible timing", "Receipt may be asked"],
  },
  {
    type: "SIMILAR_ITEM",
    title: "I have a similar item",
    desc: "Your item may not exactly match the specs — the donee will review it.",
    badge: null,
    icon: Shuffle,
    iconBg: "bg-purple-100 dark:bg-purple-950",
    iconText: "text-purple-600 dark:text-purple-400",
    tags: ["Alt spec allowed", "Donee reviews fit", "May need clarification"],
  },
];

function daysAgo(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "Listed today";
  if (days === 1) return "Listed 1 day ago";
  return `Listed ${days} days ago`;
}

function shareRequest(title: string, requestId: number) {
  const url = `${window.location.origin}/requests/${requestId}/offer`;
  const text = `Check this request on CauseKind: ${title}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp to share");
  }
}

// ── Existing offer status → guidance ──────────────────────────────────────────

type OfferGuidance = {
  title: string;
  explanation: string;
  action?: { label: string; href: string };
  resumeStep?: 2;
  color: "blue" | "amber" | "green" | "red";
};

function getOfferGuidance(offer: DonationOffer): OfferGuidance {
  const s = offer.status as OfferStatus;
  switch (s) {
    case "DRAFT":
    case "NEEDS_INFORMATION":
      return { title: "Continue your offer", explanation: s === "NEEDS_INFORMATION" ? "More information is required before your offer can proceed. Please update your item details." : "Your draft is saved. Pick up where you left off.", resumeStep: 2, color: "amber" };
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

// ── 3D mouse-tilt card (used for the flow-type choices) ────────────────────────

function Tilt3DCard({
  onClick, disabled, className, style, children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -14, ry: px * 14, active: true });
  }
  function handleLeave() {
    setTilt({ rx: 0, ry: 0, active: false });
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...style,
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${tilt.active ? 1.04 : 1}, ${tilt.active ? 1.04 : 1}, 1)`,
        transformStyle: "preserve-3d",
        transitionProperty: "transform, box-shadow",
        transitionDuration: tilt.active ? "100ms" : "400ms",
        transitionTimingFunction: "ease-out",
      }}
      className={className}
    >
      {children}
    </button>
  );
}

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface FormState {
  flowType: DonorFlowType | null;
  approximateAge: string;
  condition: string;
  workingStatus: string;
  hasKnownDefects: boolean;
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
  approximateAge: "", condition: "", workingStatus: "",
  hasKnownDefects: false, knownDefects: "", accessoriesIncluded: "", quantity: "1", specNotes: "",
  pickupCity: "", pickupPincode: "", pickupLocality: "",
  maxTravelDistanceKm: "", deliveryCostBornBy: "DONOR",
  donorDropOffAvailable: false, declarationsAccepted: false,
};

type Action =
  | { type: "SET"; key: keyof FormState; value: string | boolean | DonorFlowType }
  | { type: "HYDRATE"; values: Partial<FormState> };
function reducer(state: FormState, action: Action): FormState {
  if (action.type === "HYDRATE") return { ...state, ...action.values };
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [requestLoadFailed, setRequestLoadFailed] = useState(false);
  const compatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load request data and check for an existing offer
  useEffect(() => {
    if (!requestId) return;
    getAnonymizedRequest(requestId).then(setRequest).catch(() => setRequestLoadFailed(true));
    getQuantityAllocation(requestId).then(setQty).catch(() => {});
    // Check if the donor already has an offer for this request
    getMyDonationOffers()
      .then((offers) => {
        const found = offers.find((o) => o.requestId === requestId &&
          !["WITHDRAWN", "CANCELLED", "ADMIN_REJECTED", "DONEE_DECLINED"].includes(o.status));
        if (!found) return;
        setExistingOffer(found);
        // Draft/needs-info offers are unfinished — resume straight into Step 2,
        // pre-filled, instead of re-showing the flow-type picker they already answered.
        if (found.status === "DRAFT" || found.status === "NEEDS_INFORMATION") {
          setOffer(found);
          hydrateForm(found);
          setStep(2);
        }
      })
      .catch(() => {});
  }, [requestId]);

  // Debounced compatibility check
  useEffect(() => {
    if (!offer || step !== 2) return;
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

  // Refill the form from a previously-saved draft/needs-info offer so resuming
  // doesn't force the donor to re-enter details they already submitted.
  function hydrateForm(o: DonationOffer) {
    const d = o.itemDetails;
    const hasDefects = !!d?.knownDefects && d.knownDefects !== "None";
    dispatch({
      type: "HYDRATE",
      values: {
        flowType: o.flowType,
        approximateAge: d?.approximateAge ?? "",
        condition: d?.condition ?? "",
        workingStatus: d?.workingStatus ?? "",
        hasKnownDefects: hasDefects,
        knownDefects: hasDefects ? d!.knownDefects! : "",
        accessoriesIncluded: d?.accessoriesIncluded ?? "",
        quantity: d?.quantity ? String(d.quantity) : "1",
        specNotes: d?.specNotes ?? "",
        pickupCity: d?.pickupCity ?? "",
        pickupPincode: d?.pickupPincode ?? "",
        pickupLocality: d?.pickupLocality ?? "",
        maxTravelDistanceKm: d?.maxTravelDistanceKm != null ? String(d.maxTravelDistanceKm) : "",
        deliveryCostBornBy: d?.deliveryCostBornBy ?? "DONOR",
        donorDropOffAvailable: d?.donorDropOffAvailable ?? false,
      },
    });
  }

  // ── Step 1: Select flow type + create/resume draft ────────────────────────
  async function handleFlowSelect(flowType: DonorFlowType) {
    set("flowType", flowType);
    setLoading(true);
    setError(null);
    try {
      const returned = await createOfferDraft(requestId, flowType);
      setOffer(returned);
      // If this resumes an in-progress draft rather than starting a fresh one,
      // refill the form so the donor doesn't have to re-enter everything.
      if (returned.itemDetails) hydrateForm(returned);
      // If backend returned an existing active offer (not a fresh draft), handle it
      if (returned.status !== "DRAFT" && returned.status !== "NEEDS_INFORMATION") {
        setExistingOffer(returned);
        return; // Stay on Step 1 — the existing offer banner will appear
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create offer draft");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Save item details ──────────────────────────────────────────────
  async function saveDetails() {
    if (!offer) return;
    setLoading(true);
    setError(null);
    try {
      await updateOfferItemDetails(offer.id, {
        approximateAge: form.approximateAge || undefined,
        condition: form.condition || undefined,
        workingStatus: form.workingStatus || undefined,
        knownDefects: form.hasKnownDefects ? (form.knownDefects || undefined) : "None",
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

  async function handleItemDetailsSubmit() {
    if (!form.condition) { setError("Please select item condition"); return; }
    if (!form.pickupCity) { setError("Pickup city is required"); return; }
    const existingPhotoCount = offer?.media?.length ?? 0;
    if (files.length + existingPhotoCount < 2) { setError("Please upload at least 2 photos"); return; }
    if (!form.declarationsAccepted) { setError("Please accept all declarations"); return; }
    setError(null);
    try {
      await saveDetails();
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location detection");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          const address = data.address ?? {};
          const city = address.city || address.town || address.village || address.suburb || "";
          const locality = address.suburb || address.neighbourhood || address.road || "";
          const pincode = address.postcode || "";
          if (city) set("pickupCity", city);
          if (locality) set("pickupLocality", locality);
          if (pincode) set("pickupPincode", pincode);
          toast.success("Location filled in");
        } catch {
          toast.error("Couldn't detect address details — please enter manually");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        toast.error("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (requestLoadFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">This request couldn't be loaded — it may have been withdrawn or is no longer accepting offers.</p>
        <button
          onClick={() => router.push("/requests")}
          className="rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
        >
          Back to Requests
        </button>
      </div>
    );
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
      <div className={`mx-auto px-4 pt-8 ${step === 1 ? "max-w-5xl" : step === 2 ? "max-w-4xl" : "max-w-2xl"}`}>
        {/* Progress */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    s < step ? "bg-green-500 text-white"
                    : s === step ? "bg-[#1e3a60] text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                {s < 3 && <div className={`h-0.5 w-8 ${s < step ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {["View & Choose", "Item Details", "Submitted"][step - 1]}
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Step 1: Request overview + choose how to help (merged, no card boxes) ── */}
        {step === 1 && (
          <div>
            {/* Existing offer banner — left-accent alert, not a boxed card */}
            {existingOffer && (() => {
              const guidance = getOfferGuidance(existingOffer);
              const colorMap = {
                blue:  { accent: "border-blue-400 dark:border-blue-600",   title: "text-blue-800 dark:text-blue-200",   text: "text-blue-700 dark:text-blue-300",   btn: "bg-blue-600 hover:bg-blue-700" },
                amber: { accent: "border-amber-400 dark:border-amber-600", title: "text-amber-800 dark:text-amber-200", text: "text-amber-700 dark:text-amber-300", btn: "bg-amber-500 hover:bg-amber-600" },
                green: { accent: "border-green-400 dark:border-green-600", title: "text-green-800 dark:text-green-200", text: "text-green-700 dark:text-green-300", btn: "bg-green-600 hover:bg-green-700" },
                red:   { accent: "border-red-400 dark:border-red-600",     title: "text-red-800 dark:text-red-200",     text: "text-red-700 dark:text-red-300",     btn: "bg-red-600 hover:bg-red-700" },
              };
              const c = colorMap[guidance.color];
              return (
                <div className={`mb-6 border-l-4 py-1 pl-4 ${c.accent}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-xl leading-none">
                      {guidance.color === "green" ? "✓" : guidance.color === "amber" ? "⚠" : guidance.color === "red" ? "✕" : "ℹ"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${c.title}`}>{guidance.title}</p>
                      <p className={`text-sm mt-1 leading-relaxed ${c.text}`}>{guidance.explanation}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {guidance.resumeStep && (
                          <button
                            onClick={() => { setOffer(existingOffer); hydrateForm(existingOffer); setStep(guidance.resumeStep!); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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

            {/* Breadcrumb */}
            <div className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <Link href="/requests" className="hover:text-[#b04a15] dark:hover:text-[#e07b3a]">Requests</Link>
              <span>/</span>
              <Link href={`/requests?category=${encodeURIComponent(request.category)}`} className="hover:text-[#b04a15] dark:hover:text-[#e07b3a]">
                {request.category}
              </Link>
              <span>/</span>
              <span className="text-gray-500 dark:text-gray-400">Request #{request.id}</span>
            </div>

            {/* Request identity — plain header, divider instead of a box */}
            <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-800">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                  <ShieldCheck className="h-3 w-3" /> Verified Request
                </span>
                {URGENCY_STYLE[request.urgency] && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${URGENCY_STYLE[request.urgency].bg} ${URGENCY_STYLE[request.urgency].text}`}>
                    {URGENCY_STYLE[request.urgency].label}
                  </span>
                )}
              </div>
              <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {request.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {request.category}</span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {request.city}</span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> {request.quantity} unit{request.quantity === 1 ? "" : "s"} needed</span>
              </div>
            </header>

            {/* How would you like to help — centered heading, 3 white cards side by side */}
            {existingOffer && existingOffer.status !== "DRAFT" && existingOffer.status !== "NEEDS_INFORMATION" ? (
              <p className="mb-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Your offer for this request is already in progress — see the status above.
              </p>
            ) : (
              <section className="mb-10">
                <div className="mb-8 text-center">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    Step 1 of 3
                  </p>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    How would you like to help?
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
                    Choosing the right option helps us process your offer correctly — each path has a slightly different next step.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {FLOW_OPTIONS.map(({ type, title, desc, badge, icon: Icon, iconBg, iconText, tags }, i) => {
                    const isSelecting = loading && form.flowType === type;
                    return (
                      <Tilt3DCard
                        key={type}
                        onClick={() => handleFlowSelect(type)}
                        disabled={loading}
                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
                        className="group relative flex animate-in fade-in slide-in-from-bottom-2 flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                      >
                        {badge && (
                          <span style={{ transform: "translateZ(30px)" }} className="absolute right-5 top-5 text-[11px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
                            {badge}
                          </span>
                        )}
                        <div style={{ transform: "translateZ(36px)" }} className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
                          {isSelecting ? (
                            <Loader2 className={`h-6 w-6 animate-spin ${iconText}`} />
                          ) : (
                            <Icon className={`h-6 w-6 ${iconText}`} />
                          )}
                        </div>
                        <div style={{ transform: "translateZ(20px)" }} className="font-semibold text-gray-900 dark:text-gray-100">
                          {title}
                        </div>
                        <div style={{ transform: "translateZ(12px)" }} className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                          {desc}
                        </div>
                        <div className="mt-3 max-w-[15rem] text-[10px] font-medium leading-relaxed text-gray-400 dark:text-gray-500">
                          {tags.join(" · ")}
                        </div>
                      </Tilt3DCard>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Request description — quoted, in the donee's own words */}
            {request.description && (
              <section className="mb-8">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Request Description</p>
                <div className="rounded-xl border-l-4 border-indigo-300 bg-indigo-50 px-5 py-4 dark:border-indigo-600 dark:bg-indigo-950/30">
                  <p className="text-sm italic leading-relaxed text-gray-700 dark:text-gray-300">&ldquo;{request.description}&rdquo;</p>
                </div>
              </section>
            )}

            {/* Verified & Audited — card with stat blocks + review checklist */}
            {qty && (
              <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-sm">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Verified &amp; Audited</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      Our team manually verifies every request with supporting documentation before it goes live.
                    </p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{qty.quantityDelivered} / {qty.quantityRequired}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Provided</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{qty.quantityReserved}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Reserved</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">Reviewed and approved by the CauseKind admin team before publishing.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">Recipient identity confirmed during onboarding.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Meta + share — inline, no boxed nuggets */}
            <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {daysAgo(request.createdAt)}</span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> {request.quantityRemaining} still needed</span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <button
                onClick={() => shareRequest(request.title, request.id)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#b04a15] transition-colors hover:text-[#c45520] dark:text-[#e07b3a]"
              >
                <Share2 className="h-3.5 w-3.5" /> Share this Request
              </button>
            </div>

            {/* Privacy note — plain text, no box */}
            <p className="mb-6 flex items-start gap-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Donee contact details are kept private until admin approves the match — pickup is arranged directly once your offer is accepted.
            </p>

            <button
              onClick={() => router.back()}
              className="group inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              Back
            </button>
          </div>
        )}

        {/* ── Step 2: Item details form ─────────────────────────────────────── */}
        {step === 2 && offer && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Item Details</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Condition *"
                  value={form.condition}
                  onChange={(v) => set("condition", v)}
                  options={["Unused", "Like New", "Good", "Fair", "Needs Minor Repair", "Not Working"]}
                  wobble
                />
                <Field label="Approximate Age" value={form.approximateAge} onChange={(v) => set("approximateAge", v)} placeholder="e.g. 2 years" />
              </div>
              <Field label="Quantity to donate *" value={form.quantity} onChange={(v) => set("quantity", v)} type="number" />

              <div>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.hasKnownDefects}
                    onChange={(e) => set("hasKnownDefects", e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">This item has known defects</span>
                </label>
                {form.hasKnownDefects && (
                  <div className="mt-3">
                    <Field label="Known Defects" value={form.knownDefects} onChange={(v) => set("knownDefects", v)} placeholder="e.g. Minor scratch on lid" />
                  </div>
                )}
              </div>

              <Field label="Accessories Included" value={form.accessoriesIncluded} onChange={(v) => set("accessoriesIncluded", v)} placeholder="e.g. Charger, original box" />
              {form.flowType === "SIMILAR_ITEM" && (
                <Field label="How is your item different?" value={form.specNotes} onChange={(v) => set("specNotes", v)} placeholder="e.g. 4 GB RAM instead of 8 GB, same brand" />
              )}
            </div>

            {/* Logistics */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Pickup / Delivery</h3>
                </div>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:opacity-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/40"
                >
                  {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                  Use my location
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City *" value={form.pickupCity} onChange={(v) => set("pickupCity", v)} placeholder="e.g. Mumbai" />
                <Field label="Pincode" value={form.pickupPincode} onChange={(v) => set("pickupPincode", v)} />
              </div>
              <Field label="Locality" value={form.pickupLocality} onChange={(v) => set("pickupLocality", v)} placeholder="e.g. Andheri West" />
              <label
                htmlFor="dropoff"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20"
              >
                <input type="checkbox" id="dropoff" checked={form.donorDropOffAvailable}
                  onChange={(e) => set("donorDropOffAvailable", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">I can deliver/drop off the item</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Check this if you are willing to transport the item to the charity or recipient&apos;s address.</p>
                </div>
              </label>
              {!form.donorDropOffAvailable && (
                <SelectField
                  label="Who pays delivery?"
                  value={form.deliveryCostBornBy}
                  onChange={(v) => set("deliveryCostBornBy", v)}
                  options={["DONOR", "DONEE", "SHARED"]}
                  displayMap={{ DONOR: "I will pay", DONEE: "Recipient pays", SHARED: "Share cost" }}
                />
              )}
            </div>

            {/* Photos */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                  <Camera className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Photos (min. 2, max. 8) *</h3>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Upload recent, genuine photos. Include full item view, condition, and any defects.</p>
              {offer?.media && offer.media.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Already uploaded</p>
                  <div className="grid grid-cols-4 gap-2">
                    {offer.media.map((m) => (
                      <div key={m.id} className="relative aspect-square overflow-hidden rounded-lg">
                        <img src={m.mediaUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <label
                  htmlFor="photo-upload"
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#1e3a60] hover:text-[#1e3a60] dark:border-gray-700 dark:text-gray-500"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Add Photo</span>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
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
            </div>

            {/* Declarations */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Declarations</h3>
              </div>
              <ul className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
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
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <input type="checkbox" id="decl" checked={form.declarationsAccepted}
                  onChange={(e) => set("declarationsAccepted", e.target.checked)}
                  className="h-4 w-4 rounded" />
                <label htmlFor="decl" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  I accept all the above declarations
                </label>
              </div>
            </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="group inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                Back to Step 1
              </button>
              <button
                onClick={handleItemDetailsSubmit}
                disabled={loading}
                className="rounded-xl bg-[#1e3a60] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#254876] disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Donation Offer"}
              </button>
            </div>

            {/* Info tiles */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-indigo-50/70 p-4 dark:bg-indigo-950/20">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Quality Assurance</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Your detailed info helps our team assess condition and ensure quality standards are met.</p>
              </div>
              <div className="rounded-xl bg-indigo-50/70 p-4 dark:bg-indigo-950/20">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                  <Eye className="h-4.5 w-4.5" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Transparency</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Recipients can review condition details before accepting any donation.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Submitted / AI screening ──────────────────────────────── */}
        {step === 3 && (
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
                <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-6 rounded-xl bg-[#b04a15] px-6 py-2.5 text-sm font-semibold text-white">
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
        className="w-full rounded-xl border border-indigo-100 dark:border-gray-700 bg-indigo-50/60 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#1e3a60]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, displayMap, wobble }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; displayMap?: Record<string, string>; wobble?: boolean;
}) {
  const [wobbling, setWobbling] = useState(false);

  function triggerWobble() {
    if (!wobble) return;
    setWobbling(false);
    requestAnimationFrame(() => setWobbling(true));
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <Select
        value={value}
        onValueChange={(v) => { onChange(v); triggerWobble(); }}
        onOpenChange={(open) => { if (open) triggerWobble(); }}
      >
        <SelectTrigger
          onAnimationEnd={() => setWobbling(false)}
          className={`w-full h-auto rounded-xl border border-indigo-100 dark:border-gray-700 bg-indigo-50/60 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus-visible:border-[#1e3a60] focus-visible:ring-0 ${wobbling ? "animate-select-wobble" : ""}`}
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-indigo-100 dark:border-gray-700">
          {options.map((o) => (
            <SelectItem key={o} value={o}>{displayMap?.[o] ?? o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
