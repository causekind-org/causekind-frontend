"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemRequests, getPublicItemRequests, donateToRequest, getMyProfile, updateLocation, analyzeItemImage, type ItemRequest, type PublicItemRequest, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { NgoDrivesRedirect } from "@/components/ngo-landing/NgoDrivesRedirect";
import { registerUrlPreserving } from "@/lib/postAuthDestination";
import { CardGridSkeleton, PageSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ImagePlus, Loader2, MapPin, PackageOpen, Search, SearchX,
  Sparkles, X, HandCoins, Package, ChevronDown,
  ShieldCheck, Heart, SlidersHorizontal, ArrowRight,
  BookOpen, Stethoscope, Sprout, Users, Home, Activity,
  Armchair, Shirt, Smartphone, Dumbbell,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ALL_REQUEST_CATEGORIES as ITEM_REQ_CATEGORIES } from "@/lib/categoryVisuals";
import { audienceFromUrlType, urlTypeFromAudience, type AudienceUrlType } from "@/lib/requestAudience";
import AudienceDialog from "@/components/requests/AudienceDialog";
import { RequestDirectory, type LocationState } from "./RequestDirectory";

/*
  Both of these are split out of the guest's download, not just deferred.

  This module serves three different people from one file: guests and donors
  get the Category Directory (guests read the public board, donors the
  signed-in one), a donee gets the donee portal. Statically imported, the
  donee and NGO portals shipped to everyone — so the visitor who renders
  neither still paid to parse both before the board could paint. (The donor board used
  the gsap-driven MagicBento mosaic until 2026-09-29; it no longer loads here.)
*/
const DoneeRequestsPage = dynamic(
  () => import("./donee-view").then(m => m.DoneeRequestsPage),
  { loading: () => <PageSkeleton><CardGridSkeleton count={6} label="Loading your requests" /></PageSkeleton> },
);

type ReqSortValue = "nearest" | "urgent" | "newest" | "qty";

/** `?type=` on the signed-in directory; anything unknown is Everyone. */
function readUrlAudience(): AudienceUrlType {
  if (typeof window === "undefined") return "all";
  const t = new URLSearchParams(window.location.search).get("type");
  return t === "people" || t === "ngos" ? t : "all";
}

/** `?page=` (1-based); anything missing or invalid is page 1. */
function readUrlPage(): number {
  if (typeof window === "undefined") return 1;
  const n = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/**
 * A public-board need in the shape the directory renders. The public
 * projection carries no location, owner id or status (by design), so those are
 * empty; nothing a guest sees reads them.
 */
function fromPublic(p: PublicItemRequest): ItemRequest {
  return {
    id: p.id, title: p.title, category: p.category, quantity: p.quantity,
    urgency: p.urgency, city: p.city, description: p.description,
    createdAt: p.createdAt, imageUrl: p.imageUrl, isEmergency: p.emergency,
    requesterType: p.requesterType, organizationName: p.organizationName ?? null,
    doneeName: p.doneeFirstName ?? p.organizationName ?? "",
    pincode: null, status: "OPEN", rejectionReason: null, doneeId: 0,
    pickupRadiusKm: null, latitude: null, longitude: null,
    verificationTier: null, emergencyNature: null, incidentDate: null, verificationDueAt: null,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function RequestsHero() {
  const [mouse, setMouse] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);

  return (
    <div
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full min-h-[300px] sm:min-h-[360px] lg:min-h-[400px] flex items-center overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #1c0905 0%, #2a0f07 45%, #0f1d30 100%)" }}
    >
      {/* Mouse-tracking warm glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-200 ease-out"
        style={{ background: `radial-gradient(ellipse at ${mouse.x}% ${mouse.y}%, rgba(176,74,21,${active ? 0.38 : 0.2}) 0%, transparent 55%)` }}
      />
      {/* Static cool-side glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 15%, rgba(30,58,96,0.28) 0%, transparent 50%)" }} />

      {/* Dot grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />

      {/* Decorative rings */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-[var(--ck-role-accent)]/10 animate-blob-a pointer-events-none" />
      <div className="absolute -top-24 right-8  w-80 h-80 rounded-full border border-[#1e3a60]/12 animate-blob-b pointer-events-none" />
      <div className="absolute bottom-8 right-32 w-48 h-48 rounded-full border border-[var(--ck-role-secondary)]/08 animate-blob-b pointer-events-none" />

      {/* Floating ambient dots */}
      <div className="absolute top-[22%] left-[10%] w-2 h-2 rounded-full bg-[var(--ck-role-highlight)]/30 animate-float-shape-1 pointer-events-none" />
      <div className="absolute top-[60%] right-[12%] w-1.5 h-1.5 rounded-full bg-[var(--ck-role-secondary)]/40 animate-float-shape-3 pointer-events-none" />
      <div className="absolute top-[35%] right-[38%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float-shape-2 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[45%] w-1 h-1 rounded-full bg-[var(--ck-role-accent)]/40 animate-float-shape-4 pointer-events-none" />

      {/* Ghost large icon */}
      <div className="absolute bottom-4 right-6 opacity-[0.05] animate-blob-a pointer-events-none">
        <HandCoins className="h-40 w-40 text-white" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
        <div className="max-w-2xl">

          {/* ── Left: headline ── */}
          <div className="space-y-5 sm:space-y-6">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 bg-[var(--ck-role-accent)]/20 border border-[var(--ck-role-accent)]/35 rounded-full px-4 py-1.5 anim-up anim-d1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ck-role-highlight)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ck-role-highlight)]" />
              </span>
              <span className="text-[var(--ck-role-highlight)] text-3xs font-black uppercase tracking-widest">Live Community Needs</span>
            </div>

            {/* Headline */}
            <div className="anim-up anim-d2">
              <h1 className="text-white text-2xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.04] tracking-tight">
                Give items.{" "}
                <span className="text-gradient-terra">Change lives.</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md anim-up anim-d3">
              Real people nearby need specific items — not cash. Browse verified requests and donate directly, no shipping fees, no middlemen.
            </p>

            {/* Scroll cue */}
            <div className="flex items-center gap-2 pt-1 anim-up anim-d4">
              <span className="text-white/25 text-3xs font-bold uppercase tracking-widest">Browse needs below</span>
              <ChevronDown className="h-4 w-4 text-white/25 animate-bounce-slow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RequestsClient({
  initialPublicRequests = null,
}: {
  /**
   * The open public board, already fetched on the server by src/app/requests/page.tsx.
   *
   * Only guests use it — a donor's directory and a donee's portal both need
   * authenticated, per-user data that a server render cannot obtain. Null
   * when the server fetch failed; the page then fetches it on the client.
   */
  initialPublicRequests?: PublicItemRequest[] | null;
}) {
  const t        = useTranslations("requests");
  const { user, isLoading: authLoading, isRestoring } = useAuth();
  const router   = useRouter();

  useEntityUpdates(["REQUEST"], () => {
    if (!user || user.role === "DONEE") return;
    getItemRequests(undefined, gpsCoords?.lat, gpsCoords?.lng)
      .then(setRequests)
      .catch(() => {});
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No guest redirect. Browsing is public; only offering is authenticated.
  //
  // This used to be `router.replace("/login?redirect=/requests")`, which made
  // the whole public board below unreachable — `PublicRequestsBoard` was
  // already wired up at the guard, but the effect fired first and bounced every
  // logged-out visitor to login before it could render. It also used the
  // obsolete `redirect` parameter; login reads `next` and validates it through
  // `safeInternalPath`, so the old value was ignored even when it arrived.
  //
  // Nothing replaces it: the render guard further down already branches
  // authLoading -> guest -> DONEE -> donor, and every data effect in this
  // component is gated on `user`, so a guest fetches nothing from here.

  const [requests,  setRequests]  = useState<ItemRequest[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const cat = new URLSearchParams(window.location.search).get("category");
      if (cat) return [cat];
      const saved = localStorage.getItem("causekind_donor_category");
      if (saved) {
        if (saved === "ALL") return [];
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          return [saved];
        }
      }
    }
    return [];
  });

  // Sync with the global DonorCategoryModal when it fires while this page is open
  useEffect(() => {
    function onCategoryChanged(e: Event) {
      setSelectedCategories((e as CustomEvent<string[]>).detail);
    }
    window.addEventListener("ck-category-changed", onCategoryChanged);
    return () => window.removeEventListener("ck-category-changed", onCategoryChanged);
  }, []);

  const [selectedUrgencies,  setSelectedUrgencies]  = useState<string[]>([]);
  // Newest by default: nearest needs a location, and location is opt-in.
  const [sort, setSort]           = useState<ReqSortValue>("newest");
  // Everyone / Donee / NGOs — the same `type` URL values as the guest board.
  // A browsing filter only; nothing is saved (owner decision 2026-09-29).
  // Read in the initialisers (as selectedCategories already is): this branch
  // only renders after auth restoration, so nothing server-rendered depends
  // on them, and a mount-time sync would trip the page-reset effect below.
  const [audience, setAudienceState] = useState<AudienceUrlType>(() => readUrlAudience());
  const [page, setPage] = useState(() => readUrlPage());
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  // Donate modal state
  const [donateTarget,  setDonateTarget]  = useState<ItemRequest | null>(null);
  const modalTitle                         = useDynamicTranslation(donateTarget?.title ?? null);
  const [description,   setDescription]   = useState("");
  const [images,        setImages]        = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [aiGenerated,   setAiGenerated]   = useState(false);

  // ── GPS and Profile load ───────────────────────────────────────────────────
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const requestGps = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support GPS location");
      setGpsBlocked(true);
      setGpsLoading(false);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsBlocked(false);
        setGpsLoading(false);
        // The visitor asked for their location, so show what it is for.
        setSort("nearest");
        if (user && user.role !== "DONEE") {
          try {
            await updateLocation(lat, lng);
            const p = await getMyProfile();
            setMyProfile(p);
          } catch (e) {
            console.warn("Failed to update profile location:", e);
          }
        }
      },
      (err) => {
        console.warn("GPS retrieval error — code:", err.code, "| message:", err.message);
        setGpsBlocked(true);
        setGpsLoading(false);
        const msg =
          err.code === 1 ? "Location access denied. Please allow GPS in browser settings." :
          err.code === 2 ? "Location unavailable. Check your device GPS." :
          err.code === 3 ? "Location request timed out. Please retry." :
          "Location access denied. You must allow GPS access to view nearby requests.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // No GPS on arrival: location is requested only from the "Use my location"
  // button (requestGps), and a denial never blocks browsing.

  // Load profile details separately
  useEffect(() => {
    if (user && user.role !== "DONEE") {
      getMyProfile().then(setMyProfile).catch(() => {});
    }
  }, [user]);

  // Load requests based on GPS. Categories are deliberately NOT sent to the server —
  // category filtering happens entirely client-side below (`filtered`), so `requests`
  // always holds the full GPS-scoped set. Sending selectedCategories here used to make
  // the server return only the selected categories, which shrank `requests` itself and
  // broke `catCounts` (every unselected category read as 0 and got disabled, blocking
  // multiselect — you could never add a second category once one was picked).
  // Loads straight away, coordinates or not — the endpoint takes lat/lng as
  // optional and only uses them to pre-sort. A sequence number drops a stale
  // response (e.g. the no-location load finishing after the located one).
  const loadSeq = useRef(0);
  // Guests read the public board (no login): the server's seed first, then the
  // same public endpoint on retry. It has no coordinates, so GPS is not sent.
  useEffect(() => {
    if (isRestoring || user?.role === "DONEE") return;
    const seq = ++loadSeq.current;
    if (!user && initialPublicRequests && retryTick === 0) {
      setRequests(initialPublicRequests.map(fromPublic));
      setLoadFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    const load = user
      ? getItemRequests(undefined, gpsCoords?.lat, gpsCoords?.lng)
      : getPublicItemRequests().then(list => list.map(fromPublic));
    load
      .then(res => { if (seq === loadSeq.current) setRequests(res); })
      .catch(() => { if (seq === loadSeq.current) setLoadFailed(true); })
      .finally(() => { if (seq === loadSeq.current) setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoring, user?.id, user?.role, user ? gpsCoords : null, retryTick]);

  // Audience and page live in the URL (`type`, `page`); follow Back/Forward.
  useEffect(() => {
    const sync = () => {
      setAudienceState(readUrlAudience());
      setPage(readUrlPage());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const writeBrowseUrl = (next: { type?: AudienceUrlType; page?: number }, mode: "push" | "replace") => {
    const url = new URL(window.location.href);
    if (next.type !== undefined) {
      if (next.type === "all") url.searchParams.delete("type");
      else url.searchParams.set("type", next.type);
    }
    if (next.page !== undefined) {
      if (next.page <= 1) url.searchParams.delete("page");
      else url.searchParams.set("page", String(next.page));
    }
    if (url.href === window.location.href) return;
    if (mode === "push") window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
  };

  // ── Derived counts ────────────────────────────────────────────────────────

  // ── Filtered + sorted requests ────────────────────────────────────────────

  // Search and urgency apply first; the audience tabs are counted over that set
  // (before audience and category), and the category rail over that set plus
  // the audience. Every count therefore says what its control would show.
  const audienceOf = (r: ItemRequest): AudienceUrlType => (r.requesterType === "NGO" ? "ngos" : "people");
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      const mQ = !q || r.title.toLowerCase().includes(q) || (r.city ?? "").toLowerCase().includes(q)
        || r.category.toLowerCase().includes(q) || (r.organizationName ?? "").toLowerCase().includes(q);
      // An emergency satisfies a Critical filter, matching the "Emergency" badge.
      const mU = selectedUrgencies.length === 0 || selectedUrgencies.includes(r.urgency)
        || (r.isEmergency && selectedUrgencies.includes("CRITICAL"));
      return mQ && mU;
    });
  }, [requests, search, selectedUrgencies]);

  const typeCounts = useMemo(() => {
    const inCats = baseFiltered.filter(r => selectedCategories.length === 0 || selectedCategories.includes(r.category));
    return {
      PERSON: inCats.filter(r => audienceOf(r) === "people").length,
      NGO: inCats.filter(r => audienceOf(r) === "ngos").length,
    };
  }, [baseFiltered, selectedCategories]);

  const directoryCatCounts = useMemo(() => {
    const c: Record<string, number> = {};
    baseFiltered
      .filter(r => audience === "all" || audienceOf(r) === audience)
      .forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [baseFiltered, audience]);

  // Nearest needs a real location: the one the visitor just shared, else the
  // one saved on their profile. Without either, the option is not offered.
  const nearOrigin = gpsCoords
    ?? (myProfile?.latitude != null && myProfile?.longitude != null ? { lat: myProfile.latitude, lng: myProfile.longitude } : null);

  const filtered = useMemo(() => {
    let out = baseFiltered.filter(r =>
      (selectedCategories.length === 0 || selectedCategories.includes(r.category))
      && (audience === "all" || audienceOf(r) === audience));
    // Every sort ends on id, newest first, so ties have one fixed order and
    // paging over them never repeats or skips a card.
    const tie = (a: ItemRequest, b: ItemRequest) => b.id - a.id;
    if (sort === "nearest") {
      const lat = nearOrigin?.lat, lon = nearOrigin?.lng;
      if (lat != null && lon != null) {
        out = [...out].sort((a, b) => {
          const dA = a.latitude != null && a.longitude != null ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude != null && b.longitude != null ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB || tie(a, b);
        });
      } else {
        out = [...out].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || tie(a, b));
      }
    } else if (sort === "urgent") {
      const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
      out = [...out].sort((a, b) => (a.isEmergency === b.isEmergency ? 0 : a.isEmergency ? -1 : 1) || (ord[a.urgency] ?? 3) - (ord[b.urgency] ?? 3) || tie(a, b));
    } else if (sort === "newest") {
      out = [...out].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || tie(a, b));
    } else if (sort === "qty") {
      out = [...out].sort((a, b) => b.quantity - a.quantity || tie(a, b));
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, selectedCategories, audience, sort, nearOrigin?.lat, nearOrigin?.lng]);

  // ── Paging (12 per page over the filtered list; `?page`) ──
  const DIRECTORY_PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  // Clamp rather than store: a shrinking list never leaves an empty page.
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * DIRECTORY_PAGE_SIZE, currentPage * DIRECTORY_PAGE_SIZE);

  // Any change to what is listed starts again at page 1 (skipping the first
  // run, so a shared ?page=3 survives arrival).
  const listKey = `${search}|${selectedCategories.join(",")}|${selectedUrgencies.join(",")}|${audience}|${sort}`;
  const lastListKey = useRef(listKey);
  useEffect(() => {
    if (lastListKey.current === listKey) return;
    lastListKey.current = listKey;
    setPage(1);
    writeBrowseUrl({ page: 1 }, "replace");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const goToPage = (n: number) => {
    const next = Math.min(Math.max(1, n), totalPages);
    setPage(next);
    writeBrowseUrl({ page: next }, "push");
    document.getElementById("request-directory")?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const setAudience = (next: AudienceUrlType) => {
    setAudienceState(next);
    writeBrowseUrl({ type: next, page: 1 }, "replace");
  };

  // "Who would you like to help?" — same dialog as the guest board, asked once
  // per visit (per mount) to anyone who lands on this directory. Donees and
  // NGOs have their own portals and never see it. Saves nothing; choosing just
  // sets the same audience filter as the toolbar tabs.
  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false);
  const audienceAsked = useRef(false);
  const onDirectory = !user || (user.role !== "DONEE" && user.role !== "NGO" && user.role !== "NGO_PARTNER");
  useEffect(() => {
    if (isRestoring || !onDirectory || audienceAsked.current) return;
    audienceAsked.current = true;
    setAudienceDialogOpen(true);
  }, [isRestoring, onDirectory]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      if (typeof window !== "undefined") {
        localStorage.setItem("causekind_donor_category", JSON.stringify(next));
      }
      return next;
    });
  };
  const toggleUrgency  = (u: string) =>
    setSelectedUrgencies(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const resetFilters   = () => {
    setSelectedCategories([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("causekind_donor_category", JSON.stringify([]));
    }
    setSelectedUrgencies([]);
    setSearch("");
  };


  // ── Donate modal handlers ─────────────────────────────────────────────────

  function openDonateModal(req: ItemRequest) {
    // A guest signs up first (Donor preselected, "Log in" offered there) and
    // comes back to this need's offer through `?next=`.
    if (!user) { router.push(registerUrlPreserving(`/requests/${req.id}/offer`)); return; }
    router.push(`/requests/${req.id}/offer`);
  }

  function closeDonateModal() {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setDonateTarget(null);
    setDescription(""); setImages([]); setImagePreviews([]); setAnalyzing(false); setAiGenerated(false);
  }

  useEffect(() => {
    if (!donateTarget) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [donateTarget]);

  async function runAnalysis(file: File) {
    setAnalyzing(true); setAiGenerated(false); setDescription("");
    try {
      const { description: aiDesc } = await analyzeItemImage(file);
      if (aiDesc) { setDescription(aiDesc); setAiGenerated(true); }
    } catch {
      toast.error("AI analysis failed — please describe the item manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 3) { toast.error("Maximum 3 images allowed"); return; }
    const next = [...images, ...files];
    setImages(next);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
    if (files.length > 0) runAnalysis(files[0]);
  }

  function removeImage(i: number) {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmitDonate() {
    if (!donateTarget) return;
    if (images.length === 0) { toast.error("Please upload at least one photo of the item"); return; }
    if (description.trim().length < 20) { toast.error("Please describe your item in at least 20 characters"); return; }
    setSubmitting(true);
    try {
      await donateToRequest(donateTarget.id, images, description.trim());
      toast.success("Donation request sent! Admin will review and share contact details if approved.");
      closeDonateModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit donation");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  /*
    `isRestoring`, not `authLoading` — the difference is a cold database.

    `isRestoring` is one effect tick: it answers "has localStorage been read
    yet". `authLoading` stays true for a visitor with empty storage until
    /users/me returns a 401, and that call is what wakes the deliberately-cold
    Hikari pool. Gating here on it meant a logged-out visitor coming from the
    hero's "Explore needs near you" waited out the whole wake-up, got told they
    were a guest, and only THEN mounted the board — which starts its own fetch.
    Two round trips end to end, the first of which exists only to learn nothing.

    Gating on `isRestoring` mounts the board on the first tick, so its fetch
    goes out alongside /users/me instead of behind it.

    The cost is one real case: someone signed in whose localStorage was cleared
    sees the public board for a moment before the donor or donee view replaces
    it. That is a content swap on a page that never redirects — unlike a route
    guard, where resolving early to "guest" would bounce them to /login, which
    is exactly why useAuth keeps the two flags apart.
  */
  if (isRestoring) {
    // Shaped like the board that follows, so the page settles once rather than
    // jumping from a centred spinner to a three-column grid.
    return (
      <PageSkeleton>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="mt-7">
          <CardGridSkeleton count={6} label="Loading in-kind requests" />
        </div>
      </PageSkeleton>
    );
  }

  // Guests get the same directory as donors, fed by the public board (see the
  // load effect), with offering routed through sign-up.

  // Dedicated donee portal
  if (user?.role === "DONEE") return <DoneeRequestsPage />;

  // NGOs only have drives: send them to their live drives.
  if (user?.role === "NGO" || user?.role === "NGO_PARTNER") return <NgoDrivesRedirect />;

  // ── Render ────────────────────────────────────────────────────────────────

  const locationState: LocationState =
    gpsLoading ? "locating" : nearOrigin ? "on" : gpsBlocked ? "denied" : "off";

  return (
    <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

      {/* ── Hero (unchanged) ── */}
      <RequestsHero />

      {/* ── Category Directory ── */}
      <div id="request-directory" className="scroll-mt-20">
        <RequestDirectory
          requests={pageItems}
          total={filtered.length}
          counts={directoryCatCounts}
          typeCounts={typeCounts}
          categories={selectedCategories}
          toggleCategory={toggleCategory}
          clearCategories={() => {
            setSelectedCategories([]);
            if (typeof window !== "undefined") {
              localStorage.setItem("causekind_donor_category", JSON.stringify([]));
            }
          }}
          audience={audience}
          setAudience={setAudience}
          urgencies={selectedUrgencies}
          toggleUrgency={toggleUrgency}
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          location={locationState}
          onUseLocation={requestGps}
          reset={resetFilters}
          loading={loading}
          failed={loadFailed}
          onRetry={() => setRetryTick(t => t + 1)}
          page={currentPage}
          totalPages={totalPages}
          onPage={goToPage}
          canOffer={!user || user.role === "DONOR"}
          onOffer={openDonateModal}
        />
      </div>

      <AudienceDialog
        open={audienceDialogOpen}
        current={audienceFromUrlType(audience)}
        returnFocusId={a => `directory-audience-${a}`}
        onChoose={a => { setAudienceDialogOpen(false); setAudience(urlTypeFromAudience(a)); }}
        onDismiss={() => setAudienceDialogOpen(false)}
      />

      {/* ── Donate modal ── */}
      {donateTarget && createPortal((
        <div
          className="fixed inset-0 z-[9990] bg-black/65 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.2s ease forwards" }}
          onClick={closeDonateModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="give-item-title"
            className="fixed left-1/2 top-1/2 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl shadow-black/35 dark:bg-zinc-900 md:max-h-[calc(100dvh-96px)] md:w-[calc(100vw-48px)] md:max-w-[860px] md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="relative hidden select-none flex-col justify-between overflow-hidden p-5 sm:p-8 text-white md:flex md:min-h-[560px] md:w-[40%]"
              style={{ backgroundImage: "url('/images/kindness_banner.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 pointer-events-none" />
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <span className="inline-flex items-center gap-1.5 text-3xs font-extrabold text-[var(--ck-role-highlight)] bg-white/10 backdrop-blur-md border border-white/20 py-1.5 px-3.5 rounded-full uppercase tracking-wider">
                  <Heart className="w-3 h-3 fill-[var(--ck-role-highlight)]" /> Give Back
                </span>
                <h2 className="text-lg sm:text-2xl font-extrabold leading-snug tracking-tight">
                  You&apos;re giving<br />
                  <span className="text-[var(--ck-role-highlight)]">{modalTitle ?? donateTarget.title}</span>
                </h2>
                <p className="text-white/70 text-xs leading-relaxed max-w-[220px]">
                  Upload photos of your item and a short description. Our admin will verify and connect you with the recipient.
                </p>
              </div>
              <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-8 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-2xs text-white/80 font-semibold">Admin-verified before contact is shared</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--ck-role-highlight)] shrink-0" />
                  <span className="text-2xs text-white/80 font-semibold">Local 10 km radius matching</span>
                </div>
              </div>
            </div>

            <div className="relative flex max-h-[calc(100dvh-32px)] min-h-0 w-full flex-col overflow-y-auto p-3.5 sm:p-7 md:max-h-[calc(100dvh-96px)] md:w-[60%] md:p-8">
              <button onClick={closeDonateModal} className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 transition z-10">
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto flex min-h-full w-full max-w-[380px] flex-col justify-center space-y-4 sm:space-y-5 py-2">
                <div>
                  <h3 id="give-item-title" className="text-lg sm:text-2xl font-extrabold text-stone-900 dark:text-white">Give your item</h3>
                  <p className="text-xs text-stone-400 mt-1">Show us what you&apos;re giving so we can find it a perfect home.</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">Photos of item</Label>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-orange-200 dark:border-zinc-700 hover:border-[var(--ck-role-accent)] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-orange-50/20 dark:bg-zinc-800/20 hover:bg-orange-50/40">
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 w-full mb-1" onClick={e => e.stopPropagation()}>
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-orange-100 dark:border-zinc-700 shadow-sm bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black transition">
                              <X className="h-2.5 w-2.5" />
                            </button>
                            {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-5xs text-white">AI scans</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-10 w-10 bg-orange-100 dark:bg-zinc-700 text-[var(--ck-role-accent)] rounded-full flex items-center justify-center mb-2.5">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <p className="text-xs font-extrabold text-stone-800 dark:text-stone-200">Click to upload photos</p>
                    <p className="text-3xs text-stone-400 mt-0.5">JPG, PNG — up to 10 MB each</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-150 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">AI auto-describe</p>
                      <p className="text-3xs text-stone-400">We&apos;ll generate a description from your photo</p>
                    </div>
                  </div>
                  <Switch checked={aiGenerated || analyzing} onCheckedChange={val => { if (val && images.length > 0) runAnalysis(images[0]); else if (!val) setAiGenerated(false); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Item description</Label>
                  <div className="relative">
                    {analyzing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <Loader2 className="h-4 w-4 text-[var(--ck-role-accent)] animate-spin" />
                        <p className="text-2xs font-bold text-stone-700 dark:text-stone-300">Analysing your photo…</p>
                      </div>
                    )}
                    <Textarea id="desc" rows={3} value={description} onChange={e => { setDescription(e.target.value); setAiGenerated(false); }} placeholder="Describe the item, its condition, and any notes…" className="rounded-xl border-stone-200 dark:border-zinc-700 focus-visible:ring-[var(--ck-role-accent)]/20 text-sm resize-none" disabled={analyzing} />
                  </div>
                  <div className="flex justify-between text-3xs text-stone-400 font-semibold">
                    <span>{description.length >= 20 ? "✓ Minimum met" : `${description.length}/20 min`}</span>
                    <span>{description.length}/1000</span>
                  </div>
                </div>
                <button onClick={handleSubmitDonate} disabled={submitting || analyzing || images.length === 0 || description.trim().length < 20} className="w-full bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 disabled:cursor-not-allowed text-white py-3.5 font-bold text-sm rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-900/15 btn-shine">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Heart className="h-4 w-4" /> Complete Donation <ArrowRight className="h-4 w-4" /></>}
                </button>
                <div className="flex justify-between text-3xs text-stone-400 font-bold border-t border-stone-100 dark:border-zinc-800 pt-4">
                  <div className="flex gap-3">
                    <Link href="/faq" className="hover:text-[var(--ck-role-accent)] transition-colors">Help</Link>
                    <Link href="/privacy" className="hover:text-[var(--ck-role-accent)] transition-colors">Privacy</Link>
                  </div>
                  <span>© 2026 CauseKind</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
