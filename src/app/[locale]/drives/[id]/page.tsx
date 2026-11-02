"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DriveOfferSentModal, offerSentKey, type DriveOfferSent } from "@/features/ngo-drives/components/DriveOfferSentModal";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getMyNgoDriveOffers, type PublicNgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { PageSkeleton } from "@/components/skeletons";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, giveState, isNotFound } from "@/features/ngo-drives/driveGiveState";
import { DriveDetailView } from "@/features/ngo-drives/components/DriveDetailView";

import { useUiText } from "@/components/UiText";
export default function DriveDetailPage() {
  const ui = useUiText();
  const params = useParams();
  const id = Number(params.id);
  const { user, isLoading: authLoading } = useAuth();

  const [drive, setDrive] = useState<PublicNgoDrive | null>(null);
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isDonor = (user?.role ?? "").toUpperCase() === "DONOR";
  // Right after the donor submits an offer: the success popup, once.
  const router = useRouter();
  const [sent, setSent] = useState<DriveOfferSent | null>(null);
  useEffect(() => {
    if (Number.isNaN(id)) return;
    try {
      if (new URLSearchParams(window.location.search).get("offerSent") !== "1") return;
      const raw = sessionStorage.getItem(offerSentKey(id));
      if (raw) setSent(JSON.parse(raw) as DriveOfferSent);
    } catch { /* no popup */ }
  }, [id]);
  const closeSent = useCallback(() => {
    setSent(null);
    try { sessionStorage.removeItem(offerSentKey(id)); } catch { /* ignore */ }
    router.replace(`/drives/${id}`);
  }, [id, router]);

  const loadDrive = useCallback(async () => {
    if (Number.isNaN(id)) return;
    setLoadError(null);
    try {
      setDrive(await getNgoDrive(id));
    } catch (e) {
      setLoadError({ notFound: isNotFound(e), message: errorMessage(e, ui("Please check your connection and try again.")) });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // The donor's own offers are loaded separately: if they fail, the drive still shows.
  const loadOffers = useCallback(async () => {
    if (!isDonor) {
      setOffers([]);
      return;
    }
    setOffersError(null);
    try {
      setOffers(await getMyNgoDriveOffers());
    } catch (e) {
      setOffersError(errorMessage(e, ui("We couldn't check your offers.")));
    }
  }, [isDonor]);

  useEffect(() => {
    void loadDrive();
  }, [loadDrive]);

  useEffect(() => {
    if (!authLoading) void loadOffers();
  }, [authLoading, loadOffers]);

  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => {
    void loadDrive();
    void loadOffers();
  });

  if (loading || authLoading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (loadError?.notFound) return <DriveNotFound backHref="/requests" backLabel={ui("Back to browse")} />;
  if (loadError || !drive) {
    return (
      <DriveLoadError
        message={loadError?.message ?? ui("Something went wrong.")}
        onRetry={() => {
          setLoading(true);
          void loadDrive();
        }}
      />
    );
  }

  const state = giveState(drive, user, offers);

  return (
    <>
      <DriveDetailView
        drive={drive}
        mode="live"
        giveStateResult={state}
        offersError={offersError}
        onRetryOffers={() => void loadOffers()}
      />
      {sent && <DriveOfferSentModal sent={sent} onClose={closeSent} />}
    </>
  );
}
