"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOffersForMyRequests, doneeReviewOffer, type DonationOffer } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import CompatibilityIndicator from "@/components/CompatibilityIndicator";

export default function DoneeOffersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    getOffersForMyRequests()
      .then(setOffers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  useEntityUpdates(["OFFER"], () => {
    getOffersForMyRequests().then(setOffers).catch(() => {});
  });

  if (!user) return null;

  async function handleAction(
    offerId: number,
    action: "ACCEPT" | "DECLINE",
    declineReason?: string,
  ) {
    setActing(offerId); setError(null);
    try {
      const updated = await doneeReviewOffer(offerId, action, declineReason);
      setOffers((prev) => prev.map((o) => (o.id === offerId ? updated : o)));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Action failed"); }
    finally { setActing(null); }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Donation Offers</h1>
          <p className="text-sm text-gray-500">Donors who offered to fulfil your requests.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && <p className="text-center text-gray-400 py-8 animate-pulse">Loading offers...</p>}

        {!loading && offers.length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm text-gray-500">No donation offers yet. When donors offer to fulfil your requests, they will appear here.</p>
          </div>
        )}

        <div className="space-y-5">
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{offer.requestTitle}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{offer.requestCategory}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  offer.status === "PENDING_DONEE_REVIEW" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {offer.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Item details */}
              {offer.itemDetails && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {offer.itemDetails.condition && <div><span className="font-medium">Condition:</span> {offer.itemDetails.condition}</div>}
                    {offer.itemDetails.quantity > 0 && <div><span className="font-medium">Quantity:</span> {offer.itemDetails.quantity}</div>}
                    {offer.itemDetails.brand && <div><span className="font-medium">Brand:</span> {offer.itemDetails.brand}</div>}
                    {offer.itemDetails.model && <div><span className="font-medium">Model:</span> {offer.itemDetails.model}</div>}
                    {offer.itemDetails.workingStatus && <div><span className="font-medium">Working:</span> {offer.itemDetails.workingStatus}</div>}
                    {offer.itemDetails.pickupCity && <div><span className="font-medium">Location:</span> {offer.itemDetails.pickupCity}</div>}
                  </div>
                  {offer.itemDetails.knownDefects && offer.itemDetails.knownDefects !== "None" && (
                    <div className="mt-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 px-2 py-1 text-xs text-orange-700 dark:text-orange-400">
                      Disclosed defects: {offer.itemDetails.knownDefects}
                    </div>
                  )}
                </div>
              )}

              {/* Photos — deduplicated by URL */}
              {offer.media.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from(new Map(offer.media.map(m => [m.mediaUrl, m])).values()).slice(0, 4).map((m) => (
                    <div key={m.id} className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <img src={m.mediaUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Compatibility */}
              {offer.compatibilityIndicator && (
                <CompatibilityIndicator indicator={offer.compatibilityIndicator} />
              )}

              {/* Flow type */}
              <div className="text-xs text-gray-400">
                {offer.flowType === "ALREADY_OWN" && "Donor already owns this item"}
                {offer.flowType === "WILL_PURCHASE" && "Donor plans to purchase this item"}
                {offer.flowType === "SIMILAR_ITEM" && "Donor has a similar item — see notes"}
                {offer.itemDetails?.specNotes && <span className="block mt-0.5 text-gray-500">{offer.itemDetails.specNotes}</span>}
              </div>

              {/* Actions */}
              {offer.status === "PENDING_DONEE_REVIEW" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction(offer.id, "ACCEPT")}
                    disabled={acting === offer.id}
                    className="flex-1 rounded-xl bg-[#b04a15] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {acting === offer.id ? "..." : "Accept Offer"}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Reason for declining (optional):");
                      handleAction(offer.id, "DECLINE", reason ?? undefined);
                    }}
                    disabled={acting === offer.id}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {offer.status === "DONEE_ACCEPTED" && (
                <p className="text-sm text-green-600">✓ You accepted this offer. Waiting for donor to reconfirm.</p>
              )}
              {offer.status === "ADMIN_APPROVED" && (
                <p className="text-sm text-blue-600">✓ Admin approved. Handover scheduling will begin shortly.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
