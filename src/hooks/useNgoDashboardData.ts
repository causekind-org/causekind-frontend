"use client";

import { useState, useEffect, useCallback } from "react";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { getMyNgoDrives, getMyProfile, type NgoDrive, type UserProfile } from "@/lib/api";

export function useNgoDashboardData() {
  const ngoStatus = useNgoStatus();
  
  const [requests, setRequests] = useState<NgoDrive[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  const fetchRequests = useCallback(async () => {
    const isSampleMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_NGO_SAMPLE_DRIVES === "true";
    if (isSampleMode) {
      setRequests([]);
      setLoadingRequests(false);
      setErrorRequests(false);
      return;
    }

    setLoadingRequests(true);
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

  // Use real data where possible, otherwise default to what useNgoStatus gives
  const activeRequests = requests.filter(r => r.status === "OPEN" || r.status === "ACTIVE").length;

  return {
    ...ngoStatus,
    activeRequests: requests.length > 0 ? activeRequests : ngoStatus.activeRequests,
    requests,
    loadingRequests,
    errorRequests,
    refetchRequests: fetchRequests,
    myProfile,
  };
}
