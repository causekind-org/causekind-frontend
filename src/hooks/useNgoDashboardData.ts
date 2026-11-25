"use client";

import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readNgoStatus, writeNgoStatus } from "@/lib/ngoStatusCache";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { getMyNgoDrives, getMyProfile, type NgoDrive, type UserProfile } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";

export function useNgoDashboardData() {
  const ngoStatus = useNgoStatus();
  const { user } = useAuth();
  const accountKey = user ? String(user.id ?? user.email ?? "") : "";

  // Start from the last-known drive list (this tab) so counts don't read 0 on every refresh.
  const [requests, setRequests] = useState<NgoDrive[]>(() => (readNgoStatus(accountKey)?.drives as NgoDrive[] | undefined) ?? []);
  const [loadingRequests, setLoadingRequests] = useState(() => !readNgoStatus(accountKey)?.drives);
  useLayoutEffect(() => {
    const cached = readNgoStatus(accountKey)?.drives as NgoDrive[] | undefined;
    if (cached) { setRequests((prev) => (prev.length ? prev : cached)); setLoadingRequests(false); }
  }, [accountKey]);
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

    const cachedDrives = readNgoStatus(accountKey)?.drives;
    if (!silent && !cachedDrives) setLoadingRequests(true);
    setErrorRequests(false);
    try {
      const res = await getMyNgoDrives();
      setRequests(res);
      writeNgoStatus(accountKey, { drives: res });
      setErrorRequests(false);
    } catch (e) {
      // A failed background refresh keeps what's on screen; only a first load shows the error.
      if (!silent && !cachedDrives) { setRequests([]); setErrorRequests(true); }
    } finally {
      setLoadingRequests(false);
    }
  }, [accountKey]);

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
