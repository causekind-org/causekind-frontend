"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { searchBlogPosts } from "@/lib/blogSearch";
import { AnimatedWrapper } from "../../components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "../../components/StaggerContainer";
import { Search, X } from "lucide-react";
import { blogPosts } from "../../../data/blogData";



interface PageProps {
  params: Promise<{ slug: string }>;
}

const FONT_OPTIONS = [
  { value: "font-serif-mode", label: "Source Serif", family: "var(--font-source-serif-4), serif" },
  { value: "font-sans-mode",  label: "Plus Jakarta", family: "var(--font-plus-jakarta-sans), sans-serif" },
  { value: "font-inter-mode", label: "Inter Sans",   family: "var(--font-inter), sans-serif" },
  { value: "font-lora-mode",  label: "Lora Serif",   family: "var(--font-lora), serif" },
  { value: "font-mono-mode",  label: "Roboto Mono",  family: "var(--font-roboto-mono), monospace" },
];

function FontDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = FONT_OPTIONS.find((o) => o.value === value) ?? FONT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 pl-4 pr-3 py-3 bg-white dark:bg-stone-800 border border-[#b04a15]/20 dark:border-[#e07b3a]/20 rounded-xl font-body-md text-sm text-[#1c1917] dark:text-[#e7e5e4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 dark:focus-visible:ring-[#e07b3a]/40 hover:border-[#b04a15]/50 dark:hover:border-[#e07b3a]/50 transition-colors cursor-pointer shadow-sm"
      >
        <span className="truncate" style={{ fontFamily: selected.family }}>{selected.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="material-symbols-outlined text-[#b04a15] dark:text-[#e07b3a] text-[20px] leading-none shrink-0"
        >
          expand_more
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute z-50 mt-2 w-full origin-top rounded-xl border border-[#b04a15]/20 dark:border-[#e07b3a]/20 bg-white dark:bg-stone-800 shadow-lg overflow-hidden py-1"
          >
            {FONT_OPTIONS.map((opt, i) => (
              <motion.li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: 0.03 * i }}
              >
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left cursor-pointer transition-colors ${
                    opt.value === value
                      ? "bg-orange-50 dark:bg-stone-700/60 text-[#b04a15] dark:text-[#e07b3a] font-semibold"
                      : "text-stone-700 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-stone-700/60 hover:text-[#b04a15] dark:hover:text-[#e07b3a]"
                  }`}
                  style={{ fontFamily: opt.family }}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && (
                    <span className="material-symbols-outlined text-[16px] leading-none shrink-0">check</span>
                  )}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BlogReadingPage({ params }: PageProps) {
  const { slug } = use(params);
  const post = blogPosts.find((p) => p.slug === slug);

  const [boldMode, setBoldMode] = useState(false);
  const [fontMode, setFontMode] = useState("font-serif-mode");
  const [copied, setCopied] = useState(false);
  const [sanitizedContent, setSanitizedContent] = useState("");

  useEffect(() => {
    if (post) {
      import("isomorphic-dompurify").then((DOMPurify) => {
        setSanitizedContent(DOMPurify.default.sanitize(post.content || ""));
      });
    }
  }, [post]);


  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const liveSearchResults = searchBlogPosts(blogPosts, searchQuery, 6);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailShare = () => {
    if (typeof window !== "undefined" && post) {
      // Gmail web compose, not a plain mailto: — a bare mailto: silently does
      // nothing if the browser/OS has no default mail client configured
      // (common on Windows). No fixed "to" here — the reader picks the
      // recipient, unlike the site's "contact support" email buttons.
      const subject = post.title;
      const body = `Check out this article: ${post.title}\n\nRead here: ${window.location.href}`;
      const params = new URLSearchParams({ view: "cm", fs: "1", su: subject, body });
      window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-surface-cream flex flex-col justify-center items-center p-md">
        <h1 className="font-display-lg text-primary text-3xl mb-md">Story Not Found</h1>
        <p className="text-on-surface-variant mb-lg">The story you are looking for does not exist.</p>
        <Link href="/" className="bg-rust-action text-white px-6 py-2.5 rounded-lg font-bold">
          Go Back Home
        </Link>
      </div>
    );
  }

  // Recommend other stories in the same category first, so "Read Next"
  // helps readers stay within the kind of story they're already engaged with.
  const otherPosts = blogPosts.filter((p) => p.slug !== slug);
  const sameCategoryPosts = otherPosts.filter((p) => p.category === post.category);
  const otherCategoryPosts = otherPosts.filter((p) => p.category !== post.category);
  const recommendedPosts = [...sameCategoryPosts, ...otherCategoryPosts].slice(0, 2);

  // Schema.org BlogPosting markup so Google's Rich Results can pick up this
  // post — otherwise the page renders fine but carries zero structured data.
  const postSchemaData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.causekind.com/blog/${post.slug}`,
    },
    "headline": post.title,
    "description": post.description,
    "image": post.image.startsWith("http") ? post.image : `https://www.causekind.com${post.image}`,
    "author": {
      "@type": "Person",
      "name": post.author,
      "image": post.authorImage,
    },
    "publisher": {
      "@type": "Organization",
      "name": "CauseKind",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.causekind.com/logo-filled.png",
      },
    },
    // publishedDate is stored as "Month YYYY" (e.g. "June 2026") — Date parses that
    // to the 1st of the month, which is the best ISO date this data supports.
    "datePublished": !isNaN(new Date(post.publishedDate).getTime())
      ? new Date(post.publishedDate).toISOString().slice(0, 10)
      : undefined,
    "url": `https://www.causekind.com/blog/${post.slug}`,
  };

  return (
    <div id="page-body" className={`${fontMode} ${boldMode ? "bold-mode-active" : ""} min-h-screen bg-[#faf8f5] dark:bg-[#0c0a09] transition-colors duration-300 pt-24`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchemaData) }}
      />
      {/* Main Content Area */}
      <main className="pb-24">
        <article>
          {/* Back button */}
          <div className="max-w-[1280px] mx-auto px-6 mb-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400 transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Stories
            </Link>
          </div>
          {/* Hero Section — contained card */}
          <div className="max-w-[1280px] mx-auto px-gutter pt-10 pb-10">
            {/* Image card */}
            <AnimatedWrapper delay={0} duration={0.6} direction="up">
              <div className="relative w-full h-[420px] rounded-2xl overflow-hidden shadow-xl mb-10">
                <div
                  className="absolute inset-0 bg-cover bg-center w-full h-full scale-105 transform origin-center"
                  style={{ backgroundImage: `url('${post.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                {/* Category badge overlaid bottom-left — links back to the
                    listing page pre-filtered to this category */}
                <div className="absolute top-5 left-5">
                  <Link
                    href={`/blog?category=${encodeURIComponent(post.category)}`}
                    className="inline-block px-3 py-1 bg-orange-300 hover:bg-orange-200 text-orange-900 font-label-sm text-xs rounded-full uppercase tracking-wider font-semibold transition-colors"
                  >
                    {post.category}
                  </Link>
                </div>
              </div>
            </AnimatedWrapper>

            {/* Article meta below the image */}
            <div className="max-w-3xl">
              <AnimatedWrapper delay={0.15} duration={0.6} direction="up">
                <h1 className="font-display-lg text-[#b04a15] dark:text-[#e07b3a] mb-4 leading-tight text-4xl md:text-5xl font-bold">
                  {post.title}
                </h1>
              </AnimatedWrapper>
              <AnimatedWrapper delay={0.25} duration={0.55} direction="up">
                <p className="font-body-lg text-stone-600 dark:text-stone-400 text-lg mb-6 leading-relaxed">
                  {post.description}
                </p>
              </AnimatedWrapper>
            </div>
          </div>

          {/* Content Grid Layout */}
          <div className="max-w-[1280px] mx-auto px-gutter grid grid-cols-1 md:grid-cols-12 gap-12 relative">
            {/* Left Sidebar: Reading Tools & Social */}
            <motion.aside
              className="hidden md:block md:col-span-3 lg:col-span-2 relative"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="sticky top-[120px] flex flex-col gap-8">
                {/* Reading Tools Panel */}
                {/* Reading Tools Panel */}
                <div className="relative z-30 bg-[#faf8f5] dark:bg-[#1c1917] backdrop-blur-md p-6 rounded-2xl border border-[#b04a15]/20 dark:border-[#e07b3a]/20 shadow-sm text-[#1c1917] dark:text-[#e7e5e4]">
                  <h3 className="font-label-md text-xs uppercase tracking-widest mb-6 border-b border-[#b04a15]/20 dark:border-[#e07b3a]/20 pb-3 text-[#b04a15] dark:text-[#e07b3a] font-bold">
                    Reading Tools
                  </h3>
                  {/* Bold Mode Toggle */}
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-label-sm text-sm text-[#1c1917] dark:text-[#e7e5e4] flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-[20px] leading-none text-[#b04a15] dark:text-[#e07b3a]">format_bold</span>
                      Bold Text
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        className="sr-only peer"
                        id="bold-toggle"
                        type="checkbox"
                        checked={boldMode}
                        onChange={(e) => setBoldMode(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b04a15] dark:peer-checked:bg-[#e07b3a] shadow-inner" />
                    </label>
                  </div>
                  {/* Font Selector */}
                  <div className="space-y-3">
                    <span className="font-label-sm text-sm text-[#1c1917] dark:text-[#e7e5e4] block font-medium">
                      Font Options
                    </span>
                    <FontDropdown value={fontMode} onChange={setFontMode} />
                  </div>
                </div>
                {/* Social Share */}
                <div className="flex flex-col gap-3 relative">
                  <span className="font-label-sm text-[10px] text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider mb-1 font-bold">
                    Share Story
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleEmailShare}
                      aria-label="Share via Email"
                      title="Share via Email"
                      className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] leading-none">mail</span>
                    </button>
                    <button
                      onClick={handleCopyLink}
                      aria-label="Copy Link"
                      title="Copy Link"
                      className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] leading-none">link</span>
                    </button>
                    {copied && (
                      <span className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-semibold animate-pulse absolute left-28 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 px-2.5 py-1.5 rounded-lg shadow-sm">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.aside>

            {/* Center Article Content */}
            <motion.div
              className="col-span-1 md:col-span-6 lg:col-span-7 article-content text-stone-800 dark:text-stone-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              // Fix #3: sanitize HTML before injection — strips <script>, onerror, etc.
              dangerouslySetInnerHTML={{ __html: sanitizedContent || post.content || "" }}
            />

            {/* Right Sidebar: Next For You */}
            <motion.aside
              className="hidden lg:block lg:col-span-3 pl-8 border-l border-stone-200 dark:border-stone-700"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="sticky top-[120px]">
                {/* Search Stories — live dropdown, same ranking as the blog listing page */}
                <div ref={searchBoxRef} className="relative mb-8">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500" />
                    <input
                      className="pl-9 pr-8 py-2.5 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] transition-all"
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
                  <AnimatePresence>
                    {isSearchFocused && searchQuery.trim() !== "" && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-30 overflow-hidden"
                      >
                        {liveSearchResults.length > 0 ? (
                          <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                            {liveSearchResults.map((result) => (
                              <li key={result.slug}>
                                <Link
                                  href={`/blog/${result.slug}`}
                                  onClick={() => setIsSearchFocused(false)}
                                  className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                                >
                                  <img
                                    src={result.image}
                                    alt={result.title}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-[#b04a15] dark:text-orange-400 uppercase tracking-wide truncate">
                                      {result.category}
                                    </p>
                                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
                                      {result.title}
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

                <h3 className="font-display-lg text-2xl text-[#b04a15] dark:text-[#e07b3a] mb-6 font-bold">Read Next</h3>
                <StaggerContainer delayStart={0.6} staggerDelay={0.12} className="flex flex-col gap-6">
                  {recommendedPosts.map((rec) => (
                    <motion.div key={rec.slug} variants={itemVariants}>
                      <Link className="group block" href={`/blog/${rec.slug}`}>
                        <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-stone-200 dark:border-stone-700">
                          <div
                            className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: `url('${rec.image}')` }}
                          />
                        </div>
                        <span className="text-[#b04a15] dark:text-[#e07b3a] font-label-sm text-xs uppercase tracking-wide font-bold">
                          {rec.category}
                        </span>
                        <h4 className="font-headline-md text-[16px] text-stone-800 dark:text-stone-200 mt-1 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors leading-snug">
                          {rec.title}
                        </h4>
                      </Link>
                    </motion.div>
                  ))}
                </StaggerContainer>
              </div>
            </motion.aside>
          </div>
        </article>

      </main>

    </div>
  );
}
