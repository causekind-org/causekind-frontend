"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useDynamicTranslation } from "@/hooks/useDynamicTranslation";
import { getItemRequests, donateToRequest, getMyProfile, updateLocation, analyzeItemImage, type ItemRequest, type PublicItemRequest, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { RequestsHero } from "./RequestsHero";
import { RequestDirectory } from "./RequestDirectory";
import PublicRequestsBoard from "@/components/PublicRequestsBoard";
import { loginUrlFor } from "@/lib/safeRedirect";
import { CardGridSkeleton, PageSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";


import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Loader2, MapPin, Sparkles, X, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import Link from "@/components/AppLink";



/*
  Both of these are split out of the guest's download, not just deferred.

  This module serves three different people from one file: a logged-out
  visitor gets `PublicRequestsBoard` and nothing else, a donee gets the donee
  portal, a donor gets the mosaic. Statically imported, the donee portal and
  MagicBento (which drags in gsap) shipped to all three — so the visitor who
  renders neither still paid to parse both before the board could paint.

  `ssr: false` on MagicBento is not a preference: it reads the DOM and drives
  gsap on mount, so it has nothing to render on the server anyway.
*/
const DoneeRequestsPage = dynamic(
  () => import("./donee-view").then(m => m.DoneeRequestsPage),
  { loading: () => <PageSkeleton><CardGridSkeleton count={6} label="Loading your requests" /></PageSkeleton> },
);
// Props now come from src/components/MagicBento.d.ts — see the note there for
// why this stopped being a `@ts-expect-error`.

// ── Constants ──────────────────────────────────────────────────────────────────

type ReqSortValue = "nearest" | "urgent" | "newest" | "qty";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export default function RequestsClient({
  initialPublicRequests = [],
}: {
  /**
   * The public board, already fetched on the server by src/app/requests/page.tsx.
   *
   * Only the logged-out branch uses it — a donor's mosaic and a donee's portal
   * both need authenticated, per-user data that a server render cannot obtain.
   * Defaults to `[]` so the component stays renderable on its own in tests.
   */
  initialPublicRequests?: PublicItemRequest[];
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
  const [sort, setSort]           = useState<ReqSortValue>("nearest");

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
          "Location unavailable. You can still browse all needs.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Load profile details separately
  useEffect(() => {
    if (user && user.role !== "DONEE") {
      getMyProfile().then(setMyProfile).catch(() => {});
    }
  }, [user]);

  // Load requests with optional GPS. Categories are deliberately NOT sent to the server —
  // category filtering happens entirely client-side below (`filtered`), so `requests`
  // always holds the full browsable set. Sending selectedCategories here used to make
  // the server return only the selected categories, which shrank `requests` itself and
  // broke `catCounts` (every unselected category read as 0 and got disabled, blocking
  // multiselect — you could never add a second category once one was picked).
  useEffect(() => {
    if (!user || user.role === "DONEE") return;
    setLoading(true);
    getItemRequests(undefined, gpsCoords?.lat, gpsCoords?.lng)
      .then(setRequests)
      .catch(() => toast.error("Failed to load item requests"))
      .finally(() => setLoading(false));
  }, [user, gpsCoords]);

  // ── Derived counts ────────────────────────────────────────────────────────

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [requests]);


  // ── Filtered + sorted requests ────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let out = requests.filter(r => {
      const mQ = !q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      const mC = selectedCategories.length === 0 || selectedCategories.includes(r.category);
      const mU = selectedUrgencies.length  === 0 || selectedUrgencies.includes(r.urgency);
      return mQ && mC && mU;
    });
    if (sort === "nearest") {
      const lat = gpsCoords?.lat ?? myProfile?.latitude, lon = gpsCoords?.lng ?? myProfile?.longitude;
      if (lat != null && lon != null) {
        out = [...out].sort((a, b) => {
          const dA = a.latitude != null && a.longitude != null ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude != null && b.longitude != null ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        });
      } else {
        const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
        out = [...out].sort((a, b) => (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
      }
    } else if (sort === "urgent") {
      const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
      out = [...out].sort((a, b) => (a.isEmergency === b.isEmergency ? 0 : a.isEmergency ? -1 : 1) || (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
    } else if (sort === "newest") {
      out = [...out].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "qty") {
      out = [...out].sort((a, b) => b.quantity - a.quantity);
    }
    return out;
  }, [requests, search, selectedCategories, selectedUrgencies, sort, myProfile, gpsCoords]);

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
    setSort("nearest");
    setSearch("");
  };


  // ── Donate modal handlers ─────────────────────────────────────────────────

  function openDonateModal(req: ItemRequest) {
    // Defence in depth: a guest never reaches this board (the guard returns
    // PublicRequestsBoard first), but if that ever changes, losing the
    // destination is the failure mode that is invisible in testing — the user
    // logs in successfully and simply lands somewhere else.
    if (!user) { router.push(loginUrlFor(`/requests/${req.id}/offer`)); return; }
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

  // Logged-out visitors get the public board: the reduced-field endpoint, no GPS
  // prompt, and every action routed through /login?next=. They used to be held
  // on the spinner above forever, since `user` never arrives for a guest.
  if (!user) return <PublicRequestsBoard initialRequests={initialPublicRequests} />;

  // Dedicated donee portal
  if (user.role === "DONEE") return <DoneeRequestsPage />;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

      <RequestsHero total={requests.length} critical={requests.filter(request => request.urgency === "CRITICAL").length} />
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
        <button type="button" onClick={requestGps} disabled={gpsLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-semibold disabled:opacity-50 dark:border-stone-700">
          {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {gpsLoading ? "Finding location…" : "Use GPS to find nearby needs"}
        </button>
        <p role="status" className="text-xs text-stone-600 dark:text-stone-400">
          {gpsBlocked ? "Location unavailable. You can keep browsing all needs." :
            gpsCoords ? "Using your selected GPS location." :
            myProfile?.latitude != null && myProfile?.longitude != null ? "Using your saved profile location for nearest sorting." :
            "Location is optional. Without it, nearest sorting shows urgent needs first."}
        </p>
      </div>
      <RequestDirectory
        requests={filtered} total={requests.length} counts={catCounts}
        categories={selectedCategories} toggleCategory={toggleCategory}
        clearCategories={() => { setSelectedCategories([]); localStorage.setItem("causekind_donor_category", JSON.stringify([])); }}
        urgencies={selectedUrgencies} toggleUrgency={toggleUrgency}
        search={search} setSearch={setSearch} sort={sort} setSort={setSort}
        reset={resetFilters} loading={loading} onOpen={openDonateModal}
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
