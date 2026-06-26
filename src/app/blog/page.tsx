"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { blogPosts, insiderTips } from "../../data/blogData";
import { AnimatedWrapper } from "../components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "../components/StaggerContainer";
import { Search } from "lucide-react";
import { getRecentActivity, type RecentActivity } from "@/lib/api";

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

export default function BlogListingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [liveFeed, setLiveFeed] = useState<{ id: number; time: string; user: string; text: string }[]>([]);

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

  // Advanced relevance-based search ranking
  const getSearchScore = (post: typeof blogPosts[0], query: string) => {
    if (!query) return 0;
    const cleanQuery = query.toLowerCase().trim();
    if (cleanQuery === "") return 0;

    let score = 0;
    const title = post.title.toLowerCase();
    const desc = post.description.toLowerCase();
    const cat = post.category.toLowerCase();
    const content = (post.content || "").toLowerCase();

    // 1. Exact full match in title
    if (title === cleanQuery) {
      score += 1000;
    }
    // 2. Query is a substring of the title
    if (title.includes(cleanQuery)) {
      score += 500;
    }
    // 3. Query is a substring of the description
    if (desc.includes(cleanQuery)) {
      score += 250;
    }

    // 4. Individual word matches
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    words.forEach((word) => {
      // Title word boundary match
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      if (wordRegex.test(title)) {
        score += 150;
      } else if (title.includes(word)) {
        score += 80;
      }

      // Description word boundary match
      if (wordRegex.test(desc)) {
        score += 60;
      } else if (desc.includes(word)) {
        score += 30;
      }

      // Category match
      if (cat.includes(word)) {
        score += 100;
      }

      // Content match
      if (content.includes(word)) {
        score += 20;
      }
    });

    return score;
  };

  // Search filtering & dynamic relevance sorting
  const filteredPosts = searchQuery.trim() === ""
    ? blogPosts
    : blogPosts
        .map((post) => ({ post, score: getSearchScore(post, searchQuery) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.post);

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
        "url": "https://www.causekind.com/logo.png"
      }
    },
    "blogPost": blogPosts.map((post) => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.description,
      "image": post.image.startsWith("http") ? post.image : `https://www.causekind.com${post.image}`,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "CauseKind",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.causekind.com/logo.png"
        }
      },
      "url": `https://www.causekind.com/blog/${post.slug}`
    }))
  };

  return (
    <div className="pt-24 pb-16 bg-[#faf8f5] dark:bg-[#0c0a09]">
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
              <div className="flex items-center gap-4 bg-white dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input
                    className="pl-9 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-full text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] transition-all w-full md:w-64"
                    placeholder="Search stories..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </AnimatedWrapper>
          </div>

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
                  <p className="text-stone-500 dark:text-stone-400 font-medium">No stories match your search query.</p>
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
