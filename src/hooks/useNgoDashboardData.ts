"use client";

import { useState, useEffect, useCallback } from "react";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { getMyNgoDrives, getMyProfile, type NgoDrive, type UserProfile } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";

export function useNgoDashboardData() {
  const ngoStatus = useNgoStatus();
  
  const [requests, setRequests] = useState<NgoDrive[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  const fetchRequests = useCallback(async (silent = false) => {
    const isSampleMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_NGO_SAMPLE_DRIVES === "true";
    if (isSampleMode) {
      setRequests([]);
      setLoadingRequests(false);
      setErrorRequests(false);
      return;
    }

    if (!silent) setLoadingRequests(true);
    setErrorRequests(false);
    try {
      const res = await getMyNgoDrives();
      setRequests(res);
      setErrorRequests(false);
    } catch (e) {
      setRequests([]);
      setErrorRequests(true);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getMyProfile();
      setMyProfile(res);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchProfile();
  }, [fetchRequests, fetchProfile]);

  // A handover, offer decision or proof review changes the drive: refresh the cards in
  // place (received / on the way / still needed), without the loading skeleton.
  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => { void fetchRequests(true); });

  // Drives that donors can give to right now (real NgoDriveStatus values).
  const activeRequests = requests.filter(r => r.status === "LIVE" || r.status === "FULLY_PLEDGED").length;

  return {
    ...ngoStatus,
    activeRequests: errorRequests ? ngoStatus.activeRequests : activeRequests,
    requests,
    loadingRequests,
    errorRequests,
    refetchRequests: () => fetchRequests(),
    myProfile,
  };
}
