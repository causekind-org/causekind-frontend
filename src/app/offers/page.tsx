"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyDonationOffers, reconfirmOfferAvailability, withdrawOffer, type DonationOffer } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  AI_ELIGIBILITY_SCREENING: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  AI_COMPATIBILITY_SCREENING: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  PENDING_DONEE_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  DONEE_ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  DONOR_RECONFIRMATION_REQUIRED: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  PENDING_ADMIN_APPROVAL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  ADMIN_APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  HANDOVER_IN_PROGRESS: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  HANDOVER_AT_RISK: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  ISSUE_WINDOW_OPEN: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  WITHDRAWN: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  ADMIN_REJECTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  DONEE_DECLINED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  NEEDS_INFORMATION: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
};

// Offer wizard is incomplete — donor can jump back in and finish it
const CONTINUABLE_STATUSES = new Set(["DRAFT", "NEEDS_INFORMATION"]);

// Anything the backend will still let the donor withdraw themselves
// (mirrors DonationOfferService.withdrawOffer — only COMPLETED/ADMIN_APPROVED are blocked).
// Handover-stage statuses are excluded here — those go through the Handover Hub/issue flow instead.
const CANCELLABLE_STATUSES = new Set([
  "DRAFT", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING",
  "COMPATIBILITY_CHECKED", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP",
  "PENDING_DONEE_REVIEW", "DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED",
  "DONOR_RECONFIRMED", "CONDITION_CHANGED_RESCREENING", "NEEDS_INFORMATION",
  "PENDING_ADMIN_APPROVAL",
]);

export default function MyOffersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconfirmingId, setReconfirmingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    getMyDonationOffers()
      .then(setOffers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  async function handleReconfirm(offerId: number) {
    setReconfirmingId(offerId);
    try {
      const updated = await reconfirmOfferAvailability(offerId);
      setOffers((prev) => prev.map((o) => (o.id === offerId ? updated : o)));
      toast.success("Availability reconfirmed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reconfirm");
    } finally {
      setReconfirmingId(null);
    }
  }

  async function handleCancel(offerId: number) {
    if (!confirm("Cancel this offer? This can't be undone.")) return;
    setCancelingId(offerId);
    try {
      const updated = await withdrawOffer(offerId);
      setOffers((prev) => prev.map((o) => (o.id === offerId ? updated : o)));
      toast.success("Offer cancelled");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel offer");
    } finally {
      setCancelingId(null);
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Donation Offers</h1>
          <p className="text-sm text-gray-500">Track offers you have made to fulfil specific requests.</p>
        </div>

        {loading && <p className="text-center text-gray-400 py-8 animate-pulse">Loading offers...</p>}

        {!loading && offers.length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">No offers yet</h2>
            <p className="mt-1 text-sm text-gray-500">Browse verified requests and click "I Can Donate This Item" to get started.</p>
            <Link href="/requests" className="mt-4 inline-block rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white">
              Browse Requests
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[offer.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {offer.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-400">{offer.flowType?.replace(/_/g, " ")}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{offer.requestTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{offer.requestCategory} · {offer.requestCity}</p>
                  {offer.itemDetails && (
                    <p className="text-xs text-gray-400 mt-1">
                      {offer.itemDetails.quantity}× · {offer.itemDetails.condition ?? "Condition not set"}
                    </p>
                  )}
                  {offer.submittedAt && (
                    <p className="text-xs text-gray-400 mt-1">Submitted {new Date(offer.submittedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {(offer.status === "ADMIN_APPROVED" || offer.status === "HANDOVER_IN_PROGRESS" || offer.status === "HANDOVER_AT_RISK") && (
                    <Link href={`/offers/${offer.id}/handover`}
                      className="rounded-lg bg-[#b04a15] px-3 py-1.5 text-xs font-semibold text-white text-center">
                      Handover Hub
                    </Link>
                  )}
                  {offer.status === "COMPLETED" && (
                    <Link href={`/certificate?offerId=${offer.id}`}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white text-center">
                      Certificate
                    </Link>
                  )}
                  {offer.status === "ISSUE_WINDOW_OPEN" && (
                    <Link href={`/offers/${offer.id}/issues`}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white text-center">
                      Report Issue
                    </Link>
                  )}
                  {offer.status === "DONOR_RECONFIRMATION_REQUIRED" && (
                    <button
                      onClick={() => handleReconfirm(offer.id)}
                      disabled={reconfirmingId === offer.id}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white text-center transition-colors hover:bg-amber-600 disabled:opacity-50"
                    >
                      {reconfirmingId === offer.id ? "Reconfirming…" : "Reconfirm"}
                    </button>
                  )}
                  {CONTINUABLE_STATUSES.has(offer.status) && (
                    <Link href={`/requests/${offer.requestId}/offer`}
                      className="rounded-lg bg-[#1e3a60] px-3 py-1.5 text-xs font-semibold text-white text-center transition-colors hover:bg-[#254876]">
                      Continue
                    </Link>
                  )}
                  {CANCELLABLE_STATUSES.has(offer.status) && (
                    <button
                      onClick={() => handleCancel(offer.id)}
                      disabled={cancelingId === offer.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 text-center transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      {cancelingId === offer.id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
