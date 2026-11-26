"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "@/components/AppLink";
import { NewRequestLink } from "./NewRequestLink";
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
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getItemRequests, getPublicItemRequests, getNgoDrives, type ItemRequest, type PublicItemRequest, type PublicNgoDrive } from "@/lib/api";
import { mapNgoCategoryToRequestCategory } from "@/features/ngo-drives/ngoDriveFilters";
import { loginUrlFor } from "@/lib/safeRedirect";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "./AnimatedCategoryIcon";
import { useTranslations } from "next-intl";
import { UiText, useUiText } from "@/components/UiText";
import { useCategoryLabel } from "@/lib/categoryLabel";

/** Live NGO drives in this category, as board items (same category mapping as /requests). */
async function loadCategoryDrives(categoryName: string): Promise<NeedItem[]> {
  const drives: PublicNgoDrive[] = await getNgoDrives().catch(() => []);
  return drives
    .filter((d) => d.status === "LIVE" && mapNgoCategoryToRequestCategory(d.category) === categoryName)
    .map((d) => {
      const urgency = (d.urgency ?? "").toUpperCase();
      return {
        id: `drive-${d.id}`,
        title: d.title,
        category: categoryName,
        city: d.locationCity || d.locationArea || "",
        quantity: d.stillNeeded ?? Math.max(0, d.quantityNeeded - d.quantityReceived),
        urgent: urgency === "CRITICAL" || urgency === "URGENT",
        detailHref: `/drives/${d.id}`,
        offerHref: `/drives/${d.id}/give`,
        kind: "ngo" as const,
        who: d.ngoOrganizationName,
        itemName: d.itemName,
        needed: d.quantityNeeded,
        received: d.quantityReceived,
        neededBy: d.neededBy,
      };
    });
}

/**
 * Live needs for one category, GPS-scoped, presented with interactive 3D cards
 * and a smooth horizontal sliding carousel track.
 */
export default function CategoryNeedsBoard({ categoryName }: { categoryName: string }) {
  // categoryName is the category ID (filters, icons, links); only `category` below is display text.
  const ui = useUiText();
  const t = useTranslations("categoryBoard");
  const category = useCategoryLabel()(categoryName);
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [drives, setDrives] = useState<NeedItem[]>([]);
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
      // Coarse, cached, bounded — same reasoning as RequestsClient: this board
      // sorts by distance between cities, so a precise fix buys nothing and
      // costs seconds.
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 }
    );
  }, []);

  /**
   * Loads without waiting for a GPS fix — coordinates only change the ORDER
   * (see ItemRequestService.getApproved), so blocking on them put a permission
   * prompt in front of a ~150ms request, and a donor who denied location saw
   * an empty category forever.
   */
  const load = useCallback(() => {
    if (!isDonor) return;
    setLoading(true);
    setFailed(false);
    Promise.all([getItemRequests(undefined, coords?.lat, coords?.lng), loadCategoryDrives(categoryName)])
      .then(([all, driveItems]) => {
        const filtered = all.filter((r) => r.category === categoryName);
        setRequests(filtered);
        setDrives(driveItems);
      })
      .catch(() => {
        setFailed(true);
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
          {scopedToDistance ? t("openNeedsNear", { category }) : t("openNeeds", { category })}
        </h2>
      </div>
      {isDonor && <div className="flex flex-wrap items-center gap-2 py-2">
        <button type="button" onClick={requestGps} disabled={gpsLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-3 text-xs font-semibold disabled:opacity-50 dark:border-stone-700">
          <LocateFixed className="h-4 w-4" />
          {gpsLoading ? ui("Finding location…") : ui("Use GPS to sort nearby")}
        </button>
        {gpsBlocked && <p role="status" className="text-xs text-stone-500"><UiText>Location unavailable. All needs remain available.</UiText></p>}
      </div>}
      {renderBody()}
    </>
  );

  // ── States ───────────────────────────────────────────────────────────────

  function renderBody() {
    if (authLoading) return <BoardShell><Spinner label={ui("Checking your session…")} /></BoardShell>;

    if (!user) return <GuestCategoryNeeds categoryName={categoryName} />;

    if (user.role === "DONEE") {
      return (
        <BoardShell>
          <Empty
            icon={<Inbox className="w-5 h-5" />}
            title={ui("You're signed in as a donee")}
            body={t("doneeBody", { category })}
            action={<PrimaryNewRequestLink><UiText>Post a need</UiText></PrimaryNewRequestLink>}
          />
        </BoardShell>
      );
    }

    if (loading) return <BoardShell><Spinner label={ui("Loading needs…")} /></BoardShell>;

    if (failed) {
      return (
        <BoardShell>
          <Empty
            icon={<AlertTriangle className="w-5 h-5" />}
            title={ui("Couldn't load needs")}
            body={ui("Something went wrong reaching the server. Your connection may have dropped.")}
            action={
              <PrimaryButton onClick={load}>
                <RefreshCw className="w-3.5 h-3.5" /> <UiText>Try again</UiText>
              </PrimaryButton>
            }
          />
        </BoardShell>
      );
    }

    if (requests.length === 0 && drives.length === 0) {
      return (
        <BoardShell>
          <Empty
            icon={<AnimatedCategoryIcon category={categoryName} />}
            title={t("noneNow", { category })}
            body={ui("This changes often. You can list an item anyway — it stays visible and gets matched as soon as someone nearby asks.")}
            action={<PrimaryLink href="/items/new"><UiText>List an item</UiText></PrimaryLink>}
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
      kind: r.requesterType === "NGO" ? "ngo" : "person",
      who: r.requesterType === "NGO" ? r.organizationName : r.doneeName?.split(" ")[0],
      needed: r.quantity,
      received: r.fulfilledQuantity,
    } as NeedItem)).concat(drives);

    return (
      <BoardShell count={needItems.length} near={scopedToDistance} onToggleExpand={() => setExpanded(true)}>
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
  const ui = useUiText();
  const t = useTranslations("categoryBoard");
  const category = useCategoryLabel()(categoryName);
  const [requests, setRequests] = useState<PublicItemRequest[]>([]);
  const [drives, setDrives] = useState<NeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    Promise.all([getPublicItemRequests(), loadCategoryDrives(categoryName)])
      .then(([all, driveItems]) => {
        const filtered = all.filter((r) => r.category === categoryName);
        setRequests(filtered);
        setDrives(driveItems);
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <BoardShell><Spinner label={ui("Loading open needs…")} /></BoardShell>;

  if (failed) {
    return (
      <BoardShell>
        <Empty
          icon={<AlertTriangle className="w-5 h-5" />}
          title={ui("Couldn't load needs")}
          body={ui("Something went wrong reaching the server.")}
          action={<PrimaryButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> <UiText>Try again</UiText></PrimaryButton>}
        />
      </BoardShell>
    );
  }

  if (requests.length === 0 && drives.length === 0) {
    return (
      <BoardShell>
        <Empty
          icon={<AnimatedCategoryIcon category={categoryName} />}
          title={t("noneNow", { category })}
          body={ui("This changes often — it's worth checking back.")}
          action={<PrimaryLink href={loginUrlFor("/requests")}><UiText>Log in to offer an item</UiText></PrimaryLink>}
        />
      </BoardShell>
    );
  }

  return (
    <BoardShell count={requests.length + drives.length} onToggleExpand={() => setExpanded(true)}>
      <NeedsDisplay
        items={requests.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          city: r.city,
          quantity: r.quantity,
          urgent: r.urgency === "CRITICAL" || r.emergency,
          kind: r.requesterType === "NGO" ? "ngo" : "person",
          who: r.requesterType === "NGO" ? r.organizationName : r.doneeFirstName,
        } as NeedItem)).concat(drives)}
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
  /** Set for NGO drives; donee requests use /requests/{id}. */
  detailHref?: string;
  offerHref?: string;
  /** Who asked: an NGO (drive or NGO request) or an individual donee. */
  kind?: "ngo" | "person";
  /** NGO name, or the donee's first name. */
  who?: string | null;
  itemName?: string | null;
  needed?: number;
  received?: number;
  neededBy?: string | null;
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
  const ui = useUiText();
  const t = useTranslations("categoryBoard");
  const category = useCategoryLabel()(categoryName);
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
             {t("modalTitle", { category })}
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2.5 px-4 w-full sm:w-auto rounded-full border border-stone-300/50 dark:border-stone-600/50 bg-white/70 dark:bg-stone-950/50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)] transition-all dark:text-stone-200 cursor-pointer"
            >
              <option value="default">{ui("Sort: Default")}</option>
              <option value="urgent">{ui("Most Urgent")}</option>
              <option value="low_qty">{ui("Low Quantity")}</option>
              <option value="high_qty">{ui("High Quantity")}</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" aria-hidden="true" />
              <input
                type="text"
                placeholder={ui("Search needs by title or city...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-11 pr-4 py-2.5 w-full rounded-full border border-stone-300/50 dark:border-stone-600/50 bg-white/70 dark:bg-stone-950/50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)] transition-all placeholder-stone-500 dark:text-stone-200"
              />
            </div>
            <button 
              onClick={onClose} 
              className="hidden md:flex p-2.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors text-stone-600 dark:text-stone-300 bg-white/40 dark:bg-stone-800/40 border border-white/30 dark:border-stone-700/50 shrink-0"
              aria-label={ui("Close modal")}
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
               <p className="text-lg">{t("noMatches", { query: searchQuery })}</p>
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
                    detailHref={r.detailHref}
                    need={r}
                    href={(o => isDonor ? o : loginUrlFor(o))(r.offerHref ?? `/requests/${r.id}/offer`)}
                    ctaText={r.offerHref ? (isDonor ? ui("Give to this drive") : ui("Log in to give")) : (isDonor ? ui("Offer Item") : ui("Log in to Offer"))}
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
  const ui = useUiText();
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
            aria-label={ui("Previous needs")}
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
            aria-label={ui("Next needs")}
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
                detailHref={r.detailHref}
                need={r}
                href={(o => isDonor ? o : loginUrlFor(o))(r.offerHref ?? `/requests/${r.id}/offer`)}
                ctaText={r.offerHref ? (isDonor ? ui("Give to this drive") : ui("Log in to give")) : (isDonor ? ui("Offer Item") : ui("Log in to Offer"))}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NeedCardCompact({
  id,
  title,
  category,
  city,
  quantity,
  urgent,
  href,
  ctaText,
  detailHref,
  need,
}: {
  id?: string | number;
  detailHref?: string;
  need?: NeedItem;
  title: string;
  category: string;
  city: string;
  quantity: number;
  urgent: boolean;
  href: string;
  ctaText: string;
}) {
  const ui = useUiText();
  const t = useTranslations("categoryBoard");
  const categoryLabel = useCategoryLabel()(category);
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
              {categoryLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            {quantity <= 3 && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30">
                <UiText>Low Qty</UiText>
              </span>
            )}
            {quantity >= 10 && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30">
                <UiText>High Qty</UiText>
              </span>
            )}
            {urgent && (
              <span className="ck-cat-urgent-pulse ck-need-card__urgent">
                <UiText>Urgent</UiText>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <p className="ck-need-card__title group-hover:text-[var(--ck-role-accent)] transition-colors">
          {title}
        </p>

        {need?.kind && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={need.kind === "ngo"
              ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"}>
              {need.kind === "ngo" ? <UiText>NGO</UiText> : <UiText>Individual</UiText>}
            </span>
            {need.who && <span className="truncate text-stone-600 dark:text-stone-300">{need.who}</span>}
          </div>
        )}
        {need?.itemName && (
          <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">
            <UiText>Item:</UiText> <span className="font-semibold text-stone-700 dark:text-stone-200">{need.itemName}</span>
          </p>
        )}
        {need?.needed != null && need.needed > 0 && need.received != null && (
          <div className="mb-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div className={`h-full rounded-full ${need.kind === "ngo" ? "bg-emerald-600" : "bg-blue-600"}`}
                style={{ width: `${Math.min(100, (need.received / need.needed) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {need.received} / {need.needed} <UiText>received</UiText>
            </p>
          </div>
        )}
        {need?.neededBy && (
          <p className="mb-2 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            <UiText>Needed by</UiText> {new Date(need.neededBy).toLocaleDateString("en-IN")}
          </p>
        )}

        {/* Meta row: city + qty */}
        <div className="flex items-center gap-2 mt-auto pb-4">
          <span className="ck-need-card__chip">
            <MapPin className="w-3 h-3 text-[var(--ck-role-accent)]" aria-hidden="true" />
            {city}
          </span>
          <span className="ck-need-card__chip">
            {t.rich("qty", { count: quantity, strong: (chunks) => <strong className="font-semibold text-stone-700 dark:text-stone-200">{chunks}</strong> })}
          </span>
        </div>

        {/* CTA Row */}
        <div className="flex items-center gap-2 mt-auto relative z-10">
          <Link href={href} aria-label={`${ctaText}: ${title}`} className="ck-need-card__cta flex-1 text-center justify-center">
            {ctaText}
            <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>
      {/* The card body opens the request's own page (a real, crawlable link);
          the CTA button above still goes straight to the offer flow. */}
      <Link href={detailHref ?? (id != null ? `/requests/${id}` : href)} className="absolute inset-0 z-0" aria-label={id != null ? title : t("offerFor", { title })} />
    </div>
  );
}

// ── Presentational helpers ─────────────────────────────────────────────────

function BoardShell({ children, count, near = false, onToggleExpand }: {
  children: React.ReactNode; count?: number; near?: boolean;
  onToggleExpand?: () => void;
}) {
  const t = useTranslations("categoryBoard");
  return (
    <section aria-live="polite" className="mt-2">
      {count !== undefined && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {near ? t("countNear", { count }) : t("count", { count })}
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onToggleExpand && count > 0 && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="ck-needs-view-toggle whitespace-nowrap"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> <UiText>View all</UiText>
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
    <div className="flex min-h-[22rem] items-center justify-center gap-2 rounded-2xl border border-stone-200/80 bg-white/50 p-6 text-sm text-stone-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-stone-400">
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

/** Same styling as PrimaryLink, but checks the donee's need-profile first. */
function PrimaryNewRequestLink({ children }: { children: React.ReactNode }) {
  return <NewRequestLink href="/requests/new" className={CTA_CLS}>{children}</NewRequestLink>;
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={CTA_CLS}>{children}</button>;
}
