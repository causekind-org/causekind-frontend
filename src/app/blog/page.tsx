"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { blogPosts, insiderTips } from "../../data/blogData";
import { AnimatedWrapper } from "../components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "../components/StaggerContainer";
import { Search, X } from "lucide-react";
import { getRecentActivity, getPositiveUpdate, type RecentActivity } from "@/lib/api";
import { searchBlogPosts } from "@/lib/blogSearch";
import { Sparkles } from "lucide-react";

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
            { id: 1, time: "RECENTLY", user: "CauseKind Community", text: "is growing — be the first donor in your area!" },
          ]);
        }
      })
      .catch(() => {
        setLiveFeed([
          { id: 1, time: "RECENTLY", user: "CauseKind Community", text: "is growing — be the first donor in your area!" },
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

  return (
    <div className="pt-24 pb-16 bg-[#faf8f5] dark:bg-[#0c0a09]">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Search & Header Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <AnimatedWrapper delay={0} duration={0.5} direction="up">
                <span className="inline-block py-1 px-3 bg-orange-100 dark:bg-orange-950/40 text-[#b04a15] dark:text-orange-400 rounded-lg font-bold text-xs uppercase tracking-wider mb-3">
                  Giving Smarter
                </span>
              </AnimatedWrapper>
              <AnimatedWrapper delay={0.1} duration={0.6} direction="up">
                <h1 className="font-extrabold text-3xl md:text-5xl text-stone-900 dark:text-stone-100 mb-3 tracking-tight">
                  Stories that drive the world forward.
                </h1>
              </AnimatedWrapper>
              <AnimatedWrapper delay={0.22} duration={0.6} direction="up">
                <p className="text-stone-600 dark:text-stone-400 text-base md:text-lg">
                  Real impact, verified by the community. Discover stories of in-kind giving and change.
                </p>
              </AnimatedWrapper>
            </div>
            
            <AnimatedWrapper delay={0.3} duration={0.55} direction="left">
              <div ref={searchBoxRef} className="relative flex items-center gap-4 bg-white dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
                <div className="relative flex items-center w-full">
                  <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input
                    className="pl-9 pr-8 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-full text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] transition-all w-full md:w-64"
                    placeholder="Search stories..."
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
                      aria-label="Clear search"
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
                          {liveSearchResults.map((post) => (
                            <li key={post.slug}>
                              <Link
                                href={`/blog/${post.slug}`}
                                onClick={() => setIsSearchFocused(false)}
                                className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                              >
                                <img
                                  src={post.image}
                                  alt={post.title}
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#b04a15] dark:text-orange-400 uppercase tracking-wide truncate">
                                    {post.category}
                                  </p>
                                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
                                    {post.title}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="p-4 text-sm text-stone-500 dark:text-stone-400 text-center">
                          No stories match &ldquo;{searchQuery}&rdquo;.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AnimatedWrapper>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Category Sidebar (vertical) */}
            <AnimatedWrapper delay={0.35} duration={0.5} direction="up" className="w-full lg:w-56 flex-shrink-0">
              <nav className="lg:sticky lg:top-28 bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-3">
                <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Categories
                </p>
                <div className="flex flex-col gap-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        selectedCategory === category
                          ? "bg-[#b04a15] text-white shadow-sm"
                          : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:text-[#b04a15] dark:hover:text-orange-400"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </nav>
            </AnimatedWrapper>

            <div className="flex-1 min-w-0">
          {/* Featured Story Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Large Featured Card */}
            <AnimatedWrapper inView delay={0} duration={0.6} direction="up" className="md:col-span-8">
              {filteredPosts.length > 0 ? (
                (() => {
                  const featured = filteredPosts[0];
                  return (
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="group block cursor-pointer overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 hover:shadow-[0_20px_50px_rgba(176,74,21,0.06)] transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors z-10"></div>
                        <img
                          alt={featured.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                          src={featured.image}
                        />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="bg-[#b04a15] text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
                            {featured.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 md:p-8">
                        <h2 className="font-extrabold text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-3 group-hover:text-[#b04a15] dark:group-hover:text-orange-400 transition-colors leading-tight">
                          {featured.title}
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 text-sm md:text-base line-clamp-2 mb-5 leading-relaxed">
                          {featured.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-orange-500 animate-pulse text-sm">🔥</span>
                            <span className="text-xs text-orange-500 font-bold uppercase tracking-wider">
                              Featured Story
                            </span>
                          </div>
                          <span className="text-[#b04a15] dark:text-orange-400 font-bold flex items-center gap-1 text-sm group-hover:translate-x-1 transition-transform">
                            Read Story →
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
                      ? `No stories match "${searchQuery}" in ${selectedCategory}.`
                      : searchQuery.trim() !== ""
                        ? `No stories match "${searchQuery}".`
                        : `No stories in ${selectedCategory} yet.`}
                  </p>
                  {selectedCategory !== ALL_CATEGORIES && (
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(ALL_CATEGORIES)}
                      className="mt-4 text-sm font-bold text-[#b04a15] dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      View all categories →
                    </button>
                  )}
                </div>
              )}
            </AnimatedWrapper>

            {/* Live Impact Feed Sidebar */}
            <AnimatedWrapper inView delay={0.15} duration={0.6} direction="right" className="md:col-span-4 flex flex-col gap-8">
              <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 dark:from-stone-900/30 dark:to-stone-950/20 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 p-6 rounded-2xl flex-1 relative overflow-hidden shadow-xs">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="text-xs uppercase tracking-widest text-[#b04a15] dark:text-orange-400 font-bold">
                        Live CauseKind Feed
      </h3>
                    </div>
                    {positiveUpdate && (
                      <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-[#b04a15]/8 dark:bg-orange-400/10 border border-[#b04a15]/15 dark:border-orange-400/20">
                        <Sparkles className="w-3.5 h-3.5 text-[#b04a15] dark:text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300 font-medium">
                          {positiveUpdate}
                        </p>
                      </div>
                    )}
                    <div className="space-y-4">
                      {liveFeed.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`pl-4 py-2 transition-all duration-500 border-l-2 ${
                            idx === 0 ? "border-[#b04a15] dark:border-orange-500 bg-white dark:bg-stone-900/50 rounded-r-lg" : "border-stone-200 dark:border-stone-800"
                          }`}
                        >
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold opacity-80 uppercase tracking-wider">
                            {item.time}
                          </p>
                          <p className="text-xs leading-normal mt-0.5 text-stone-600 dark:text-stone-400">
                            <strong className="text-stone-800 dark:text-stone-200">{item.user}</strong> {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/requests" className="mt-6 block text-center w-full py-3 bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5">
                    Start Your Impact
                  </Link>
                </div>
              </div>
            </AnimatedWrapper>
          </div>

          {/* List remaining filtered posts */}
          {filteredPosts.length > 1 && (
            <StaggerContainer inView delayStart={0.05} staggerDelay={0.12} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {filteredPosts.slice(1).map((post) => (
                <motion.div key={post.slug} variants={itemVariants} className="h-full">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group bg-white dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden hover:shadow-[0_20px_40px_rgba(30,58,96,0.04)] transition-all duration-500 hover:-translate-y-1 flex flex-col h-full"
                  >
                    <div className="aspect-[16/9] overflow-hidden relative flex-shrink-0">
                      <img
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        src={post.image}
                      />
                      <div className="absolute top-4 left-4 z-20">
                        <span className="bg-[#b04a15] text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="font-bold text-lg md:text-xl text-stone-900 dark:text-stone-100 mb-2 group-hover:text-[#b04a15] dark:group-hover:text-orange-400 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-stone-600 dark:text-stone-400 text-xs md:text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                        {post.description}
                      </p>
                      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-[#b04a15] dark:text-orange-400 mt-auto">
                        <span>{post.readTime}</span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Read Story →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </StaggerContainer>
          )}
            </div>
          </div>
        </section>

        {/* Insider Tips and Tricks Section */}
        <section className="mb-16 overflow-hidden">
          <AnimatedWrapper inView direction="up" duration={0.5}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div className="flex flex-col">
                <h2 className="font-extrabold text-2xl md:text-3xl text-stone-900 dark:text-stone-100">
                  Insider Tips for Effective Giving
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
                  Discover practical advice to streamline your donations and maximize your community impact.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="tips-prev"
                  onClick={() => goToTip((tipIndex - 1 + insiderTips.length) % insiderTips.length)}
                  className="p-2 border border-stone-200 dark:border-stone-850 rounded-full hover:bg-stone-50 dark:hover:bg-stone-900 hover:border-orange-500/40 transition-all text-stone-600 dark:text-stone-400 hover:text-[#b04a15] cursor-pointer"
                >
                  ←
                </button>
                <button
                  id="tips-next"
                  onClick={() => goToTip((tipIndex + 1) % insiderTips.length)}
                  className="p-2 border border-stone-200 dark:border-stone-850 rounded-full hover:bg-stone-50 dark:hover:bg-stone-900 hover:border-orange-500/40 transition-all text-stone-600 dark:text-stone-400 hover:text-[#b04a15] cursor-pointer"
                >
                  →
                </button>
              </div>
            </div>
          </AnimatedWrapper>

          {/* Carousel track */}
          <div className="relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={tipIndex}
                initial={{ opacity: 0, x: tipDirection === 1 ? 80 : -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tipDirection === 1 ? -80 : 80 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
              >
                {[0, 1, 2].map((offset) => {
                  const tip = insiderTips[(tipIndex + offset) % insiderTips.length];
                  return (
                    <div
                      key={tip.slug}
                      className="bg-white dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 p-6 rounded-2xl flex flex-col relative overflow-hidden h-[300px] group hover:bg-stone-50 dark:hover:bg-stone-900/50 hover:shadow-[0_15px_35px_rgba(30,58,96,0.03)] hover:-translate-y-1 transition-all duration-500"
                    >
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-2">
                            {tip.title}
                          </h3>
                          <p className="text-stone-600 dark:text-stone-400 text-xs md:text-sm leading-relaxed mb-4">
                            {tip.description}
                          </p>
                        </div>
                        <Link
                          className="font-bold text-xs md:text-sm text-[#b04a15] dark:text-orange-400 flex items-center gap-1 hover:underline mt-auto group/link"
                          href="/requests"
                        >
                          View In-Kind Needs →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1.5 mt-6 justify-center">
            {insiderTips.map((_, i) => (
              <button
                key={i}
                onClick={() => goToTip(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === tipIndex ? "w-8 bg-[#b04a15]" : "w-2 bg-stone-300 dark:bg-stone-700"
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
                <img
                  alt="Platform Dashboard Mockup"
                  className="w-full max-w-[360px] h-auto drop-shadow-2xl rounded-xl border border-stone-800 shadow-xl hover:scale-[1.01] transition-transform duration-500"
                  src="/Change_stories.jpg"
                />
              </div>
              <div className="w-full md:w-1/2 p-8 md:pr-12 md:py-12 relative z-10 flex flex-col items-start text-left">
                <h2 className="font-extrabold text-2xl md:text-4xl text-orange-200 mb-6 leading-tight">
                  Ready to turn stories into change?
                </h2>
                <div className="flex flex-col gap-3.5 mb-8 w-full">
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">Connect with verified causes locally</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">Coordinate direct 10km handoffs</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                    <span className="text-xs md:text-sm font-medium">100% free to list and match</span>
                  </div>
                </div>
                <Link href="/requests" className="bg-[#b04a15] hover:bg-[#963c0d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5">
                  Start Supporting
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
                  Optimize Your Impact with CauseKind
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                  Stay updated with our latest insights, success stories, and local community updates.
                </p>
              </div>
              <div className="w-full md:w-auto flex-shrink-0">
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2 uppercase tracking-wider">
                  Newsletter
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    className="px-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] w-full sm:w-64"
                    placeholder="What's your email?"
                    type="email"
                  />
                  <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-md hover:-translate-y-0.5">
                    Subscribe
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

export default function BlogListingPage() {
  return (
    <Suspense fallback={null}>
      <BlogListingContent />
    </Suspense>
  );
}
