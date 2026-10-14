"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getMyNgoDriveOffers, type PublicNgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { PageSkeleton } from "@/components/skeletons";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, giveState, isNotFound } from "@/features/ngo-drives/driveGiveState";
import { DriveDetailView } from "@/features/ngo-drives/components/DriveDetailView";

export default function DriveDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user, isLoading: authLoading } = useAuth();

  const [drive, setDrive] = useState<PublicNgoDrive | null>(null);
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isDonor = (user?.role ?? "").toUpperCase() === "DONOR";

  const loadDrive = useCallback(async () => {
    if (Number.isNaN(id)) return;
    setLoadError(null);
    try {
      setDrive(await getNgoDrive(id));
    } catch (e) {
      setLoadError({ notFound: isNotFound(e), message: errorMessage(e, "Please check your connection and try again.") });
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
      setOffersError(errorMessage(e, "We couldn't check your offers."));
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
  if (loadError?.notFound) return <DriveNotFound backHref="/requests" backLabel="Back to browse" />;
  if (loadError || !drive) {
    return (
      <DriveLoadError
        message={loadError?.message ?? "Something went wrong."}
        onRetry={() => {
          setLoading(true);
          void loadDrive();
        }}
      />
    );
  }

  const state = giveState(drive, user, offers);

  return (
    <DriveDetailView
      drive={drive}
      mode="live"
      giveStateResult={state}
      offersError={offersError}
      onRetryOffers={() => void loadOffers()}
    />
  );
}
