"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
// Imported statically, not via a dynamic import inside an effect. A dynamic
// import resolves a tick after first render, which left the raw article HTML
// as the only thing available to paint — and the `||` fallback below happily
// painted it. Importing here sanitizes during render instead, so the server-
// rendered document carries clean HTML and there is never an unsanitized
// frame. Next splits by route, so the cost lands on the blog page alone.
import DOMPurify from "isomorphic-dompurify";
import Image from "next/image";
import Link from "@/components/AppLink";
// Entrance motion is CSS (blogPostMotion.css): framer-motion kept the article
// at opacity 0 until hydration and added the library to every post.
import "./blogPostMotion.css";
import { useLocale, useTranslations } from "next-intl";
import { fetchBlogTranslation, getBlogTranslation, preloadBlogTranslations, type BlogTranslation } from "@/data/blogTranslations";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { searchBlogPosts } from "@/lib/blogSearch";
import { withHeadingIds } from "@/lib/blogToc";
import { Search, X } from "lucide-react";
import { blogPosts } from "../../../../data/blogData";
import { BLOG_RELATED } from "@/data/blogRelated";
import { categoryBySlug } from "@/lib/inKindCategories";



/**
 * The eight Material Symbols (Outlined, weight 400, fill 0, grade 0, optical
 * size 24) this page uses, as their official outline paths. They replace the
 * Material Symbols icon font, which cost a third-party stylesheet on every
 * route and put the ligature names ("expand_more") in the HTML as text.
 */
const MATERIAL_ICON_PATHS = {
  check: "M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z",
  expand_more: "M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z",
  format_bold: "M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z",
  link: "M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z",
  mail: "M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z",
  pause: "M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z",
  play_arrow: "M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z",
  replay: "M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80q-75 0-140.5-28.5Z",
} as const;

/**
 * Always a 24px box. The icon font's own rule set `font-size: var(--text-2xl)`
 * unlayered, which beat the Tailwind `text-lg` / `text-sm` utilities on every
 * icon, so 24px is what each of them actually rendered at.
 */
function MaterialIcon({ name, className = "" }: { name: keyof typeof MATERIAL_ICON_PATHS; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="24"
      height="24"
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={`ck-msym inline-block align-middle shrink-0 ${className}`}
    >
      <path d={MATERIAL_ICON_PATHS[name]} />
    </svg>
  );
}

// The route's `params` promise is unwrapped by the server component in
// page.tsx, which needs the slug anyway to build the post's metadata. This
// component just receives the resolved value.
interface BlogPostClientProps {
  slug: string;
  /**
   * The article body, passed down from the server component.
   *
   * <p>Not read from `blogPosts` any more: that array carried every article's
   * HTML, so rendering one post pulled all 28 into the client bundle. The
   * bodies now live in src/data/blogContent.ts, which only the server imports.
   */
  content: string;
}

export default function BlogPostClient({ slug, content }: BlogPostClientProps) {
  const post = blogPosts.find((p) => p.slug === slug);

  const [copied, setCopied] = useState(false);

  // Google-backed translations reuse the server cache. Only this article's
  // HTML is translated; related-card metadata is warmed separately.
  const locale = useLocale();
  const t = useTranslations("blog_page");
  const [translatedArticle, setTranslatedArticle] = useState<{
    locale: string; slug: string; source: string; value: BlogTranslation | null;
  } | null>(null);
  const [, setTranslationsVersion] = useState(0);
  const translation = translatedArticle && translatedArticle.locale === locale && translatedArticle.slug === slug &&
    translatedArticle.source === content ? translatedArticle.value : null;

  useEffect(() => {
    if (!post || locale === "en") return;
    let cancelled = false;
    fetchBlogTranslation(locale, post.slug, content).then((value) => {
      if (!cancelled) setTranslatedArticle({ locale, slug: post.slug, source: content, value });
    });
    preloadBlogTranslations(locale).then(() => {
      if (!cancelled) setTranslationsVersion((value) => value + 1);
    });
    return () => { cancelled = true; };
  }, [locale, post, content]);

  const translatePost = (p: (typeof blogPosts)[number]) => {
    const tr = getBlogTranslation(locale, p.slug);
    return { title: tr?.title || p.title, category: tr?.category || p.category };
  };

  const displayTitle = translation?.title || post?.title || "";
  const displayDescription = translation?.description || post?.description || "";
  const displayCategory = translation?.category || post?.category || "";
  // `content` arrives as a prop from the server component. It used to come
  // from post.content, which meant importing every article's body into the
  // client bundle to render one of them.
  const rawContentForLocale = translation?.content || content || "";

  // Derived during render rather than set from an effect, so there is no window
  // in which the component has content to show but has not yet sanitized it.
  const sanitizedContent = useMemo(
    () => (rawContentForLocale ? DOMPurify.sanitize(rawContentForLocale) : ""),
    [rawContentForLocale]
  );

  // Heading ids (from the English source, so links match in every language)
  // and the desktop "In this article" list. Computed during render, so both
  // are in the server HTML. Ids only: heading levels and text are unchanged.
  const { html: articleHtml, toc } = useMemo(
    () => withHeadingIds(sanitizedContent, content || ""),
    [sanitizedContent, content]
  );
  // The card lists main headings (H2) only; ids stay on every heading.
  const tocMain = useMemo(() => toc.filter((item) => item.level === 2), [toc]);
  const showToc = tocMain.length >= 2;
  // Both desktop side columns are always sticky. The TOC card does not track
  // scrolling at all: it stays still; if it is taller than the space under
  // the header the reader can scroll it (hidden scrollbar).

  // Scrolls to the heading only. The page URL never changes (no #hash, no
  // history update): the items are buttons, not links.
  const handleTocClick = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  // Voice narration — English and Hindi stories only, using a Web Speech API
  // voice (a Google Hindi female voice, per design) rather than a
  // synthesised backend track, so this ships with zero audio infrastructure.
  // sanitizedContent above already reflects the active locale, so narration
  // just reads whatever's currently on screen.
  const [narrationSupported, setNarrationSupported] = useState(false);
  const [narrationState, setNarrationState] = useState<"idle" | "playing" | "paused">("idle");
  const narrationChunksRef = useRef<string[]>([]);
  const narrationIndexRef = useRef(0);
  const narrationVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Chrome's native speechSynthesis.pause()/resume() is unreliable (a
  // long-standing Chromium bug, worst on Windows — resume() often just does
  // nothing). Pause/Restart/Play are implemented as cancel() + replay from a
  // remembered chunk index instead, which works consistently everywhere.
  // cancel() fires the outgoing utterance's onend/onerror asynchronously —
  // this flag tells those handlers "we did this on purpose, don't react".
  const suppressCallbacksRef = useRef(false);
  const canNarrate = locale === "en" || locale === "hi";

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setNarrationSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      narrationVoiceRef.current =
        voices.find((v) => /hindi/i.test(v.name) && /female/i.test(v.name)) ||
        voices.find((v) => v.name === "Google हिन्दी") ||
        voices.find((v) => /google/i.test(v.name) && /hi[-_]?in/i.test(v.lang)) ||
        voices.find((v) => /hi[-_]?in/i.test(v.lang)) ||
        null;
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // Reset narration whenever the underlying article text changes (new post
  // or the sanitized HTML finishes loading) so stale chunks/playback don't
  // carry over between stories or locales.
  useEffect(() => {
    suppressCallbacksRef.current = true;
    narrationChunksRef.current = [];
    narrationIndexRef.current = 0;
    setNarrationState("idle");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [sanitizedContent]);

  useEffect(() => {
    return () => {
      suppressCallbacksRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getNarrationChunks = () => {
    if (narrationChunksRef.current.length) return narrationChunksRef.current;
    const container = document.createElement("div");
    container.innerHTML = sanitizedContent;
    const text = (container.textContent || "").replace(/\s+/g, " ").trim();
    // Split into sentence-sized chunks — most browsers silently cut off very
    // long single utterances partway through, and chunking also lets Pause
    // land at a sentence boundary instead of mid-word.
    const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? (text ? [text] : []);
    narrationChunksRef.current = chunks;
    return chunks;
  };

  const speakFrom = (index: number) => {
    const chunks = getNarrationChunks();
    if (index >= chunks.length) {
      narrationIndexRef.current = 0;
      setNarrationState("idle");
      return;
    }
    narrationIndexRef.current = index;
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = "hi-IN";
    if (narrationVoiceRef.current) utterance.voice = narrationVoiceRef.current;
    utterance.onend = () => {
      if (suppressCallbacksRef.current) return;
      speakFrom(index + 1);
    };
    utterance.onerror = () => {
      if (suppressCallbacksRef.current) return;
      narrationIndexRef.current = 0;
      setNarrationState("idle");
    };
    window.speechSynthesis.speak(utterance);
  };

  // Stop whatever's currently queued/speaking, marking the outgoing
  // utterance's callbacks as intentional so they don't fight the state
  // change that's about to happen, then run `after` once Chrome has
  // actually processed the cancel (immediate speak() right after cancel()
  // is a well-known race that silently drops the new utterance).
  const stopThenRun = (after: () => void) => {
    suppressCallbacksRef.current = true;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      suppressCallbacksRef.current = false;
      after();
    }, 50);
  };

  const handleNarrationPlay = () => {
    if (!narrationSupported) return;
    const resumeIndex = narrationState === "paused" ? narrationIndexRef.current : 0;
    setNarrationState("playing");
    stopThenRun(() => speakFrom(resumeIndex));
  };

  const handleNarrationPause = () => {
    if (!narrationSupported) return;
    suppressCallbacksRef.current = true;
    window.speechSynthesis.cancel();
    setNarrationState("paused");
  };

  const handleNarrationRestart = () => {
    if (!narrationSupported) return;
    setNarrationState("playing");
    stopThenRun(() => speakFrom(0));
  };


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
        <h1 className="font-display-lg text-primary text-3xl mb-md">{t("notFoundTitle")}</h1>
        <p className="text-on-surface-variant mb-lg">{t("notFoundBody")}</p>
        <Link href="/" className="bg-rust-action text-white px-6 py-2.5 rounded-lg font-bold">
          {t("goHome")}
        </Link>
      </div>
    );
  }

  // Recommend other stories in the same category first, so "Read Next"
  // helps readers stay within the kind of story they're already engaged with.
  const otherPosts = blogPosts.filter((p) => p.slug !== slug);
  const sameCategoryPosts = otherPosts.filter((p) => p.category === post.category);
  const otherCategoryPosts = otherPosts.filter((p) => p.category !== post.category);
  const recommendedPosts = [...sameCategoryPosts, ...otherCategoryPosts].slice(0, 3);
  // Hand-picked sibling guides and the request category this guide leads to.
  const related = BLOG_RELATED[post.slug];
  const relatedCategory = related?.category ? categoryBySlug(related.category) : undefined;
  const relatedPosts = (related?.posts ?? [])
    .map((s) => blogPosts.find((p) => p.slug === s))
    .filter((p): p is (typeof blogPosts)[number] => !!p);
  return (
    <div id="page-body" className="font-serif-mode min-h-screen bg-[#faf8f5] dark:bg-[#0c0a09] transition-colors duration-300 pt-2 md:pt-6 lg:pt-8">
      {/* Main Content Area */}
      <div className="pb-24">
        <article lang={translation ? `${locale}-x-mtfrom-en` : "en"}>
          {/* Back button */}
          <div className="max-w-[1280px] lg:max-w-[1680px] mx-auto px-5 sm:px-6 lg:px-10 mb-4 md:mb-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400 transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Stories
            </Link>
          </div>
          {/* Hero Section — contained card */}
          <div className="max-w-[1280px] lg:max-w-[1680px] mx-auto px-5 sm:px-6 lg:px-10 pt-6 pb-6 md:pt-10 md:pb-10 lg:pb-0">
            {/* Image card */}
            <div>
              <div className="relative w-full aspect-[16/10] md:aspect-auto md:h-[420px] rounded-2xl overflow-hidden shadow-xl mb-6 md:mb-10">
                {/* Same box, scale and crop as the former CSS background
                    (bg-cover bg-center = object-cover object-center), now a
                    real <img> in the server HTML: preloaded as the LCP image,
                    resized per device, and described for search and screen readers. */}
                <div className="absolute inset-0 w-full h-full scale-100 md:scale-105 transform origin-center">
                  <Image
                    src={post.image}
                    alt={post.heroAlt ?? post.title}
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(min-width: 1680px) 1600px, 100vw"
                    className="object-cover object-center"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                {/* Category badge overlaid bottom-left — links back to the
                    listing page pre-filtered to this category */}
                <div className="absolute top-3 left-3 md:top-5 md:left-5">
                  <Link
                    href={`/blog?category=${encodeURIComponent(post.category)}`}
                    className="inline-block px-3 py-1 bg-orange-300 hover:bg-orange-200 text-orange-900 font-label-sm text-xs rounded-full uppercase tracking-wider font-semibold transition-colors"
                  >
                    {displayCategory}
                  </Link>
                </div>
              </div>
            </div>

            {/* Article meta below the image: same left/right edges as the hero image */}
            <div>
              <div>
                <h1 className="font-display-lg text-[#b04a15] dark:text-[#e07b3a] mb-4 leading-tight text-2xl sm:text-4xl md:text-5xl font-bold break-words">
                  {displayTitle}
                </h1>
              </div>
              <div>
                <p className="font-body-lg text-stone-600 dark:text-stone-400 text-lg mb-6 leading-relaxed">
                  {displayDescription}
                </p>
              </div>

              {/* Voice Narration (English and Hindi only): desktop-only, as before, now under the subtitle */}
              {canNarrate && narrationSupported && (
                <div className="hidden md:block space-y-3 mb-6">
                  <span className="font-label-sm text-sm text-[#1c1917] dark:text-[#e7e5e4] block font-medium">
                    Listen to Story
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={narrationState === "playing" ? handleNarrationPause : handleNarrationPlay}
                      aria-label={narrationState === "playing" ? "Pause narration" : "Play narration"}
                      title={narrationState === "playing" ? "Pause" : "Play"}
                      className="w-10 h-10 rounded-full bg-[#b04a15] dark:bg-[#e07b3a] text-white flex items-center justify-center hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
                    >
                      <MaterialIcon name={narrationState === "playing" ? "pause" : "play_arrow"} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNarrationRestart}
                      aria-label="Restart narration"
                      title="Restart"
                      className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 transition-colors cursor-pointer"
                    >
                      <MaterialIcon name="replay" />
                    </button>
                    <span className="font-label-sm text-2xs text-[#78716c] dark:text-[#a8a29e]">
                      {narrationState === "playing" ? "Playing…" : narrationState === "paused" ? "Paused" : "Read aloud"}
                    </span>
                  </div>
                </div>
              )}

              {/* Reading controls are otherwise `hidden md:block` in the left
                  sidebar, so a phone reader had no way to switch language on a
                  post at all. Surfaced here on every post, mobile only. */}
              <div className="md:hidden mb-6 flex">
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          {/* Content Grid Layout */}
          <div className="max-w-[1280px] lg:max-w-[1680px] mx-auto px-5 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-12 gap-12 lg:grid-cols-[11rem_minmax(0,1fr)_13rem] lg:gap-8 xl:grid-cols-[12rem_minmax(0,1fr)_16rem] xl:gap-10 relative">
            {/* Left Sidebar: Share Story */}
            <aside className="ck-blog-aside-left hidden md:block lg:hidden md:col-span-3 relative">
              <div className="sticky top-[120px] flex flex-col gap-8">
                {/* Social Share */}
                <div className="flex flex-col gap-3 relative">
                  <span className="font-label-sm text-3xs text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider mb-1 font-bold">
                    Share Story
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleEmailShare}
                      aria-label="Share via Email"
                      title="Share via Email"
                      className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <MaterialIcon name="mail" />
                    </button>
                    <button
                      onClick={handleCopyLink}
                      aria-label="Copy Link"
                      title="Copy Link"
                      className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <MaterialIcon name="link" />
                    </button>
                    {copied && (
                      <span className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-semibold animate-pulse absolute left-28 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 px-2.5 py-1.5 rounded-lg shadow-sm">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Left column, desktop only (lg+): "In this article". The column
                stays (empty) when a post has fewer than 2 headings. */}
            <aside className="hidden lg:block lg:col-span-1 min-w-0">
              {showToc && (
                <nav
                  aria-label="In this article"
                  className={`sticky top-[120px] max-h-[calc(100vh-144px)] overflow-y-auto ck-no-scrollbar bg-[#faf8f5] dark:bg-[#1c1917] p-2.5 rounded-2xl border border-[#b04a15]/20 dark:border-[#e07b3a]/20 shadow-sm`}
                >
                  <p className="font-label-md text-3xs uppercase tracking-widest mb-3 border-b border-[#b04a15]/20 dark:border-[#e07b3a]/20 pb-2 text-[#b04a15] dark:text-[#e07b3a] font-bold">
                    In this article
                  </p>
                  <ul className="space-y-3">
                    {tocMain.map((item) => {
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={(e) => handleTocClick(e, item.id)}
                            className="block w-full text-left cursor-pointer rounded-md px-1.5 py-0.5 text-[13px] leading-snug break-words transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] dark:focus-visible:ring-[#e07b3a] text-stone-600 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a]"
                          >
                            {item.text}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}
            </aside>

            {/* Center Article Content */}
            <div className="col-span-1 md:col-span-6 lg:col-span-1 min-w-0">
            <div
              className="ck-blog-article-in article-content text-stone-800 dark:text-stone-100"
              // Fix #3: sanitize HTML before injection — strips <script>, onerror, etc.
              // No fallback to post.content: that is the raw article HTML, and
              // falling back to it is exactly how unsanitized markup used to reach
              // the DOM while the sanitizer was still loading. sanitizedContent is
              // now computed during render, so it is never empty when there is
              // content to show.
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />

            {/* Related guides: sibling posts and the matching requests page. */}
            {(relatedCategory || relatedPosts.length > 0) && (
              <nav aria-labelledby="related-guides" className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-6">
                <h2 id="related-guides" className="font-display-lg text-xl text-[#b04a15] dark:text-[#e07b3a] mb-3 font-bold">Related guides</h2>
                <ul className="space-y-2 text-stone-700 dark:text-stone-300">
                  {relatedCategory && (
                    <li>
                      <Link href={`/requests/category/${relatedCategory.slug}`} className="font-semibold text-[#b04a15] dark:text-orange-400 hover:underline">
                        See live {relatedCategory.name.toLowerCase()} requests near you
                      </Link>
                    </li>
                  )}
                  {relatedPosts.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}`} className="hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:underline">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Share Story, desktop only (lg+): same buttons as the tablet sidebar,
                which is hidden at lg. Phones show neither, as before. */}
            <div className="hidden lg:block mt-10">
              <div className="flex flex-col gap-3 relative">
                <span className="font-label-sm text-3xs text-[#78716c] dark:text-[#a8a29e] uppercase tracking-wider mb-1 font-bold">
                  Share Story
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEmailShare}
                    aria-label="Share via Email"
                    title="Share via Email"
                    className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <MaterialIcon name="mail" />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    aria-label="Copy Link"
                    title="Copy Link"
                    className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:border-[#b04a15]/60 dark:hover:border-[#e07b3a]/60 hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <MaterialIcon name="link" />
                  </button>
                  {copied && (
                    <span className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-semibold animate-pulse absolute left-28 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 px-2.5 py-1.5 rounded-lg shadow-sm">Copied!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Read Next row below the article: phones and tablets (desktop has the right column) */}
            {recommendedPosts.length > 0 && (
              <section className="mt-12 lg:hidden">
                  <h2 className="font-display-lg text-2xl text-[#b04a15] dark:text-[#e07b3a] mb-6 font-bold">{t("readNext")}</h2>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${recommendedPosts.length >= 3 ? "lg:grid-cols-3" : ""} gap-6`}>
                    {recommendedPosts.map((rec, i) => {
                      const tr = translatePost(rec);
                      return (
                        <div key={rec.slug} className="ck-blog-card-in" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
                          <Link className="group block" href={`/blog/${rec.slug}`}>
                            <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-stone-200 dark:border-stone-700">
                              <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                                <Image src={rec.image} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover object-center" />
                              </div>
                            </div>
                            <span className="text-[#b04a15] dark:text-[#e07b3a] font-label-sm text-xs uppercase tracking-wide font-bold">
                              {tr.category}
                            </span>
                            <p className="font-headline-md text-base text-stone-800 dark:text-stone-200 mt-1 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors leading-snug">
                              {tr.title}
                            </p>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
              </section>
            )}
            </div>

            {/* Right Sidebar: Next For You */}
            <aside className="ck-blog-aside-right hidden lg:block lg:col-span-1 min-w-0 pl-8 border-l border-stone-200 dark:border-stone-700">
              <div className="sticky top-[120px] flex max-h-[calc(100vh-144px)] flex-col">
                {/* Search Stories — live dropdown, same ranking as the blog listing page */}
                <div ref={searchBoxRef} className="relative z-20 shrink-0 mb-[clamp(1rem,3vh,2rem)]">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500" />
                    <input
                      className="pl-9 pr-8 py-2.5 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#b04a15] transition-all"
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
                    {isSearchFocused && searchQuery.trim() !== "" && (
                      <div
                        className="ck-blog-search-in absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-30 overflow-hidden"
                      >
                        {liveSearchResults.length > 0 ? (
                          <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                            {liveSearchResults.map((result) => {
                              const tr = translatePost(result);
                              return (
                                <li key={result.slug}>
                                  <Link
                                    href={`/blog/${result.slug}`}
                                    onClick={() => setIsSearchFocused(false)}
                                    className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                                  >
                                    <img
                                      src={result.image}
                                      alt={tr.title}
                                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-3xs font-bold text-[#b04a15] dark:text-orange-400 uppercase tracking-wide truncate">
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
                      </div>
                    )}
                </div>

                <h2 className="relative z-10 shrink-0 font-display-lg text-[clamp(1rem,2.4vh,1.125rem)] leading-snug whitespace-nowrap text-[#b04a15] dark:text-[#e07b3a] mb-[clamp(0.75rem,2vh,1rem)] pb-0.5 font-bold">{t("readNext")}</h2>
                <div className="min-h-0 flex-1 overflow-y-auto ck-no-scrollbar flex flex-col gap-[clamp(0.75rem,2.2vh,1.25rem)]">
                  {recommendedPosts.slice(0, 2).map((rec, i) => {
                    const tr = translatePost(rec);
                    return (
                      <div key={rec.slug} className="ck-blog-card-in" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
                        <Link className="group block" href={`/blog/${rec.slug}`}>
                          <div className="w-full h-[clamp(3.5rem,11vh,5.5rem)] rounded-xl overflow-hidden mb-2 border border-stone-200 dark:border-stone-700">
                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                              <Image src={rec.image} alt="" fill sizes="(min-width: 1280px) 224px, 176px" className="object-cover object-center" />
                            </div>
                          </div>
                          <span className="text-[#b04a15] dark:text-[#e07b3a] font-label-sm text-xs uppercase tracking-wide font-bold">
                            {tr.category}
                          </span>
                          <p className="break-words font-headline-md text-sm text-stone-800 dark:text-stone-200 mt-1 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors leading-snug">
                            {tr.title}
                          </p>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </article>

      </div>

    </div>
  );
}
