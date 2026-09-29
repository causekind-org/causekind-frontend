"use client";

import { useState, useEffect } from "react";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { getMyItemRequests, getMyProfile, type ItemRequest, type UserProfile } from "@/lib/api";

export function useNgoDashboardData() {
  const ngoStatus = useNgoStatus();
  
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMyItemRequests()
      .then((res) => {
        if (isMounted) {
          setRequests(res);
          setErrorRequests(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRequests([]);
          setErrorRequests(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingRequests(false);
      });

    getMyProfile()
      .then((res) => {
        if (isMounted) setMyProfile(res);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Use real data where possible, otherwise default to what useNgoStatus gives
  const activeRequests = requests.filter(r => r.status === "OPEN" || r.status === "ACTIVE").length;

  return {
    ...ngoStatus,
    activeRequests: requests.length > 0 ? activeRequests : ngoStatus.activeRequests,
    requests,
    loadingRequests,
    errorRequests,
    myProfile,
  };
}
