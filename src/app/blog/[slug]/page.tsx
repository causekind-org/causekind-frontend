"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { blogPosts } from "../../../data/blogData";
import { AnimatedWrapper } from "../../components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "../../components/StaggerContainer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function BlogReadingPage({ params }: PageProps) {
  const { slug } = use(params);
  const post = blogPosts.find((p) => p.slug === slug);

  const [boldMode, setBoldMode] = useState(false);
  const [fontMode, setFontMode] = useState("font-serif-mode");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailShare = () => {
    if (typeof window !== "undefined" && post) {
      const subject = encodeURIComponent(post.title);
      const body = encodeURIComponent(`Check out this article: ${post.title}\n\nRead here: ${window.location.href}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

  // Filter out the current post from recommendations
  const recommendedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div id="page-body" className={`${fontMode} ${boldMode ? "bold-mode-active" : ""} min-h-screen bg-[#faf8f5] dark:bg-[#0c0a09] transition-colors duration-300 pt-24`}>
      {/* Main Content Area */}
      <main className="pb-xl">
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
                {/* Category badge overlaid bottom-left */}
                <div className="absolute top-5 left-5">
                  <span className="inline-block px-3 py-1 bg-orange-300 text-orange-900 font-label-sm text-xs rounded-full uppercase tracking-wider font-semibold">
                    {post.category}
                  </span>
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
                <div className="bg-[#faf8f5] dark:bg-[#1c1917] backdrop-blur-md p-6 rounded-2xl border border-[#b04a15]/20 dark:border-[#e07b3a]/20 shadow-sm text-[#1c1917] dark:text-[#e7e5e4]">
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
                    <div className="relative">
                      <select
                        value={fontMode}
                        onChange={(e) => setFontMode(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white dark:bg-stone-800 border border-[#b04a15]/20 dark:border-[#e07b3a]/20 rounded-xl font-body-md text-sm text-[#1c1917] dark:text-[#e7e5e4] appearance-none focus:outline-none focus:border-[#b04a15] dark:focus:border-[#e07b3a] focus:ring-1 focus:ring-[#b04a15]/50 dark:focus:ring-[#e07b3a]/50 transition-all cursor-pointer shadow-sm truncate"
                      >
                        <option value="font-serif-mode">Source Serif</option>
                        <option value="font-sans-mode">Plus Jakarta</option>
                        <option value="font-inter-mode">Inter Sans</option>
                        <option value="font-lora-mode">Lora Serif</option>
                        <option value="font-mono-mode">Roboto Mono</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#b04a15] dark:text-[#e07b3a] pointer-events-none text-[20px] leading-none">
                        expand_more
                      </span>
                    </div>
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
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />

            {/* Right Sidebar: Next For You */}
            <motion.aside
              className="hidden lg:block lg:col-span-3 pl-8 border-l border-stone-200 dark:border-stone-700"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="sticky top-[120px]">
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
