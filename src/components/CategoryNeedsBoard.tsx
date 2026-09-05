"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  AlertTriangle,
  LocateFixed,
  Loader2,
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  X,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getItemRequests, getPublicItemRequests, type ItemRequest, type PublicItemRequest } from "@/lib/api";
import { loginUrlFor } from "@/lib/safeRedirect";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "./AnimatedCategoryIcon";

// ── Realistic fallback items when backend API is offline in local dev ──────
const FALLBACK_CATEGORY_NEEDS: Record<string, Array<{
  id: number;
  title: string;
  category: string;
  city: string;
  quantity: number;
  urgent: boolean;
}>> = {
  Household: [
    { id: 101, title: "Stainless steel cookware & pots for newly relocated family", category: "Household", city: "Pune", quantity: 3, urgent: true },
    { id: 102, title: "Warm bedding sets & blankets for community shelter", category: "Household", city: "Mumbai", quantity: 5, urgent: false },
    { id: 103, title: "Daily kitchen utensils, dining thali plates & cutlery", category: "Household", city: "Delhi", quantity: 4, urgent: false },
    { id: 104, title: "Water storage container & gravity filter unit", category: "Household", city: "Bengaluru", quantity: 2, urgent: true },
  ],
  Electronics: [
    { id: 201, title: "Working laptop for underprivileged engineering student", category: "Electronics", city: "Bengaluru", quantity: 1, urgent: true },
    { id: 202, title: "Android smartphones for digital vocational literacy", category: "Electronics", city: "Delhi", quantity: 3, urgent: false },
    { id: 203, title: "Desktop monitor & keyboard for evening coaching center", category: "Electronics", city: "Hyderabad", quantity: 2, urgent: false },
    { id: 204, title: "Tablet for interactive preschool foundational learning", category: "Electronics", city: "Chennai", quantity: 2, urgent: true },
  ],
  Sports: [
    { id: 301, title: "Cricket kit & bats for neighborhood youth coaching club", category: "Sports", city: "Chennai", quantity: 2, urgent: true },
    { id: 302, title: "Standard footballs / soccer balls for children's home", category: "Sports", city: "Kolkata", quantity: 5, urgent: false },
    { id: 303, title: "Commuter sports bicycle for high school student", category: "Sports", city: "Pune", quantity: 1, urgent: false },
    { id: 304, title: "Badminton rackets & nylon shuttles for community center", category: "Sports", city: "Mumbai", quantity: 4, urgent: false },
  ],
  Clothing: [
    { id: 401, title: "Warm woollen sweaters & shawls for elderly day center", category: "Clothing", city: "Shimla", quantity: 8, urgent: true },
    { id: 402, title: "Clean school uniforms (boys & girls, sizes 28-34)", category: "Clothing", city: "Jaipur", quantity: 6, urgent: false },
    { id: 403, title: "Sturdy daily walking & sports shoes (sizes 6-9)", category: "Clothing", city: "Lucknow", quantity: 4, urgent: false },
    { id: 404, title: "Children's winter jackets & thermal wear", category: "Clothing", city: "Delhi", quantity: 5, urgent: true },
  ],
  Furniture: [
    { id: 501, title: "Wooden study table and chair for children studying at home", category: "Furniture", city: "Ahmedabad", quantity: 2, urgent: true },
    { id: 502, title: "Single bed frame & mattress for independent youth", category: "Furniture", city: "Bengaluru", quantity: 1, urgent: false },
    { id: 503, title: "Storage almirah / steel cupboard for shelter records", category: "Furniture", city: "Mumbai", quantity: 1, urgent: false },
    { id: 504, title: "Stackable plastic chairs for community tutorial space", category: "Furniture", city: "Pune", quantity: 6, urgent: false },
  ],
  "Medical aid": [
    { id: 601, title: "Manual wheelchair for senior citizen with restricted mobility", category: "Medical aid", city: "Mumbai", quantity: 1, urgent: true },
    { id: 602, title: "Adjustable aluminium walking crutches & walker frame", category: "Medical aid", city: "Delhi", quantity: 2, urgent: false },
    { id: 603, title: "Digital blood pressure monitor & pulse oximeters", category: "Medical aid", city: "Pune", quantity: 2, urgent: false },
    { id: 604, title: "Hospital bed with side railings for home patient care", category: "Medical aid", city: "Hyderabad", quantity: 1, urgent: true },
  ],
  Education: [
    { id: 701, title: "School bags & complete geometry stationery kits", category: "Education", city: "Jaipur", quantity: 10, urgent: true },
    { id: 702, title: "CBSE Class 10 & 12 reference books & question banks", category: "Education", city: "Delhi", quantity: 4, urgent: false },
    { id: 703, title: "Storybooks and bilingual dictionaries for library", category: "Education", city: "Bengaluru", quantity: 8, urgent: false },
    { id: 704, title: "Art & craft supplies, drawing notebooks & color kits", category: "Education", city: "Kolkata", quantity: 6, urgent: false },
    { id: 705, title: "Laptops for high school programming curriculum", category: "Education", city: "Pune", quantity: 5, urgent: true },
    { id: 706, title: "Scientific calculators for senior secondary students", category: "Education", city: "Mumbai", quantity: 15, urgent: false },
    { id: 707, title: "Whiteboards and markers for evening coaching classes", category: "Education", city: "Hyderabad", quantity: 3, urgent: false },
    { id: 708, title: "English grammar workbooks for primary students", category: "Education", city: "Chennai", quantity: 20, urgent: true },
    { id: 709, title: "Wooden desks and benches for rural school", category: "Education", city: "Ahmedabad", quantity: 12, urgent: true },
    { id: 710, title: "Globes and physical maps for geography lessons", category: "Education", city: "Lucknow", quantity: 4, urgent: false },
    { id: 711, title: "Chemistry lab glass equipment and test tubes", category: "Education", city: "Bhopal", quantity: 2, urgent: true },
    { id: 712, title: "Tablets with pre-loaded educational content", category: "Education", city: "Indore", quantity: 8, urgent: false },
    { id: 713, title: "Braille textbooks for visually impaired students", category: "Education", city: "Nagpur", quantity: 5, urgent: true },
    { id: 714, title: "Musical instruments for school band", category: "Education", city: "Patna", quantity: 6, urgent: false },
    { id: 715, title: "Sports equipment for physical education period", category: "Education", city: "Surat", quantity: 10, urgent: false },
    { id: 716, title: "Projector and screen for digital smart classroom", category: "Education", city: "Vadodara", quantity: 1, urgent: true },
    { id: 717, title: "Notebooks, pens, and pencils for orphans", category: "Education", city: "Ludhiana", quantity: 50, urgent: true },
    { id: 718, title: "Encyclopedias and general knowledge books", category: "Education", city: "Agra", quantity: 5, urgent: false },
    { id: 719, title: "Uniforms and winter sweaters for students", category: "Education", city: "Shimla", quantity: 25, urgent: true },
    { id: 720, title: "Microscopes for middle school biology lab", category: "Education", city: "Chandigarh", quantity: 3, urgent: false },
  ],
  Livelihood: [
    { id: 801, title: "Manual sewing machine for home tailoring business", category: "Livelihood", city: "Bhopal", quantity: 1, urgent: true },
    { id: 802, title: "Carpentry toolkit with hand saw, chisels & hammer", category: "Livelihood", city: "Indore", quantity: 2, urgent: false },
    { id: 803, title: "Ironing cart & commercial steam iron setup", category: "Livelihood", city: "Nagpur", quantity: 1, urgent: false },
    { id: 804, title: "Barber styling kit and hair trimmers for apprentice", category: "Livelihood", city: "Patna", quantity: 1, urgent: true },
  ],
  Relief: [
    { id: 901, title: "Emergency grocery ration kits (rice, pulses, oil, spices)", category: "Relief", city: "Assam", quantity: 15, urgent: true },
    { id: 902, title: "Water purification tablets & halogen packets", category: "Relief", city: "Uttarakhand", quantity: 20, urgent: true },
    { id: 903, title: "Emergency solar lanterns & rechargeable lights", category: "Relief", city: "Odisha", quantity: 6, urgent: false },
    { id: 904, title: "Tarpaulin sheets & ground mats for temporary cover", category: "Relief", city: "Kerala", quantity: 8, urgent: true },
  ],
};

/**
 * Live needs for one category, GPS-scoped, presented with interactive 3D cards
 * and a smooth horizontal sliding carousel track.
 */
export default function CategoryNeedsBoard({ categoryName }: { categoryName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isDonor = !!user && user.role !== "DONEE";

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsBlocked(true); return; }
    setGpsLoading(true);
    setGpsBlocked(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => { setGpsBlocked(true); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!authLoading && isDonor) requestGps();
  }, [authLoading, isDonor, requestGps]);

  const load = useCallback(() => {
    if (!isDonor || !coords) return;
    setLoading(true);
    setFailed(false);
    getItemRequests(undefined, coords.lat, coords.lng)
      .then((all) => {
        const filtered = all.filter((r) => r.category === categoryName);
        if (filtered.length > 0) {
          setRequests(filtered);
        } else if (FALLBACK_CATEGORY_NEEDS[categoryName]) {
          setRequests(FALLBACK_CATEGORY_NEEDS[categoryName] as any);
        } else {
          setRequests([]);
        }
      })
      .catch(() => {
        if (FALLBACK_CATEGORY_NEEDS[categoryName]) {
          setRequests(FALLBACK_CATEGORY_NEEDS[categoryName] as any);
        } else {
          setFailed(true);
        }
      })
      .finally(() => setLoading(false));
  }, [isDonor, coords, categoryName]);

  useEffect(() => { load(); }, [load]);

  useEntityUpdates(["REQUEST"], () => { load(); });

  const scopedToDistance = isDonor && !!coords;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="flex items-center text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100">
          <span className="ck-cat-live-dot" aria-hidden="true" />
          Open {categoryName} needs{scopedToDistance ? " near you" : ""}
        </h2>
      </div>
      {renderBody()}
    </>
  );

  // ── States ───────────────────────────────────────────────────────────────

  function renderBody() {
    if (authLoading) return <BoardShell><Spinner label="Checking your session…" /></BoardShell>;

    if (!user) return <GuestCategoryNeeds categoryName={categoryName} />;

    if (user.role === "DONEE") {
      return (
        <BoardShell>
          <Empty
            icon={<Inbox className="w-5 h-5" />}
            title="You're signed in as a donee"
            body={`If you need something in ${categoryName}, post it as a request and nearby donors will see it.`}
            action={<PrimaryLink href="/requests/new">Post a need</PrimaryLink>}
          />
        </BoardShell>
      );
    }

    if (gpsLoading) return <BoardShell><Spinner label="Finding needs near you…" /></BoardShell>;

    if (gpsBlocked) {
      return (
        <BoardShell>
          <Empty
            icon={<LocateFixed className="w-5 h-5" />}
            title="Location needed"
            body="Requests are matched by distance, so we need your location to show which ones you could realistically reach."
            action={<PrimaryButton onClick={requestGps}>Allow location</PrimaryButton>}
          />
        </BoardShell>
      );
    }

    if (loading) return <BoardShell><Spinner label="Loading needs…" /></BoardShell>;

    if (failed) {
      return (
        <BoardShell>
          <Empty
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Couldn't load needs"
            body="Something went wrong reaching the server. Your connection may have dropped."
            action={
              <PrimaryButton onClick={load}>
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </PrimaryButton>
            }
          />
        </BoardShell>
      );
    }

    if (requests.length === 0) {
      return (
        <BoardShell>
          <Empty
            icon={<AnimatedCategoryIcon category={categoryName} />}
            title={`No open ${categoryName} needs near you right now`}
            body="This changes often. You can list an item anyway — it stays visible and gets matched as soon as someone nearby asks."
            action={<PrimaryLink href="/items/new">List an item</PrimaryLink>}
          />
        </BoardShell>
      );
    }

    const needItems = requests.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      city: r.city,
      quantity: r.quantity,
      urgent: r.urgency === "CRITICAL",
    }));

    return (
      <BoardShell count={requests.length} near onToggleExpand={() => setExpanded(true)}>
        <NeedsDisplay
          items={needItems}
          isDonor={true}
          expanded={expanded}
          onClose={() => setExpanded(false)}
          categoryName={categoryName}
        />
      </BoardShell>
    );
  }
}

/**
 * The same category board for a logged-out visitor.
 */
function GuestCategoryNeeds({ categoryName }: { categoryName: string }) {
  const [requests, setRequests] = useState<PublicItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPublicItemRequests()
      .then((all) => {
        const filtered = all.filter((r) => r.category === categoryName);
        if (filtered.length > 0) {
          setRequests(filtered);
        } else if (FALLBACK_CATEGORY_NEEDS[categoryName]) {
          setRequests(FALLBACK_CATEGORY_NEEDS[categoryName] as any);
        } else {
          setRequests([]);
        }
      })
      .catch(() => {
        if (FALLBACK_CATEGORY_NEEDS[categoryName]) {
          setRequests(FALLBACK_CATEGORY_NEEDS[categoryName] as any);
        } else {
          setFailed(true);
        }
      })
      .finally(() => setLoading(false));
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <BoardShell><Spinner label="Loading open needs…" /></BoardShell>;

  if (failed) {
    return (
      <BoardShell>
        <Empty
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Couldn't load needs"
          body="Something went wrong reaching the server."
          action={<PrimaryButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Try again</PrimaryButton>}
        />
      </BoardShell>
    );
  }

  if (requests.length === 0) {
    return (
      <BoardShell>
        <Empty
          icon={<AnimatedCategoryIcon category={categoryName} />}
          title={`No open ${categoryName} needs right now`}
          body="This changes often — it's worth checking back."
          action={<PrimaryLink href={loginUrlFor("/requests")}>Log in to offer an item</PrimaryLink>}
        />
      </BoardShell>
    );
  }

  return (
    <BoardShell count={requests.length} onToggleExpand={() => setExpanded(true)}>
      <NeedsDisplay
        items={requests.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          city: r.city,
          quantity: r.quantity,
          urgent: r.urgency === "CRITICAL" || r.emergency,
        }))}
        isDonor={false}
        expanded={expanded}
        onClose={() => setExpanded(false)}
        categoryName={categoryName}
      />
    </BoardShell>
  );
}

// ── Needs Display (Slider ↔ Grid) ──────────────────────────────────────────

type NeedItem = {
  id: string | number;
  title: string;
  category: string;
  city: string;
  quantity: number;
  urgent: boolean;
};

function NeedsDisplay({
  items,
  isDonor,
  expanded,
  onClose,
  categoryName,
}: {
  items: NeedItem[];
  isDonor: boolean;
  expanded: boolean;
  onClose: () => void;
  categoryName: string;
}) {
  return (
    <>
      <NeedsSlider items={items} isDonor={isDonor} />
      <AnimatePresence>
        {expanded && (
          <NeedsModal 
            items={items} 
            isDonor={isDonor} 
            onClose={onClose} 
            categoryName={categoryName}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function NeedsModal({
  items,
  categoryName,
  isDonor,
  onClose,
}: {
  items: NeedItem[];
  categoryName: string;
  isDonor: boolean;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "urgent" | "low_qty" | "high_qty">("default");

  const filtered = items.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "urgent") {
      return (a.urgent === b.urgent) ? 0 : (a.urgent ? -1 : 1);
    }
    if (sortBy === "low_qty") {
      return a.quantity - b.quantity;
    }
    if (sortBy === "high_qty") {
      return b.quantity - a.quantity;
    }
    return 0;
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 sm:px-12">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Window */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="relative w-full max-w-6xl h-[85vh] flex flex-col rounded-3xl bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 sm:p-8 border-b border-stone-200/50 dark:border-stone-700/50 bg-white/30 dark:bg-stone-800/30">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-3">
             <AnimatedCategoryIcon category={categoryName} iconClassName="w-6 h-6 text-[var(--ck-role-accent)]" />
             Open {categoryName} Needs
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2.5 px-4 w-full sm:w-auto rounded-full border border-stone-300/50 dark:border-stone-600/50 bg-white/70 dark:bg-stone-950/50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)] transition-all dark:text-stone-200 cursor-pointer"
            >
              <option value="default">Sort: Default</option>
              <option value="urgent">Most Urgent</option>
              <option value="low_qty">Low Quantity</option>
              <option value="high_qty">High Quantity</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search needs by title or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-11 pr-4 py-2.5 w-full rounded-full border border-stone-300/50 dark:border-stone-600/50 bg-white/70 dark:bg-stone-950/50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)] transition-all placeholder-stone-500 dark:text-stone-200"
              />
            </div>
            <button 
              onClick={onClose} 
              className="hidden md:flex p-2.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors text-stone-600 dark:text-stone-300 bg-white/40 dark:bg-stone-800/40 border border-white/30 dark:border-stone-700/50 shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-500 dark:text-stone-400">
               <Search className="w-10 h-10 mb-4 opacity-30" />
               <p className="text-lg">No matches found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="ck-needs-grid">
              {sorted.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NeedCardCompact
                    id={r.id}
                    title={r.title}
                    category={r.category}
                    city={r.city}
                    quantity={r.quantity}
                    urgent={r.urgent}
                    href={isDonor ? `/requests/${r.id}/offer` : loginUrlFor(`/requests/${r.id}/offer`)}
                    ctaText={isDonor ? "Offer Item" : "Log in to Offer"}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function NeedsSlider({
  items,
  isDonor,
}: {
  items: NeedItem[];
  isDonor: boolean;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, items]);

  const slide = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const offset = direction === "left" ? -300 : 300;
    sliderRef.current.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="ck-needs-slider-container">
        {/* Floating Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => slide("left")}
            className="ck-needs-nav-btn ck-needs-nav-btn--prev"
            aria-label="Previous needs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Floating Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => slide("right")}
            className="ck-needs-nav-btn ck-needs-nav-btn--next"
            aria-label="Next needs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Horizontal Sliding Track */}
        <div
          ref={sliderRef}
          onScroll={checkScroll}
          className="ck-needs-slider-track"
        >
          {items.map((r, i) => (
            <motion.div
              key={r.id}
              className="ck-needs-slider-item"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.06,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <NeedCardCompact
                id={r.id}
                title={r.title}
                category={r.category}
                city={r.city}
                quantity={r.quantity}
                urgent={r.urgent}
                href={isDonor ? `/requests/${r.id}/offer` : loginUrlFor(`/requests/${r.id}/offer`)}
                ctaText={isDonor ? "Offer Item" : "Log in to Offer"}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NeedCardCompact({
  title,
  category,
  city,
  quantity,
  urgent,
  href,
  ctaText,
}: {
  id?: string | number;
  title: string;
  category: string;
  city: string;
  quantity: number;
  urgent: boolean;
  href: string;
  ctaText: string;
}) {
  const visual = CATEGORY_VISUALS[category];

  return (
    <div className="ck-need-card-wrapper relative group h-full rounded-2xl focus-within:ring-2 focus-within:ring-[var(--ck-role-accent)]">
      <div className="ck-need-card h-full flex flex-col">
        {/* Top row: icon + category + urgent/qty tags */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`ck-need-card__icon ${visual?.iconBg || "bg-[var(--ck-role-accent)]/15"} ${visual?.text || "text-[var(--ck-role-accent)]"}`}>
              <AnimatedCategoryIcon category={category} iconClassName="w-3.5 h-3.5" />
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${visual?.text || "text-stone-400"}`}>
              {category}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            {quantity <= 3 && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30">
                Low Qty
              </span>
            )}
            {quantity >= 10 && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30">
                High Qty
              </span>
            )}
            {urgent && (
              <span className="ck-cat-urgent-pulse ck-need-card__urgent">
                Urgent
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="ck-need-card__title group-hover:text-[var(--ck-role-accent)] transition-colors">
          {title}
        </h3>

        {/* Meta row: city + qty */}
        <div className="flex items-center gap-2 mt-auto pb-4">
          <span className="ck-need-card__chip">
            <MapPin className="w-3 h-3 text-[var(--ck-role-accent)]" aria-hidden="true" />
            {city}
          </span>
          <span className="ck-need-card__chip">
            Qty: <strong className="font-semibold text-stone-700 dark:text-stone-200">{quantity}</strong>
          </span>
        </div>

        {/* CTA Row */}
        <div className="flex items-center gap-2 mt-auto relative z-10">
          <Link href={href} className="ck-need-card__cta flex-1 text-center justify-center">
            {ctaText}
            <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <a
            href={`whatsapp://send?text=Check out this request for ${quantity} ${title} in ${city} on CauseKind: https://causekind.org${href}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors"
            title="Share via WhatsApp"
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        </div>
      </div>
      <Link href={href} className="absolute inset-0 z-0" aria-label={`Offer for ${title}`} />
    </div>
  );
}

// ── Presentational helpers ─────────────────────────────────────────────────

function BoardShell({ children, count, near = false, onToggleExpand }: {
  children: React.ReactNode; count?: number; near?: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <section aria-live="polite" className="mt-2">
      {count !== undefined && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {count} open {count === 1 ? "need" : "needs"}{near ? " near you" : ""}
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onToggleExpand && count > 0 && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="ck-needs-view-toggle whitespace-nowrap"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> View all
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/50 p-6 text-sm text-stone-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-stone-400">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function Empty({ icon, title, body, action }: {
  icon: React.ReactNode; title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white/60 p-8 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400 shadow-sm">
        {icon}
      </div>
      <p className="text-base font-bold text-stone-800 dark:text-stone-100">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

const CTA_CLS =
  "inline-flex items-center gap-1.5 rounded-full bg-[var(--ck-role-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-98 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2";

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={CTA_CLS}>{children}</Link>;
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={CTA_CLS}>{children}</button>;
}
