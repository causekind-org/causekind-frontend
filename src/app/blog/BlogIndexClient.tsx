"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryDropdown } from "@/components/blog/CategoryDropdown";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { blogPosts, insiderTips } from "../../data/blogData";
import { getBlogTranslation, getInsiderTipTranslation, preloadBlogTranslations } from "@/data/blogTranslations";
import { AnimatedWrapper } from "../components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "../components/StaggerContainer";
import { Search, X, BookOpen } from "lucide-react";
import { getRecentActivity, getPositiveUpdate, type RecentActivity } from "@/lib/api";
import { searchBlogPosts } from "@/lib/blogSearch";
import { formatReadTime, formatPublishedDate } from "@/lib/blogMeta";
import { Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Categories are derived from blogPosts itself, so adding a new post with a
// new category automatically shows up here — no manual list to maintain.
const ALL_CATEGORIES = "All";

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MINUTE${mins > 1 ? "S" : ""} AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} HOUR${hrs > 1 ? "S" : ""} AGO`;
  return `${Math.floor(hrs / 24)} DAYS AGO`;
}

function activityToFeedItem(a: RecentActivity, i: number) {
  const text = a.type === "DONATION"
    ? `donated ₹${a.amount?.toLocaleString("en-IN") ?? ""} to "${a.campaignTitle}".`
    : `posted a new campaign: "${a.campaignTitle}".`;
  const name = a.type === "DONATION" ? `Donor from ${a.city || "India"}` : `${a.city || "India"} fundraiser`;
  return { id: i, time: timeAgo(new Date(Date.now() - i * 8 * 60000)), user: name, text };
}

function BlogListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");

  const locale = useLocale();
  const t = useTranslations("blog_page");

  // Cards show pre-translated static content (see scripts/generate-blog-translations.mjs),
  // fetched once per locale from public/blog-translations/<locale>.json (not
  // bundled into the JS build — 13 locales of translated article HTML is too
  // large to ship to every visitor or hand the compiler in one module graph).
  // getBlogTranslation/getInsiderTipTranslation below read synchronously from
  // that fetch's in-memory cache; this bump forces a re-render once it lands.
  const [, setTranslationsVersion] = useState(0);
  useEffect(() => {
    if (locale === "en") return;
    let cancelled = false;
    preloadBlogTranslations(locale).then(() => {
      if (!cancelled) setTranslationsVersion((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Category values themselves stay English internally (filtering/URLs
  // depend on them); only the label shown to the reader is translated, via
  // the first post carrying that category.
  const translatePost = (post: (typeof blogPosts)[number]) => {
    const translation = getBlogTranslation(locale, post.slug);
    return {
      title: translation?.title || post.title,
      description: translation?.description || post.description,
      category: translation?.category || post.category,
    };
  };
  const translateCategoryLabel = (category: string) => {
    if (category === ALL_CATEGORIES) return t("allCategories");
    const samplePost = blogPosts.find((p) => p.category === category);
    return (samplePost && getBlogTranslation(locale, samplePost.slug)?.category) || category;
  };
  const translateTip = (tip: (typeof insiderTips)[number]) => {
    const translation = getInsiderTipTranslation(locale, tip.slug);
    return {
      title: translation?.title || tip.title,
      description: translation?.description || tip.description,
    };
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || ALL_CATEGORIES);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [liveFeed, setLiveFeed] = useState<{ id: number; time: string; user: string; text: string }[]>([]);
  const [positiveUpdate, setPositiveUpdate] = useState<string | null>(null);

  // Category list is computed from the live blogPosts array — new posts with
  // a new category value appear here automatically.
  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(blogPosts.map((p) => p.category)))],
    []
  );

  // Keep the selected category in sync if the URL's ?category= changes
  // (e.g. navigating here from a category link on the reading page).
  useEffect(() => {
    setSelectedCategory(categoryFromUrl || ALL_CATEGORIES);
  }, [categoryFromUrl]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const query = category === ALL_CATEGORIES ? "" : `?category=${encodeURIComponent(category)}`;
    router.replace(`/blog${query}`, { scroll: false });
  };

  // Close the live-results dropdown when clicking outside the search box.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carousel state for Insider Tips section
  const [tipIndex, setTipIndex] = useState(0);
  const [tipDirection, setTipDirection] = useState(1); // 1 = forward, -1 = backward

  /**
   * One definition of the tip card, shared by the mobile carousel and the
   * desktop grid.
   *
   * <p>A plain function returning JSX, deliberately NOT a nested component: a
   * component declared inside a render body gets a fresh identity every render,
   * so React would unmount and remount the card — losing its animation state —
   * whenever anything else on this page changes. It closes over `translateTip`,
   * so it also cannot move to module scope.
   */
  const renderTipCard = (tip: (typeof insiderTips)[number]) => {
    const trTip = translateTip(tip);
    return (
      <div className="h-full bg-white dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 p-4 md:p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:bg-stone-50 dark:hover:bg-stone-900/50 hover:shadow-[0_15px_35px_rgba(30,58,96,0.03)] hover:-translate-y-1 transition-all duration-500">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <h3 className="font-bold text-base md:text-lg text-stone-900 dark:text-stone-100 mb-1.5 md:mb-2">
              {trTip.title}
            </h3>
            <p className="text-stone-600 dark:text-stone-400 text-xs md:text-sm leading-relaxed mb-3 md:mb-4">
              {trTip.description}
            </p>
          </div>
          <Link
            className="font-bold text-xs md:text-sm text-[#b04a15] dark:text-orange-400 flex items-center gap-1 hover:underline mt-auto group/link"
            href="/requests"
          >
            {t("viewInKindNeeds")}
          </Link>
        </div>
      </div>
    );
  };

  const goToTip = (next: number) => {
    setTipDirection(next > tipIndex ? 1 : -1);
    setTipIndex(next);
  };

  // Fetch real recent activity for live feed
  useEffect(() => {
    getRecentActivity()
      .then(data => {
        if (data.length > 0) {
          setLiveFeed(data.slice(0, 3).map(activityToFeedItem));
        } else {
          setLiveFeed([
            { id: 1, time: "RECENTLY", user: "CauseKind Community", text: "is growing - be the first donor in your area!" },
          ]);
        }
      })
      .catch(() => {
        setLiveFeed([
          { id: 1, time: "RECENTLY", user: "CauseKind Community", text: "is growing - be the first donor in your area!" },
        ]);
      });
  }, []);

  // Fetch the AI-generated positive spin on recent activity (refreshed
  // server-side on a schedule, not per-request — see PositiveUpdateService).
  // Silently keeps the widget's existing content if this fails or the
  // feature isn't configured (no GEMINI_API_KEY) — never a hard failure.
  useEffect(() => {
    getPositiveUpdate()
      .then((data) => setPositiveUpdate(data.text))
      .catch(() => {});
  }, []);

  // Cycle through live feed items
  useEffect(() => {
    if (liveFeed.length < 2) return;
    const interval = setInterval(() => {
      setLiveFeed((prev) => {
        const next = [...prev];
        const last = next.pop();
        if (last) next.unshift(last);
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [liveFeed.length]);

  // Category filtering happens first, then search relevance ranking runs on
  // top of it — the two combine rather than override each other.
  const categoryScopedPosts = selectedCategory === ALL_CATEGORIES
    ? blogPosts
    : blogPosts.filter((post) => post.category === selectedCategory);

  const filteredPosts = searchQuery.trim() === ""
    ? categoryScopedPosts
    : searchBlogPosts(categoryScopedPosts, searchQuery);

  // Instant-results dropdown: always searches the full catalog (ignores the
  // active category pill) so typing surfaces a result no matter what's
  // selected, then the user jumps straight to it.
  const liveSearchResults = searchBlogPosts(blogPosts, searchQuery, 6);

  // Schema.org Blog markup listing every post, so the blog index itself is
  // eligible for Google's Rich Results (mirrors the BlogPosting markup on
  // each post's own page).
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "CauseKind Blog",
    "url": "https://www.causekind.com/blog",
    "description": "Real impact, verified by the community. Discover stories of in-kind giving and change.",
    "publisher": {
      "@type": "Organization",
      "name": "CauseKind",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.causekind.com/logo-filled.webp",
      },
    },
    "blogPost": blogPosts.map((post) => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.description,
      "image": post.image.startsWith("http") ? post.image : `https://www.causekind.com${post.image}`,
      "author": { 
        "@type": "Person", 
        "name": post.author,
        "url": "https://www.causekind.com/about"
      },
      "datePublished": !isNaN(new Date(post.publishedDate).getTime())
        ? new Date(post.publishedDate).toISOString()
        : undefined,
      "url": `https://www.causekind.com/blog/${post.slug}`,
    })),
  };

  // pt-24 sat on top of the 3.5rem sticky header, so on a phone the badge
  // started ~150px down an otherwise empty screen. Scaled by breakpoint;
  // desktop keeps its original lead-in.
  return (
    <div className="pt-10 md:pt-16 lg:pt-24 pb-16 bg-[#faf8f5] dark:bg-[#0c0a09]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <div className="max-w-[1280px] mx-auto px-6">
        {/* Search & Header Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <AnimatedWrapper delay={0} duration={0.5} direction="up">
                <span className="inline-block py-1 px-3 bg-orange-100 dark:bg-orange-950/40 text-[#b04a15] dark:text-orange-400 rounded-lg font-bold text-xs uppercase tracking-wider mb-3">
                  {t("badge")}
                </span>
              </AnimatedWrapper>
              <AnimatedWrapper delay={0.1} duration={0.6} direction="up">
                <h1 className="font-extrabold text-3xl md:text-5xl text-stone-900 dark:text-stone-100 mb-3 tracking-tight">
                  {t("headline")}
                </h1>
              </AnimatedWrapper>
              <AnimatedWrapper delay={0.22} duration={0.6} direction="up">
                <p className="text-stone-600 dark:text-stone-400 text-base md:text-lg">
                  {t("subtitle")}
                </p>
              </AnimatedWrapper>
            </div>
            
            <AnimatedWrapper delay={0.3} duration={0.55} direction="left">
              <div ref={searchBoxRef} className="relative flex items-center gap-4 bg-white dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
                <LanguageSwitcher />
                <div className="relative flex items-center w-full">
                  <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input
                    className="pl-9 pr-8 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-full text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] transition-all w-full md:w-64"
                    placeholder={t("searchPlaceholder")}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsSearchFocused(false);
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label={t("clearSearch")}
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Live results dropdown — updates on every keystroke */}
                <AnimatePresence>
                  {isSearchFocused && searchQuery.trim() !== "" && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-4 right-4 md:left-auto md:w-80 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-30 overflow-hidden"
                    >
                      {liveSearchResults.length > 0 ? (
                        <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                          {liveSearchResults.map((post) => {
                            const tr = translatePost(post);
                            return (
                              <li key={post.slug}>
                                <Link
                                  href={`/blog/${post.slug}`}
                                  onClick={() => setIsSearchFocused(false)}
                                  className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                                >
                                  <Image
                                    src={post.image}
                                    alt={tr.title}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#b04a15] dark:text-orange-400 uppercase tracking-wide truncate">
                                      {tr.category}
                                    </p>
                                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
                                      {tr.title}
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="p-4 text-sm text-stone-500 dark:text-stone-400 text-center">
                          {t("noSearchResults", { query: searchQuery })}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AnimatedWrapper>
          </div>

          {/* Manifesto strip — recurring editorial pull-quote motif */}
          <AnimatedWrapper delay={0.15} duration={0.6} direction="up">
            <div className="border-y border-stone-200 dark:border-stone-800 py-6 mb-10 flex items-center gap-6">
              <span className="hidden sm:flex items-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-[#b04a15] dark:text-orange-400" strokeWidth={2} />
              </span>
              <p className="font-[family-name:--font-lora] italic text-xl md:text-2xl text-stone-700 dark:text-stone-300 leading-snug max-w-3xl">
                {t("manifesto")}
              </p>
            </div>
          </AnimatedWrapper>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Category Sidebar (vertical) — a shared-layout sliding indicator
                (Framer's layoutId/FLIP technique) marks the active item;
                only that small element repaints, not the list, so this
                stays cheap no matter how many categories exist. */}
            <AnimatedWrapper delay={0.35} duration={0.5} direction="up" className="w-full lg:w-56 flex-shrink-0">
              {/* Below lg the eight categories were a full-width stack that ate
                  most of a phone screen before a single post appeared. The
                  sticky sidebar is still the better desktop pattern, so it is
                  kept there rather than replaced everywhere. */}
              <div className="lg:hidden">
                <CategoryDropdown
                  categories={categories}
                  selected={selectedCategory}
                  onSelect={handleCategorySelect}
                  renderLabel={translateCategoryLabel}
                  label={t("categories")}
                />
              </div>
              <nav className="hidden lg:block lg:sticky lg:top-28 border-t border-stone-200 dark:border-stone-800">
                <p className="pt-4 pb-2 text-3xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  {t("categories")}
                </p>
                <div className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
                  {categories.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className={`group relative text-left py-2.5 pl-3 text-sm font-bold transition-colors cursor-pointer ${
                          isActive
                            ? "text-[#b04a15] dark:text-orange-400"
                            : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                        }`}
                      >
                        {isActive ? (
                          <motion.span
                            layoutId="category-pill"
                            className="absolute inset-y-0 left-0 w-0.5 bg-[#b04a15]"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        ) : (
                          <span className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors group-hover:bg-stone-300 dark:group-hover:bg-stone-700" />
                        )}
                        {translateCategoryLabel(category)}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </AnimatedWrapper>

            <div className="flex-1 min-w-0">
          {/* Featured Story Bento.
              Two columns on a phone: stacked full-width these two filled about
              two screens before a single post appeared. `gap-8` is a third of a
              phone's width once split in two, hence the smaller mobile gap. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-8">
            {/* Large Featured Card */}
            <AnimatedWrapper inView delay={0} duration={0.6} direction="up" className="min-w-0 md:col-span-8">
              {filteredPosts.length > 0 ? (
                (() => {
                  const featured = filteredPosts[0];
                  const tr = translatePost(featured);
                  return (
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="group block cursor-pointer overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 hover:shadow-[0_20px_50px_rgba(176,74,21,0.06)] transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors z-10"></div>
                        <Image
                          alt={tr.title}
                          fill
                          priority
                          sizes="(min-width: 768px) 66vw, 50vw"
                          className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                          src={featured.image}
                        />
                        <div className="absolute top-2 left-2 z-20 md:top-4 md:left-4">
                          <span className="bg-[#b04a15] text-white px-2 py-0.5 text-4xs rounded-lg font-bold uppercase tracking-wider shadow-sm md:px-3 md:py-1 md:text-xs">
                            {tr.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 md:p-8">
                        <p className="text-4xs md:text-3xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1.5 md:mb-3">
                          {tr.category} · {formatPublishedDate(featured.publishedDate, locale)}
                        </p>
                        <h2 className="font-extrabold text-base md:text-3xl text-stone-900 dark:text-stone-100 mb-1.5 md:mb-3 line-clamp-3 md:line-clamp-none group-hover:text-[#b04a15] dark:group-hover:text-orange-400 transition-colors leading-tight">
                          {tr.title}
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 text-xs md:text-base line-clamp-2 mb-3 md:mb-5 leading-relaxed">
                          {tr.description}
                        </p>
                        <div className="flex flex-col items-start gap-1.5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-orange-500 animate-pulse text-xs md:text-sm">🔥</span>
                            <span className="text-3xs md:text-xs text-orange-500 font-bold uppercase tracking-wider">
                              {t("featuredStory")}
                            </span>
                          </div>
                          <span className="text-[#b04a15] dark:text-orange-400 font-bold flex items-center gap-1 text-xs md:text-sm group-hover:translate-x-1 transition-transform">
                            {t("readStory")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })()
              ) : (
                <div className="bg-white dark:bg-stone-900/20 border border-stone-200 dark:border-stone-800 p-12 rounded-2xl text-center">
                  <p className="text-stone-500 dark:text-stone-400 font-medium">
                    {searchQuery.trim() !== "" && selectedCategory !== ALL_CATEGORIES
                      ? t("emptyNoMatchInCategory", { query: searchQuery, category: translateCategoryLabel(selectedCategory) })
                      : searchQuery.trim() !== ""
                        ? t("emptyNoMatch", { query: searchQuery })
                        : t("emptyNoCategory", { category: translateCategoryLabel(selectedCategory) })}
                  </p>
                  {selectedCategory !== ALL_CATEGORIES && (
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(ALL_CATEGORIES)}
                      className="mt-4 text-sm font-bold text-[#b04a15] dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      {t("viewAllCategories")}
                    </button>
                  )}
                </div>
              )}
            </AnimatedWrapper>

            {/* Live Impact Feed Sidebar */}
            <AnimatedWrapper inView delay={0.15} duration={0.6} direction="right" className="min-w-0 md:col-span-4 flex flex-col gap-3 md:gap-8">
              <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 dark:from-stone-900/30 dark:to-stone-950/20 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 p-3 md:p-6 rounded-2xl flex-1 relative overflow-hidden shadow-xs">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 md:mb-5">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="text-3xs md:text-xs uppercase tracking-widest text-[#b04a15] dark:text-orange-400 font-bold">
                        {t("liveFeedTitle")}
      </h3>
                    </div>
                    {positiveUpdate && (
                      <div className="flex items-start gap-2 mb-2.5 p-2 md:mb-4 md:p-3 rounded-xl bg-[#b04a15]/8 dark:bg-orange-400/10 border border-[#b04a15]/15 dark:border-orange-400/20">
                        <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#b04a15] dark:text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-3xs md:text-xs leading-[1.4] md:leading-relaxed text-stone-700 dark:text-stone-300 font-medium line-clamp-4 md:line-clamp-none">
                          {positiveUpdate}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 md:space-y-4">
                      {liveFeed.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`pl-2.5 py-1.5 md:pl-4 md:py-2 transition-all duration-500 border-l-2 ${
                            idx === 0 ? "border-[#b04a15] dark:border-orange-500 bg-white dark:bg-stone-900/50 rounded-r-lg" : "border-stone-200 dark:border-stone-800"
                          }`}
                        >
                          <p className="text-4xs md:text-3xs text-orange-600 dark:text-orange-400 font-bold opacity-80 uppercase tracking-wide md:tracking-wider">
                            {item.time}
                          </p>
                          <p className="text-3xs md:text-xs leading-[1.35] md:leading-normal mt-0.5 text-stone-600 dark:text-stone-400">
                            <strong className="text-stone-800 dark:text-stone-200">{item.user}</strong> {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/requests" className="mt-3 md:mt-6 block text-center w-full py-2 md:py-3 bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl font-bold text-2xs md:text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
                    {t("startYourImpact")}
                  </Link>
                </div>
              </div>
            </AnimatedWrapper>
          </div>
        </div>
        </div>

      {/* List remaining filtered posts — cards keep real spacing (gap-6) so
          the page-wide decorative marquee (rendered once, near the top of
          this component) can peek through the gaps between them. */}
      {filteredPosts.length > 1 && (() => {
        const remainingPosts = filteredPosts.slice(1);

        // Bento rhythm instead of a uniform grid: every 4th card is a
        // "large" tile (2 columns, taller banner image, bigger type) but
        // stays vertically laid out like the rest — just bigger — so the
        // variety reads as sizing, not a mismatched layout.
        return (
            <StaggerContainer
              inView
              delayStart={0.05}
              staggerDelay={0.1}
              className="relative z-10 mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-dense gap-6"
            >
            {remainingPosts.map((post, idx) => {
              const tr = translatePost(post);
              const isLarge = idx % 4 === 0;
              return (
                <motion.div
                  key={post.slug}
                  variants={itemVariants}
                  className={`h-full ${isLarge ? "md:col-span-2" : ""}`}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col h-full rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 overflow-hidden shadow-xs hover:shadow-[0_20px_40px_rgba(30,58,96,0.04)] transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className={`overflow-hidden relative flex-shrink-0 ${isLarge ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                      <Image
                        alt={tr.title}
                        fill
                        sizes={isLarge ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        src={post.image}
                      />
                    </div>
                    <div className={`flex flex-col flex-1 ${isLarge ? "p-8" : "p-6"}`}>
                      <p className="text-3xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
                        {tr.category} · {formatPublishedDate(post.publishedDate, locale)}
                      </p>
                      <h3
                        className={`font-bold text-stone-900 dark:text-stone-100 mb-2 group-hover:text-[#b04a15] dark:group-hover:text-orange-400 transition-colors ${
                          isLarge ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
                        }`}
                      >
                        {tr.title}
                      </h3>
                      <p
                        className={`text-stone-600 dark:text-stone-400 mb-4 leading-relaxed flex-1 ${
                          isLarge ? "text-sm md:text-base line-clamp-2" : "text-xs md:text-sm line-clamp-2"
                        }`}
                      >
                        {tr.description}
                      </p>
                      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-[#b04a15] dark:text-orange-400 mt-auto">
                        <span>{formatReadTime(post.readTime, t)}</span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          {t("readStory")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            </StaggerContainer>
        );
      })()}

      {/* See more — transitional cue into the rest of the journal */}
      <div className="flex justify-center mt-10">
        <a
          href="#insider-tips"
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400 transition-colors"
        >
          {t("seeMore")}
          <span aria-hidden className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        </a>
      </div>
    </section>

        {/* Insider Tips and Tricks Section */}
        <section id="insider-tips" className="mb-16 overflow-hidden scroll-mt-24">
          <AnimatedWrapper inView direction="up" duration={0.5}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div className="flex flex-col">
                <h2 className="font-extrabold text-2xl md:text-3xl text-stone-900 dark:text-stone-100">
                  {t("insiderTipsTitle")}
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
                  {t("insiderTipsSubtitle")}
                </p>
              </div>
              {/* Mobile-only: at sm+ every tip is on screen, so paging controls
                  would step through content the reader can already see. */}
              <div className="flex gap-2 sm:hidden">
                <button
                  id="tips-prev"
                  onClick={() => goToTip((tipIndex - 1 + insiderTips.length) % insiderTips.length)}
                  className="p-2 border border-stone-200 dark:border-stone-850 rounded-full hover:bg-stone-50 dark:hover:bg-stone-900 hover:border-orange-500/40 transition-all text-stone-600 dark:text-stone-400 hover:text-[#b04a15] cursor-pointer active:scale-90"
                >
                  ←
                </button>
                <button
                  id="tips-next"
                  onClick={() => goToTip((tipIndex + 1) % insiderTips.length)}
                  className="p-2 border border-stone-200 dark:border-stone-850 rounded-full hover:bg-stone-50 dark:hover:bg-stone-900 hover:border-orange-500/40 transition-all text-stone-600 dark:text-stone-400 hover:text-[#b04a15] cursor-pointer active:scale-90"
                >
                  →
                </button>
              </div>
            </div>
          </AnimatedWrapper>

          {/* MOBILE — a real carousel: one tip at a time, so the four dots below
              finally map 1:1 to the four tips. Previously three of the four were
              rendered at once and a step swapped a single card, which is why the
              controls looked like they did nothing. */}
          <div className="relative sm:hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={tipIndex}
                initial={{ opacity: 0, x: tipDirection === 1 ? 80 : -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tipDirection === 1 ? -80 : 80 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                // `drag="x"` claims horizontal gestures only, so vertical page
                // scrolling over the card is unaffected.
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  const far = Math.abs(info.offset.x) > 60;
                  const fast = Math.abs(info.velocity.x) > 350;
                  if (!far && !fast) return;
                  const dir = info.offset.x < 0 ? 1 : -1;
                  goToTip((tipIndex + dir + insiderTips.length) % insiderTips.length);
                }}
              >
                {renderTipCard(insiderTips[tipIndex])}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* DESKTOP — all four tips, no paging. There are only four, and at sm+
              they all fit, so arrows and dots had nothing left to reveal.
              `xl:grid-cols-4` rather than `md:grid-cols-3`: three columns leave
              the fourth tip orphaned alone on a second row. */}
          <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
            {insiderTips.map((tip) => (
              <div key={tip.slug}>{renderTipCard(tip)}</div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1.5 mt-6 justify-center sm:hidden">
            {insiderTips.map((_, i) => (
              <button
                key={i}
                onClick={() => goToTip(i)}
                aria-label={`Go to tip ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer active:scale-90 ${
                  i === tipIndex ? "w-8 bg-[#b04a15]" : "w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 dark:hover:bg-stone-600"
                }`}
              />
            ))}
          </div>
        </section>

        {/* Maximize Efficiency Banner */}
        <section className="mb-16">
          <AnimatedWrapper inView direction="up" duration={0.65}>
            <div className="bg-[#292524] dark:bg-stone-900 rounded-2xl overflow-hidden shadow-md flex flex-col md:flex-row items-center relative border border-stone-800">
              <div className="w-full md:w-1/2 p-8 md:p-12 relative z-10 flex justify-center">
                <Image
                  alt="Platform Dashboard Mockup"
                  width={360}
                  height={360}
                  className="w-full max-w-[360px] h-auto drop-shadow-2xl rounded-xl border border-stone-800 shadow-xl hover:scale-[1.01] transition-transform duration-500"
                  src="/Change_stories.webp"
                />
              </div>
              <div className="w-full md:w-1/2 p-8 md:pr-12 md:py-12 relative z-10 flex flex-col items-start text-left">
                <h2 className="font-extrabold text-2xl md:text-4xl text-orange-200 mb-6 leading-tight">
                  {t("bannerHeadline")}
                </h2>
                <div className="flex flex-col gap-3.5 mb-8 w-full">
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">{t("bannerPoint1")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">{t("bannerPoint2")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">{t("bannerPoint3")}</span>
                  </div>
                </div>
                <Link href="/requests" className="bg-[#b04a15] hover:bg-[#963c0d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
                  {t("startSupporting")}
                </Link>
              </div>
            </div>
          </AnimatedWrapper>
        </section>

        {/* Newsletter Section */}
        <section className="mb-12">
          <AnimatedWrapper inView direction="up" duration={0.55} delay={0.05}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-y-6 md:gap-x-12 py-10 border-t border-b border-stone-200 dark:border-stone-800">
              <div className="w-full md:flex-1 max-w-2xl">
                <h2 className="font-extrabold text-stone-900 dark:text-stone-100 text-xl md:text-2xl mb-2 leading-tight">
                  {t("optimizeTitle")}
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                  {t("optimizeSubtitle")}
                </p>
              </div>
              <div className="w-full md:w-auto flex-shrink-0">
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2 uppercase tracking-wider">
                  {t("newsletterLabel")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    className="px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] w-full sm:w-64"
                    placeholder={t("emailPlaceholder")}
                    type="email"
                  />
                  <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer">
                    {t("subscribe")}
                  </button>
                </div>
              </div>
            </div>
          </AnimatedWrapper>
        </section>
      </div>
    </div>
  );
}

export default function BlogIndexClient() {
  return (
    <Suspense fallback={null}>
      <BlogListingContent />
    </Suspense>
  );
}
