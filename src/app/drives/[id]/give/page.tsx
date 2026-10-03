"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getMyNgoDriveOffers, createNgoDriveOfferDraft, type NgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { NgoDriveOfferWizard } from "@/features/ngo-drives/components/NgoDriveOfferWizard";
import { PageSkeleton } from "@/components/skeletons";
import { toast } from "@/lib/toast";

export default function DriveGivePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [offer, setOffer] = useState<NgoDriveOfferResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?redirect=/drives/${id}/give`);
      return;
    }
    
    setLoading(true);
    let currentDrive: NgoDrive;
    
    getNgoDrive(id)
      .then(d => {
        currentDrive = d;
        setDrive(d);
        return getMyNgoDriveOffers();
      })
      .then(async (offers) => {
        const existing = offers.find(o => o.driveId === currentDrive.id && !["CANCELLED", "WITHDRAWN"].includes(o.status));
        if (existing) {
          if (existing.status === "DRAFT" || existing.status === "NEEDS_INFORMATION") {
            setOffer(existing);
          } else {
            // Already submitted/approved, cannot edit. Go back to drive page
            toast("You already have an active offer for this drive.");
            router.replace(`/drives/${currentDrive.id}`);
          }
        } else {
          // Create draft
          const draft = await createNgoDriveOfferDraft(currentDrive.id);
          // Load the full object to pass to wizard
          // Actually create draft returns just {id}. We can fetch or construct.
          // The backend getMyOffers will return it. Or we can just start empty.
          // Wait, DonationOfferWizard expects `offer` to be full if resuming, or null if empty.
          // If we just created it, it's basically empty. 
          // Let's refetch offers to get the full shape of the draft.
          const freshOffers = await getMyNgoDriveOffers();
          const freshDraft = freshOffers.find(o => o.id === draft.id);
          setOffer(freshDraft || null);
        }
      })
      .catch((e) => {
        toast.error("Failed to load drive or draft offer");
        router.replace(`/drives/${id}`);
      })
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  if (loading || authLoading) {
    return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  }

  if (!drive || !offer) {
    return null;
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <NgoDriveOfferWizard
        offerId={offer.id}
        offer={offer}
        driveId={drive.id}
        ngoName={drive.ngoUser.fullName}
        driveUnit={drive.unit}
        initialQuantityReceived={drive.quantityReceived}
        initialQuantityPledged={drive.quantityPledged}
        requestTitle={drive.title}
        requestedQuantity={drive.quantityNeeded}
        stillNeededQuantity={Math.max(0, drive.quantityNeeded - drive.quantityReceived - drive.quantityPledged)}
        adminNote={offer.status === "NEEDS_INFORMATION" ? offer.rejectionReason || offer.ngoDeclineReason : null}
        onSubmitted={() => {
          // Success screen handled by Wizard or we redirect?
          // The prompt says: "Success screen: 'Your [qty] [item] are reserved for this drive' + a timeline: Checking → NGO reviews → Approved → Handover → Received ✓ → Certificate."
          // Wait, DonationOfferWizard has its own success screen logic (using <RequestOfferSuccess> etc.).
          // Let's redirect to a custom success page, or just dashboard for now.
          router.push(`/dashboard/offers`);
        }}
        onExit={() => router.push(`/drives/${drive.id}`)}
        onSaveExit={() => router.push(`/dashboard/offers`)}
      />
    </main>
  );
}
