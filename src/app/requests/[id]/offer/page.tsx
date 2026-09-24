"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { OfferResult } from "@/features/donation-offer-wizard/OfferResult";
import {
  getAnonymizedRequest,
  doneePhotoSrc,
  getQuantityAllocation,
  getMyDonationOffers,
  getOfferAvailability,
  createOfferDraft,
  type AnonymizedRequest,
  type QuantityAllocation,
  type DonationOffer,
  type OfferStatus,
  type DonorFlowType,
  type ApiConflictError,
} from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { toast } from "@/lib/toast";
import { DonationOfferWizard } from "@/features/donation-offer-wizard/DonationOfferWizard";
import Link from "next/link";
import {
  MapPin, Package, Tag, ShieldCheck, Share2, Clock, ArrowLeft,
  ShoppingBag, Shuffle, Loader2, Sparkles, type LucideIcon,
  Camera, ImagePlus, CheckCircle2, Eye, Info, ShieldAlert,
  Users, Home, UserRound, Wallet, BadgeCheck, Siren,
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
  comingSoon?: boolean;
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
    // "Receipt may be asked" was true while this was a plan. It is not now:
    // a photo of the item and a receipt are both required before handover.
    tags: ["Buy after approval", "Choose your timeline", "Photo + receipt required"],
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
    comingSoon: true,
  },
];

// ── About this need — anonymized household context shown to donors ───────────
// Structured, non-identifying facts only; the backend never sends contacts,
// addresses, income figures, or the free-text story to this view.

const HOUSING_LABEL: Record<string, string> = {
  OWNED: "Own home",
  RENTED: "Rented home",
  SHELTER: "Living in a shelter",
  TEMPORARY: "Temporary housing",
};

const TIER_LABEL: Record<string, string> = {
  TIER_1_BASIC: "Tier 1 verified",
  TIER_2_MODERATE: "Tier 2 verified",
  TIER_3_HIGH_VALUE: "Tier 3 verified · high value",
  TIER_4_EMERGENCY: "Tier 4 verified · emergency",
};

function AboutThisNeed({ request }: { request: AnonymizedRequest }) {
  // If the image 404s (consent withdrawn between page load and image fetch, or
  // the object went missing) fall back to the no-portrait layout rather than
  // showing a broken frame. Never surfaces WHY — that's the donee's business.
  const [portraitFailed, setPortraitFailed] = useState(false);
  const showPortrait = request.doneePhotoAvailable && !!request.doneePhotoUrl && !portraitFailed;

  const facts: { icon: LucideIcon; label: string; value: string }[] = [];
  if (request.householdSize != null)
    facts.push({ icon: Home, label: "Household", value: `${request.householdSize} member${request.householdSize === 1 ? "" : "s"}` });
  if (request.dependents != null)
    facts.push({ icon: UserRound, label: "Dependents", value: String(request.dependents) });
  if (request.peopleAffected != null)
    facts.push({ icon: Users, label: "People affected", value: String(request.peopleAffected) });
  if (request.housingType && HOUSING_LABEL[request.housingType])
    facts.push({ icon: Home, label: "Housing", value: HOUSING_LABEL[request.housingType] });
  if (request.numberOfEarners != null)
    facts.push({
      icon: Wallet,
      label: "Earning members",
      value: request.numberOfEarners === 0 ? "None" : request.numberOfEarners === 1 ? "Single earner" : String(request.numberOfEarners),
    });

  const hasBadges = !!request.verificationTier || request.emergency;
  if (!showPortrait && !request.imageUrl && facts.length === 0 && !request.reasonCannotBuy && !hasBadges) return null;

  return (
    <section className="mb-8">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-gray-400">About This Need</p>
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row">
          {showPortrait ? (
            /* Portrait takes ~30% on desktop and sits above the facts on mobile.
               Not wrapped in its own card — it shares this container's surface,
               so the section stays one object rather than a card inside a card. */
            <div className="donee-portrait flex-shrink-0 p-3.5 sm:p-5 sm:w-[30%] sm:max-w-[260px] sm:pr-0">
              <div className="donee-portrait__frame relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-800">
                {/* Fixed 4:5 box reserves the space before the image loads, so a
                    slow photo can't shift the facts beside it. */}
                <div className="aspect-[4/5] w-full">
                  <img
                    src={doneePhotoSrc(request.doneePhotoUrl!)}
                    alt="Photo of the person who posted this need"
                    loading="lazy"
                    onError={() => setPortraitFailed(true)}
                    className="donee-portrait__img h-full w-full object-cover object-[center_28%]"
                  />
                </div>
              </div>
              <span className="donee-portrait__badge mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Photo checked
              </span>
            </div>
          ) : request.imageUrl ? (
            <div className="relative flex-shrink-0 h-48 w-full sm:w-56 sm:h-full overflow-hidden">
              <Image src={request.imageUrl} alt={request.title} fill className="object-cover" />
            </div>
          ) : null}
          <div className="flex-1 p-3.5 sm:p-5">
            {hasBadges && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {request.verificationTier && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {TIER_LABEL[request.verificationTier] ?? "Verified"}
                  </span>
                )}
                {request.emergency && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-2xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                    <Siren className="h-3.5 w-3.5" />
                    Emergency need
                  </span>
                )}
              </div>
            )}
            {facts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {facts.map(({ icon: FactIcon, label, value }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <FactIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-3xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Household details for this request are kept private.
              </p>
            )}
          </div>
        </div>
        {request.reasonCannotBuy && (
          <div className="border-t border-gray-100 bg-amber-50/60 px-3.5 sm:px-5 py-4 dark:border-gray-800 dark:bg-amber-950/20">
            <p className="mb-1.5 text-3xs font-bold uppercase tracking-wide text-amber-700/70 dark:text-amber-400/70">
              Why they can&rsquo;t purchase this themselves
            </p>
            <p className="text-sm italic leading-relaxed text-gray-700 dark:text-gray-300">
              &ldquo;{request.reasonCannotBuy}&rdquo;
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

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
      // Explicit: a <button> with no type defaults to "submit", which would
      // post any ancestor form the day one is introduced.
      type="button"
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
  const { user, isLoading: authLoading } = useAuth();
  const requestId = Number(params.id);

  // Direct navigation here as a guest (a shared link, a bookmark, the public
  // board) has to end at login and come back — not at a wizard quietly failing
  // on 401s, which is what `useAuth()` with its result discarded used to give.
  // A donee is bounced too: this is the donor offer flow, and the whole page
  // assumes the viewer is not the person who posted the need.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(loginUrlFor(`/requests/${params.id}/offer`));
    } else if (user.role === "DONEE") {
      router.replace("/requests");
    }
  }, [authLoading, user, router, params.id]);

  const [step, setStep] = useState<Step>(1);
  const [form, dispatch] = useReducer(reducer, INITIAL);
  const [request, setRequest] = useState<AnonymizedRequest | null>(null);
  const [qty, setQty] = useState<QuantityAllocation | null>(null);
  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [existingOffer, setExistingOffer] = useState<DonationOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestLoadFailed, setRequestLoadFailed] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [nudged, setNudged] = useState<DonorFlowType | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  /** Whether the "resume straight into step 2" courtesy has already been spent. */
  const resumedOnceRef = useRef(false);

  // Load request data and check for an existing offer
  useEffect(() => {
    if (!requestId) return;
    // Don't fire five authenticated calls for someone who is about to be
    // redirected — a guest would just collect 401s, and a donee 403s.
    if (authLoading || !user || user.role === "DONEE") return;
    getAnonymizedRequest(requestId).then(setRequest).catch(() => setRequestLoadFailed(true));
    getQuantityAllocation(requestId).then(setQty).catch(() => {});
    // Check if the donor already has an offer for this request
    getMyDonationOffers()
      .then((offers) => {
        const found = offers.find((o) => o.requestId === requestId &&
          !["WITHDRAWN", "CANCELLED", "ADMIN_REJECTED", "DONEE_DECLINED"].includes(o.status));
        if (!found) {
          // No offer of our own yet — check whether another donor already has one
          // actively in progress on this request before letting the donor start.
          getOfferAvailability(requestId).then((a) => { if (a.blocked) setBlockedByOther(true); }).catch(() => {});
          return;
        }
        setExistingOffer(found);
        // Draft/needs-info offers are unfinished — resume straight into Step 2,
        // pre-filled, instead of re-showing the flow-type picker they already answered.
        if (found.status === "DRAFT" || found.status === "NEEDS_INFORMATION") {
          setOffer(found);
          hydrateForm(found);
          // ONE-SHOT. Resuming into step 2 is a courtesy on arrival, not a rule
          // to re-apply forever: without this guard, pressing Back in the wizard
          // set step 1 and then the next run of this effect threw the donor
          // straight back in, which read as "the Back button does nothing".
          if (!resumedOnceRef.current) {
            resumedOnceRef.current = true;
            setStep(2);
          }
        }
      })
      .catch(() => {});
    // `user?.id`, not `user`. The object identity changes when the background
    // /users/me check resolves and replaces it, which re-ran this whole effect —
    // re-fetching, and (before the guard above) re-navigating.
  }, [requestId, authLoading, user?.id, user?.role]);

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

  // Locked flow types: wiggle the card and explain instead of creating a draft
  function handleComingSoon(flowType: DonorFlowType) {
    setNudged(flowType);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudged(null), 650);
    toast.info("This option is coming soon — for now, offer an item you already own.");
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
      if ((e as ApiConflictError)?.code === "OFFER_BLOCKED_ACTIVE_ELSEWHERE") {
        setBlockedByOther(true);
      } else {
        setError(e instanceof Error ? e.message : "Failed to create offer draft");
      }
    } finally {
      setLoading(false);
    }
  }


  if (requestLoadFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 sm:gap-4 px-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">This request couldn't be loaded — it may have been withdrawn or is no longer accepting offers.</p>
        <button
          onClick={() => router.push("/requests")}
          className="rounded-xl bg-[#b04a15] px-3.5 sm:px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
        >
          Back to Requests
        </button>
      </div>
    );
  }

  // Render nothing while the redirect above is in flight. Without this a guest
  // sees a frame of the donor wizard — and the data effects fire, producing 401s
  // for a page they were never allowed to open.
  if (authLoading || !user || user.role === "DONEE") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="sr-only">Redirecting…</p>
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

  // The request/flow picker creates the server draft. Once it exists, the
  // editable item form owns the viewport so its desktop rail, stacked card and
  // mobile sticky controls are not constrained by the legacy page wrapper.
  if (step === 2 && offer) {
    // `overflow-x-clip`, deliberately NOT `overflow-x-hidden`: `hidden` would
    // make this a scroll container, and this wizard's three `position: sticky`
    // elements would then stick to it instead of the viewport.
    //
    // Kept as a cheap guard, not as the fix. The horizontal scrollbar this was
    // added for came from the Back button's `after:absolute` escaping to
    // ClickSpark's page-sized wrapper (see WizardNavigation) — an ancestor of
    // this <main>, so this class never clipped it and never could.
    return (
      <main
        data-donation-offer-wizard
        className="min-h-screen overflow-x-clip bg-[#faf8f5] dark:bg-zinc-950"
      >
        <DonationOfferWizard
          offerId={offer.id}
          offer={offer}
          requestTitle={request.title}
          requestedQuantity={request.quantity}
          adminNote={offer.status === "NEEDS_INFORMATION" ? offer.displayRejectionReason : null}
          onExit={() => {
            setExistingOffer(offer);
            setStep(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onSaveExit={() => router.push("/offers")}
          onSubmitted={(submitted) => {
            setOffer(submitted);
            setExistingOffer(submitted);
            setStep(3);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <AlertDialog open={blockedByOther} onOpenChange={setBlockedByOther}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Matching already in progress</AlertDialogTitle>
            <AlertDialogDescription>
              Another donor&apos;s offer is already being processed for this request, so you can&apos;t
              offer right now. If that donation doesn&apos;t go through, we&apos;ll notify you so you
              can come back and donate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/requests")}>
              Back to Requests
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={`mx-auto px-4 pt-5 sm:pt-8 ${step === 1 ? "max-w-5xl" : step === 2 ? "max-w-4xl" : "max-w-2xl"}`}>
        {/* Prelude/result navigation. The editor owns its five-step progress. */}
        <div className="relative mb-6 h-10">
          <button
            onClick={() => {
              // Step 3 is post-submission — "back" can't reopen the form, so it
              // leaves the wizard instead of stepping to 2.
              if (step === 2) { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
              else if (step === 3) { router.push("/requests"); }
              else { router.back(); }
            }}
            className="group absolute left-0 top-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="hidden sm:inline">{step === 1 ? "Back" : step === 2 ? "Back to Step 1" : "Back to Requests"}</span>
            <span className="sm:hidden">Back</span>
          </button>
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
                    <div className="text-base sm:text-xl leading-none">
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
            <div className="mb-4 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-gray-400">
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
              <h1 className="mb-3 text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
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
                  <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-gray-400">
                    Donation offer
                  </p>
                  <h2 className="mb-2 text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    How would you like to help?
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
                    Choosing the right option helps us process your offer correctly — each path has a slightly different next step.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
                  {FLOW_OPTIONS.map(({ type, title, desc, badge, icon: Icon, iconBg, iconText, tags, comingSoon }, i) => {
                    const isSelecting = loading && form.flowType === type;

                    if (comingSoon) {
                      return (
                        <Tilt3DCard
                          key={type}
                          onClick={() => handleComingSoon(type)}
                          style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
                          className={`cs-flow-card group relative flex animate-in fade-in slide-in-from-bottom-2 flex-col items-center overflow-hidden rounded-xl sm:rounded-2xl border border-dashed border-gray-300 bg-white p-4 sm:p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-gray-600 dark:bg-gray-900 ${nudged === type ? "cs-card-nudge" : ""}`}
                        >
                          <span aria-hidden className="cs-card-sheen" />
                          <span style={{ transform: "translateZ(30px)" }} className="absolute right-4 top-4 inline-flex items-center gap-1">
                            <Sparkles className="cs-badge-spark h-3 w-3 text-amber-500" />
                            <span className="cs-badge-shimmer text-3xs font-bold uppercase tracking-widest">Coming soon</span>
                          </span>
                          <div style={{ transform: "translateZ(36px)" }} className={`cs-icon-drift mb-4 flex h-11 sm:h-14 w-11 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl ${iconBg} opacity-70 saturate-50 transition-all duration-300 group-hover:opacity-100 group-hover:saturate-100`}>
                            <Icon className={`h-6 w-6 ${iconText}`} />
                          </div>
                          <div style={{ transform: "translateZ(20px)" }} className="font-semibold text-gray-500 transition-colors duration-300 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">
                            {title}
                          </div>
                          <div style={{ transform: "translateZ(12px)" }} className="mt-1.5 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                            {desc}
                          </div>
                          <div className="mt-3 max-w-[15rem] text-3xs font-medium leading-relaxed text-gray-300 dark:text-gray-600">
                            {tags.join(" · ")}
                          </div>
                          <div style={{ transform: "translateZ(16px)" }} className="mt-3 inline-flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            In the works
                            <span className="cs-dot" />
                            <span className="cs-dot" style={{ animationDelay: "0.2s" }} />
                            <span className="cs-dot" style={{ animationDelay: "0.4s" }} />
                          </div>
                        </Tilt3DCard>
                      );
                    }

                    return (
                      <Tilt3DCard
                        key={type}
                        onClick={() => handleFlowSelect(type)}
                        disabled={loading || blockedByOther}
                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
                        className="group relative flex animate-in fade-in slide-in-from-bottom-2 flex-col items-center rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                      >
                        {badge && (
                          <span style={{ transform: "translateZ(30px)" }} className="absolute right-5 top-5 text-2xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
                            {badge}
                          </span>
                        )}
                        <div style={{ transform: "translateZ(36px)" }} className={`mb-4 flex h-11 sm:h-14 w-11 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
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
                        <div className="mt-3 max-w-[15rem] text-3xs font-medium leading-relaxed text-gray-400 dark:text-gray-500">
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
                <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-gray-400">Request Description</p>
                <div className="rounded-xl border-l-4 border-indigo-300 bg-indigo-50 px-3.5 sm:px-5 py-4 dark:border-indigo-600 dark:bg-indigo-950/30">
                  <p className="text-sm italic leading-relaxed text-gray-700 dark:text-gray-300">&ldquo;{request.description}&rdquo;</p>
                </div>
              </section>
            )}

            {/* About this need — anonymized household facts, photo, why they can't buy */}
            <AboutThisNeed request={request} />

            {/* Verified & Audited — card with stat blocks + review checklist */}
            {qty && (
              <section className="mb-8 rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
                  <div className="max-w-sm">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Verified &amp; Audited</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      Our team manually verifies every request with supporting documentation before it goes live.
                    </p>
                  </div>
                  <div className="flex gap-5 sm:gap-8 text-right">
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{qty.quantityDelivered} / {qty.quantityRequired}</p>
                      <p className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Provided</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{qty.quantityReserved}</p>
                      <p className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Reserved</p>
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

        {/* ── Result phase: submitted / screening / outcome ─────────────── */}
        {step === 3 && (
          <OfferResult
            offer={offer}
            requestTitle={request?.title ?? null}
            onViewOffers={() => router.push("/offers")}
            onEdit={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onBrowseRequests={() => router.push("/requests")}
          />
        )}
      </div>
    </main>
  );
}

