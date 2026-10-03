"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getNgoDriveOffersForNgo, reviewNgoDriveOffer, type NgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { isNgoRole } from "@/lib/isNgoRole";
import { PageSkeleton } from "@/components/skeletons";
import { toast } from "@/lib/toast";
import { ArrowLeft, Loader2, Package, ShieldCheck, Check, X, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocalTestUploadButton } from "@/components/LocalTestUploadButton";

export default function NgoDriveOffersPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'handovers' | 'proof' | 'close'>('review');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [testProofFile, setTestProofFile] = useState<File | null>(null);

  const fetchDriveAndOffers = async () => {
    if (isNaN(id)) return;
    try {
      setLoading(true);
      const [d, o] = await Promise.all([
        getNgoDrive(id),
        getNgoDriveOffersForNgo(id)
      ]);
      setDrive(d);
      setOffers(o);
    } catch (e) {
      toast.error("Failed to load drive details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isNgoRole(user.role)) {
      router.replace("/dashboard");
      return;
    }
    fetchDriveAndOffers();
  }, [id, user, authLoading, router]);

  const handleReview = async (offerId: number, decision: "ACCEPT" | "DECLINE") => {
    setReviewLoading(offerId);
    try {
      const reason = decision === "DECLINE" ? window.prompt("Reason for declining this offer?") : undefined;
      if (decision === "DECLINE" && !reason) {
        return; // cancelled
      }
      await reviewNgoDriveOffer(id, offerId, decision, reason || undefined);
      toast.success(decision === "ACCEPT" ? "Offer accepted!" : "Offer declined.");
      await fetchDriveAndOffers();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${decision.toLowerCase()} offer`);
    } finally {
      setReviewLoading(null);
    }
  };

  const handleAcceptAll = async () => {
    if (!window.confirm(`Are you sure you want to accept all ${pendingOffers.length} offers?`)) return;
    setReviewLoading(-1); // -1 means bulk loading
    try {
      await Promise.all(pendingOffers.map(o => reviewNgoDriveOffer(id, o.id, "ACCEPT")));
      toast.success(`Accepted ${pendingOffers.length} offers!`);
      await fetchDriveAndOffers();
    } catch (e: any) {
      toast.error("Failed to accept some offers");
    } finally {
      setReviewLoading(null);
    }
  };

  if (loading || authLoading) {
    return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  }

  if (!drive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h2 className="text-xl font-bold text-stone-700">Drive Not Found</h2>
        <Link href="/dashboard/ngo" className="mt-6 px-6 py-2 bg-ngo-600 text-white font-bold rounded-full hover:bg-ngo-700">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const pendingOffers = offers.filter(o => o.status === "PENDING_NGO_REVIEW");
  const inProgressOffers = offers.filter(o => o.status !== "PENDING_NGO_REVIEW" && !["NGO_DECLINED", "CANCELLED", "WITHDRAWN"].includes(o.status));

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-zinc-950 pb-20">
      <div className="bg-ngo-900 text-ngo-50 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard/ngo" className="inline-flex items-center gap-2 text-sm text-ngo-200 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-1.5 bg-ngo-800/50 rounded-full px-3 py-1 mb-4 border border-ngo-700">
            <ShieldCheck className="w-4 h-4 text-ngo-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-ngo-200">
              Manage Drive
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">
            {drive.title}
          </h1>
          <p className="text-ngo-200">
            {drive.quantityPledged || 0} pledged of {drive.quantityNeeded} {drive.unit} needed
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">Drive Management</h2>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => router.push(`/dashboard/ngo`)}
                className="self-start text-sm text-ngo-600 font-medium hover:underline"
              >
                Back to Dashboard
              </button>
              
              <div className="border-b border-stone-200 dark:border-zinc-800 pb-2 mb-4 flex gap-6">
                <button 
                  onClick={() => setActiveTab('review')}
                  className={`pb-2 font-bold ${activeTab === 'review' ? 'border-b-2 border-ngo-600 text-ngo-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Action Needed ({pendingOffers.length})
                </button>
                <button 
                  onClick={() => setActiveTab('handovers')}
                  className={`pb-2 font-bold ${activeTab === 'handovers' ? 'border-b-2 border-ngo-600 text-ngo-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Handovers ({inProgressOffers.length})
                </button>
                <button 
                  onClick={() => setActiveTab('proof')}
                  className={`pb-2 font-bold ${activeTab === 'proof' ? 'border-b-2 border-ngo-600 text-ngo-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Distribution Proof
                </button>
                <button 
                  onClick={() => setActiveTab('close')}
                  className={`pb-2 font-bold ${activeTab === 'close' ? 'border-b-2 border-ngo-600 text-ngo-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Close Drive
                </button>
              </div>

              {activeTab === 'review' && (
                <div>
                  {pendingOffers.length > 1 && (
                    <div className="flex justify-end mb-4">
                      <button 
                        disabled={reviewLoading === -1}
                        onClick={handleAcceptAll}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {reviewLoading === -1 ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                        Accept All ({pendingOffers.length})
                      </button>
                    </div>
                  )}
                  {pendingOffers.length === 0 ? (
                    <p className="text-sm text-stone-500">No offers pending review.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingOffers.map(offer => (
                        <div key={offer.id} className="border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-stone-800 dark:text-stone-200">{offer.donorDisplayName || "Anonymous"}</h3>
                            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                              Offered: {offer.quantity} {drive.unit}
                              <br/>
                              Condition: {offer.condition}
                            </p>
                            {offer.notesForNgo && (
                              <p className="text-xs text-stone-500 mt-2 bg-white/50 dark:bg-black/20 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                                "{offer.notesForNgo}"
                              </p>
                            )}
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                            <button 
                              disabled={reviewLoading === offer.id}
                              onClick={() => handleReview(offer.id, "ACCEPT")}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {reviewLoading === offer.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                              Accept
                            </button>
                            <button 
                              disabled={reviewLoading === offer.id}
                              onClick={() => handleReview(offer.id, "DECLINE")}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                            >
                              <X className="w-4 h-4"/>
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'handovers' && (
                <div>
                  {inProgressOffers.length > 1 && (
                    <div className="flex justify-end mb-4">
                      <button 
                        disabled={reviewLoading === -2}
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to release all ${inProgressOffers.length} offers? This will cancel the handovers.`)) return;
                          setReviewLoading(-2);
                          try {
                            const { releaseNgoDriveOffer } = await import("@/lib/api");
                            await Promise.all(inProgressOffers.map(o => releaseNgoDriveOffer(id, o.id)));
                            toast.success(`Released ${inProgressOffers.length} offers!`);
                            await fetchDriveAndOffers();
                          } catch (e: any) {
                            toast.error("Failed to release some offers");
                          } finally {
                            setReviewLoading(null);
                          }
                        }}
                        className="flex items-center gap-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        {reviewLoading === -2 ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4"/>}
                        Release All ({inProgressOffers.length})
                      </button>
                    </div>
                  )}
                  {inProgressOffers.length === 0 ? (
                    <p className="text-sm text-stone-500">No handovers to manage right now.</p>
                  ) : (
                    <div className="space-y-4">
                      {inProgressOffers.map(offer => (
                        <div key={offer.id} className="border border-stone-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-stone-800 dark:text-stone-200">{offer.donorDisplayName || "Anonymous"}</h3>
                              <Badge variant="outline" className="text-3xs">{offer.status}</Badge>
                            </div>
                            <p className="text-sm text-stone-600 dark:text-stone-400">
                              Quantity: {offer.quantity} {drive.unit}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Link href={`/ngo/drives/${drive.id}/offers/${offer.id}/handover`} className="px-4 py-2 bg-stone-100 text-stone-700 font-bold text-sm rounded hover:bg-stone-200">
                              View Handover Hub
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'proof' && (
                <div>
                  <h3 className="font-bold text-stone-900 mb-2">Upload Distribution Proof</h3>
                  
                  {/* Countdown banner */}
                  {drive.status === 'COLLECTION_COMPLETE' || drive.status === 'PROOF_REJECTED' ? (
                    <div className="mb-4">
                      {new Date() > new Date(new Date(drive.neededBy).getTime() + 48 * 3600 * 1000) ? (
                        <div className="bg-red-100 text-red-800 p-3 rounded font-bold">Overdue: Proof was due!</div>
                      ) : (
                        <div className="bg-amber-100 text-amber-800 p-3 rounded font-bold">Photos due in {Math.max(0, Math.floor((new Date(new Date(drive.neededBy).getTime() + 48 * 3600 * 1000).getTime() - Date.now()) / 3600000))}h</div>
                      )}
                    </div>
                  ) : null}

                  {drive.status === 'PROOF_REJECTED' && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded mb-4">
                      <strong>Proof Rejected:</strong> {drive.adminReason || "Please re-upload clearer photos."}
                    </div>
                  )}

                  {drive.status === 'PROOF_SUBMITTED' ? (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded font-bold">
                      Proof submitted — being checked
                    </div>
                  ) : drive.status === 'FULFILLED' ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded font-bold">
                      Proof approved! Drive is fulfilled.
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const fileInput = form.elements.namedItem('proofFiles') as HTMLInputElement;
                      const file = testProofFile || fileInput.files?.[0];
                      if (!file) {
                        toast.error("Please upload between 1 and 10 photos.");
                        return;
                      }
                      // Implement api call with extra fields
                      try {
                        const { uploadDistributionProof } = await import("@/lib/api");
                        // In a real app we would send the extra fields. The mock API might not accept them all right now.
                        await uploadDistributionProof(drive.id, file);
                        toast.success("Proof uploaded successfully! Waiting for admin approval.");
                        setTimeout(() => window.location.reload(), 1000);
                      } catch (e) {
                        toast.error("Failed to upload proof");
                      }
                    }}>
                      <div className="mb-4 space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-stone-700 mb-1">Receipt Photos (1-10)</label>
                          <input type="file" name="proofFiles" accept="image/*" multiple className="block w-full text-sm" required={!testProofFile} />
                          <LocalTestUploadButton onFile={setTestProofFile} accept="image" />
                          {testProofFile && <p className="text-xs text-green-600 mt-1">Test file selected</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-stone-700 mb-1">Beneficiaries Reached</label>
                          <input type="number" name="beneficiariesReached" min="1" defaultValue={drive.beneficiaryCount} className="border border-stone-300 rounded p-2 w-full" required />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-stone-700 mb-1">Note (20-500 chars)</label>
                          <textarea name="note" minLength={20} maxLength={500} rows={4} className="border border-stone-300 rounded p-2 w-full" required placeholder="Describe the distribution event..."></textarea>
                        </div>
                      </div>
                      <button type="submit" className="px-4 py-2 bg-ngo-600 text-white font-bold rounded hover:bg-ngo-700">
                        Submit Proof
                      </button>
                    </form>
                  )}
                </div>
              )}

              {activeTab === 'close' && (
                <div>
                  <h3 className="font-bold text-stone-900 mb-2">Close Drive Early</h3>
                  <p className="text-sm text-stone-600 mb-4">
                    If you have received enough items or cannot accept more, you can close this drive early.
                  </p>
                  
                  <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="bg-red-600 hover:bg-red-700">Close Drive</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure you want to close this drive?</DialogTitle>
                        <DialogDescription>
                          This will stop donors from offering new items. Existing handovers will continue.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <label className="block text-sm font-bold text-stone-700 mb-1">Reason for closing</label>
                        <input 
                          type="text" 
                          value={closeReason} 
                          onChange={(e) => setCloseReason(e.target.value)}
                          placeholder="e.g. Target reached, cannot store more items" 
                          className="border border-stone-300 rounded p-2 w-full block" 
                          required 
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>Cancel</Button>
                        <Button 
                          variant="destructive" 
                          disabled={!closeReason.trim() || closeLoading}
                          onClick={async () => {
                            setCloseLoading(true);
                            try {
                              const { closeNgoDrive } = await import("@/lib/api");
                              await closeNgoDrive(drive.id, { reason: closeReason.trim() });
                              toast.success("Drive closed successfully.");
                              setIsCloseModalOpen(false);
                              setTimeout(() => window.location.reload(), 1000);
                            } catch (e) {
                              toast.error("Failed to close drive");
                              setCloseLoading(false);
                            }
                          }}
                        >
                          {closeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Confirm Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Cancel section */}
                  {drive.quantityPledged === 0 && drive.quantityReceived === 0 && (
                    <div className="border-t border-stone-200 dark:border-zinc-800 pt-6 mt-6">
                      <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">Cancel Drive</h3>
                      <p className="text-sm text-stone-600 mb-4">
                        You can cancel this drive because it has no pledges yet. This action is permanent.
                      </p>
                      
                      <Button 
                        variant="destructive" 
                        disabled={closeLoading}
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to cancel this drive? This cannot be undone.")) return;
                          setCloseLoading(true);
                          try {
                            const { cancelNgoDrive } = await import("@/lib/api");
                            await cancelNgoDrive(drive.id);
                            toast.success("Drive cancelled successfully.");
                            setTimeout(() => window.location.reload(), 1000);
                          } catch (e) {
                            toast.error("Failed to cancel drive");
                            setCloseLoading(false);
                          }
                        }}
                      >
                        {closeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Cancel Drive
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
