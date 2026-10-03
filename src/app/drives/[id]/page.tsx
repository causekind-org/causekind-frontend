"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, MapPin, CalendarClock, Users, Package, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getMyNgoDriveOffers, type NgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { DriveProgressBar } from "@/features/ngo-drives/components/DriveProgressBar";
import { PageSkeleton } from "@/components/skeletons";
import { toast } from "@/lib/toast";

export default function DriveDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    setLoading(true);
    Promise.all([
      getNgoDrive(id),
      user && user.role === "DONOR" ? getMyNgoDriveOffers() : Promise.resolve([])
    ])
      .then(([d, o]) => {
        setDrive(d);
        setOffers(o);
      })
      .catch((e) => {
        toast.error("Failed to load drive details");
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading || authLoading) {
    return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  }

  if (!drive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-700">Drive Not Found</h2>
        <p className="text-stone-500 mt-2">This drive might have ended or been removed.</p>
        <button 
          onClick={() => router.push("/requests")}
          className="mt-6 px-6 py-2 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700"
        >
          Back to Browse
        </button>
      </div>
    );
  }

  const activeOffer = offers.find(o => o.driveId === drive.id && !["CANCELLED", "WITHDRAWN"].includes(o.status));
  const stillNeeded = Math.max(0, drive.quantityNeeded - drive.quantityReceived - drive.quantityPledged);
  const isFullyOffered = stillNeeded === 0;

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-zinc-950 pb-20">
      <div className="bg-emerald-900 text-emerald-50 py-8 lg:py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-full px-3 py-1 mb-6 border border-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Verified NGO Drive
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-white mb-4">
            {drive.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-emerald-200 font-medium">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              By {drive.ngoUser.fullName}
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              Needed by {new Date(drive.neededBy).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-4">About this drive</h2>
              <p className="text-stone-600 dark:text-stone-300 whitespace-pre-wrap">{drive.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-stone-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Item Needed</h3>
                  <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200 font-semibold">
                    <Package className="w-5 h-5 text-emerald-500" />
                    {drive.quantityNeeded} {drive.unit} of {drive.itemName}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Beneficiaries</h3>
                  <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200 font-semibold">
                    <Users className="w-5 h-5 text-emerald-500" />
                    {drive.beneficiaryCount} {drive.beneficiaryGroup}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-4">Requirements & Handover</h2>
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50">
                  <h4 className="font-bold text-amber-800 dark:text-amber-500 mb-1">Condition Rule</h4>
                  <p className="text-amber-700 dark:text-amber-400 text-sm">
                    {drive.itemCondition === "NEW_ONLY" ? "Items must be New or Unused." : 
                     drive.itemCondition === "GENTLY_USED" ? "Items can be Gently Used (no major damage)." : 
                     "Any condition is accepted, please describe accurately."}
                  </p>
                </div>
                <div className="flex items-start gap-3 text-stone-600 dark:text-stone-300">
                  <MapPin className="w-5 h-5 shrink-0 text-stone-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-700 dark:text-stone-200 block">Drop-off Location</span>
                    The exact address is shared once your offer is approved. Handover available on {drive.availableDays} between {drive.availableFrom} and {drive.availableTo}.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 sticky top-24">
              <div className="mb-6">
                <DriveProgressBar 
                  driveId={drive.id}
                  quantityNeeded={drive.quantityNeeded}
                  initialQuantityReceived={drive.quantityReceived}
                  initialQuantityPledged={drive.quantityPledged}
                  unit={drive.unit}
                />
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 text-center">
                  Many donors give to one drive. Give any amount — even all of it.
                </p>
              </div>

              {drive.status === "FULFILLED" ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 text-center">
                    <p className="font-bold text-emerald-800 dark:text-emerald-400 mb-1">Drive Complete!</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-500">
                      Thanks to generous donors, this drive reached its goal.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/drives/${drive.id}/proof`)}
                    className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    View Impact Report
                  </button>
                </div>
              ) : activeOffer ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-full hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  View Your Offer
                </button>
              ) : isFullyOffered ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full bg-stone-200 dark:bg-zinc-800 text-stone-400 dark:text-stone-500 font-bold py-3.5 rounded-full cursor-not-allowed"
                  >
                    Give to this drive
                  </button>
                  <p className="text-xs text-center text-stone-500">
                    Fully offered right now. Offers are sometimes released, so check back.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/drives/${drive.id}/give`)}
                  className="w-full bg-[var(--ck-role-accent)] text-white font-bold py-3.5 rounded-full hover:brightness-110 transition-all shadow-md shadow-orange-900/20 hover:shadow-orange-900/40"
                >
                  Give to this drive
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
