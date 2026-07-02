"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyDonationOffers, type DonationOffer } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
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

export default function MyOffersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [loading, setLoading] = useState(true);

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
                    <Link href={`/offers/${offer.id}`}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white text-center">
                      Reconfirm
                    </Link>
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
