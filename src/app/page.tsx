"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { blogPosts, insiderTips } from "../data/blogData";
import { AnimatedWrapper } from "./components/AnimatedWrapper";
import { StaggerContainer, itemVariants } from "./components/StaggerContainer";

export default function BlogListingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [liveFeed, setLiveFeed] = useState([
    { id: 1, time: "2 MINUTES AGO", user: "Alex M.", text: "pledged 5 hours to Habitat Restoration." },
    { id: 2, time: "15 MINUTES AGO", user: "Clean Water Initiative", text: "reached 100% funding goals." },
    { id: 3, time: "42 MINUTES AGO", user: "Sarah L.", text: "shared \"The Forest Way\" with 40 friends." },
  ]);

  // Handle header scroll height and shadow transitions
  const [scrolled, setScrolled] = useState(false);

  // Carousel state for Insider Tips section
  const [tipIndex, setTipIndex] = useState(0);
  const [tipDirection, setTipDirection] = useState(1); // 1 = forward, -1 = backward

  const goToTip = (next: number) => {
    setTipDirection(next > tipIndex ? 1 : -1);
    setTipIndex(next);
  };
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Micro-interaction for live impact feed (cycling items)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveFeed((prev) => {
        const next = [...prev];
        const last = next.pop();
        if (last) {
          next.unshift(last);
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Search filtering
  const filteredPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* TopAppBar */}
      <header
        className={`fixed top-0 w-full z-50 bg-surface-cream border-b border-outline-variant transition-all duration-300 ${scrolled ? "shadow-sm h-16" : "h-20"
          }`}
      >
        <nav className="flex justify-between items-center h-full px-margin-mobile md:px-lg max-w-container-max mx-auto">
          <div className="flex items-center gap-base md:gap-lg">
            <Link
              href="/"
              className="font-display-lg-mobile text-[28px] md:text-[32px] font-bold text-primary"
            >
              ImpactStory
            </Link>
          </div>
          <div className="flex items-center gap-sm">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/40 text-lg">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2.5 bg-surface-container-low/75 border border-outline-variant/60 rounded-full text-sm font-body-md text-on-surface focus:outline-none focus:border-rust-action focus:ring-2 focus:ring-rust-action/10 transition-all w-44 sm:w-64 hover:bg-surface-container-low"
                placeholder="Search stories..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </nav>
      </header>

      <main className="pt-32 pb-section-gap">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-lg">
          {/* Hero & Community Proof */}
          <section className="mb-section-gap">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-md">
              <div className="max-w-2xl">
                <AnimatedWrapper delay={0} duration={0.5} direction="up">
                  <span className="inline-block py-1 px-3 bg-tertiary-fixed text-on-tertiary-fixed rounded-lg font-label-md text-label-sm mb-base">
                    COMMUNITY ACTION
                  </span>
                </AnimatedWrapper>
                <AnimatedWrapper delay={0.1} duration={0.6} direction="up">
                  <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-base">
                    Stories that drive the world forward.
                  </h1>
                </AnimatedWrapper>
                <AnimatedWrapper delay={0.22} duration={0.6} direction="up">
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    Real impact, verified by the community. Join 4,200+ members taking action today.
                  </p>
                </AnimatedWrapper>
              </div>
              <AnimatedWrapper delay={0.3} duration={0.55} direction="left">
                <div className="flex items-center gap-sm bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-dim">
                      <img
                        alt=""
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI"
                      />
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-dim">
                      <img
                        alt=""
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbVu_-pOh-f7e2hx3VnwWZ2NbHkMAI7EMq1TBAY5Fgaj1oKNc7bFXjy9MGdCPIX56D59P0foV_ZRQbqbaFUiy8kVu_0mQ9hCX5QwqMG109cDDQHhFN-MwOJG5UqtvQgv2tV36g98X2XvBcLQsgR26ebLHxMgwJWHNBbXUwmGl0WAy6k4mqPhsaTk5GHC6jISpihC0gyulo9EEjHTHE0pctBU2RTRhc2VxAmPaqoojaXtkhjoG6q9qkUBCRtqhp0LTgAm4RhBlm6508"
                      />
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-dim">
                      <img
                        alt=""
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAasO7qqYmAlXTl-FyW3VOc3g28nDHg2ZNsD_W0I15Tf25KUJuEyxEOJ_WnQeazis6ol6tCZAx1_rwqaKXIn76ngPNG9KScsKOVOmiu-E9wxoQRewKpFysBkie89JIC0XJmj_8b36ZnAOoi6sCSxKyTLHjWgDKmPyXaS6zhX57a-ek9nv0bFku-FsmyJwxuABh59MBoiw3MiNib5GLQqCB5SNBVaMdAvuBdfd8-iO5KgHN0pNUK_NjugYYHPTsfk9xNl3eoCO6-a-bp"
                      />
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-primary">142 Members</p>
                    <p className="text-on-surface-variant leading-tight font-label-md">reading now</p>
                  </div>
                </div>
              </AnimatedWrapper>
            </div>

            {/* Featured Story Bento */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* Large Featured Card */}
              <AnimatedWrapper inView delay={0} duration={0.6} direction="up" className="md:col-span-8">
                {filteredPosts.length > 0 ? (
                  (() => {
                    const featured = filteredPosts[0];
                    return (
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="group block cursor-pointer overflow-hidden rounded-2xl border border-outline-variant/60 bg-white hover:shadow-[0_20px_50px_rgba(176,74,21,0.08)] transition-all duration-500 hover:-translate-y-1"
                      >
                        <div className="aspect-[16/9] overflow-hidden relative">
                          <div className="absolute inset-0 bg-on-background/5 group-hover:bg-transparent transition-colors z-10"></div>
                          <img
                            alt={featured.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                            src={featured.image}
                          />
                          <div className="absolute top-4 left-4 z-20">
                            <span className="bg-rust-action text-white px-3 py-1 rounded-lg font-label-md text-label-sm uppercase tracking-wider">
                              {featured.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-6 md:p-8">
                          <h2 className="font-headline-lg text-headline-lg text-primary mb-3 font-bold group-hover:text-rust-action transition-colors leading-tight">
                            {featured.title}
                          </h2>
                          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-5">
                            {featured.description}
                          </p>
                          <div className="flex items-center justify-between">
                            {featured.peopleActed && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-rust-action text-lg animate-pulse">
                                  local_fire_department
                                </span>
                                <span className="font-label-md text-label-sm text-rust-action font-semibold">
                                  {featured.peopleActed} People Acted
                                </span>
                              </div>
                            )}
                            <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              Read Story{" "}
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })()
                ) : (
                  <div className="bg-white border border-outline-variant/60 p-12 rounded-2xl text-center">
                    <p className="text-on-surface-variant font-medium">No stories match your search query.</p>
                  </div>
                )}
              </AnimatedWrapper>

              {/* Live Impact Feed Sidebar */}
              <AnimatedWrapper inView delay={0.15} duration={0.6} direction="right" className="md:col-span-4 flex flex-col gap-gutter">
                <div className="bg-gradient-to-br from-surface-container-low to-surface-container-lowest border border-outline-variant/60 text-on-surface p-6 rounded-2xl flex-1 relative overflow-hidden shadow-sm">
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        <h3 className="font-headline-md text-lg uppercase tracking-widest text-primary font-bold">
                          Live Impact Feed
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {liveFeed.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`pl-4 py-1.5 transition-all duration-500 border-l-2 ${idx === 0 ? "border-rust-action bg-white/40 rounded-r-lg" : "border-rust-action/30"
                              }`}
                          >
                            <p className="font-label-md text-[9px] text-rust-action font-bold opacity-80 uppercase tracking-wider">
                              {item.time}
                            </p>
                            <p className="font-body-md text-xs leading-normal mt-0.5">
                              <strong>{item.user}</strong> {item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="mt-6 w-full py-3 bg-rust-action text-white rounded-xl font-bold text-label-md hover:bg-primary transition-all duration-300 shadow-md hover:-translate-y-0.5">
                      Start Your Impact
                    </button>
                  </div>
                </div>
              </AnimatedWrapper>
            </div>

            {/* List remaining filtered posts */}
            {filteredPosts.length > 1 && (
              <StaggerContainer inView delayStart={0.05} staggerDelay={0.12} className="mt-xl grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {filteredPosts.slice(1).map((post) => (
                  <motion.div key={post.slug} variants={itemVariants}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group bg-white border border-outline-variant/60 rounded-2xl overflow-hidden hover:shadow-[0_20px_40px_rgba(30,58,96,0.05)] transition-all duration-500 hover:-translate-y-1 block"
                    >
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <img
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          src={post.image}
                        />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="bg-rust-action text-white px-3 py-1 rounded-lg font-label-md text-label-sm uppercase tracking-wider">
                            {post.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-headline-md text-headline-md text-primary mb-2 font-bold group-hover:text-rust-action transition-colors">
                          {post.title}
                        </h3>
                        <p className="font-body-md text-sm text-on-surface-variant mb-4 line-clamp-2">
                          {post.description}
                        </p>
                        <div className="flex justify-between items-center text-sm font-label-md text-primary font-bold">
                          <span>{post.readTime}</span>
                          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Read <span className="material-symbols-outlined">arrow_forward</span>
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
          <section className="mb-section-gap overflow-hidden">
            <AnimatedWrapper inView direction="up" duration={0.5}>
              <div className="flex items-center justify-between mb-md">
                <div className="flex flex-col">
                  <h2 className="font-headline-lg text-headline-lg text-primary font-bold">
                    Insider Tips and Tricks for Maximum Efficiency
                  </h2>
                  <p className="text-on-surface-variant font-body-md mt-1">
                    Discover valuable insights to optimize your impact and maximize efficiency.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    id="tips-prev"
                    onClick={() => goToTip((tipIndex - 1 + insiderTips.length) % insiderTips.length)}
                    className="material-symbols-outlined p-2.5 border border-outline-variant/60 rounded-full hover:bg-surface-container-low hover:border-rust-action/40 transition-all text-on-surface-variant hover:text-rust-action cursor-pointer"
                  >
                    chevron_left
                  </button>
                  <button
                    id="tips-next"
                    onClick={() => goToTip((tipIndex + 1) % insiderTips.length)}
                    className="material-symbols-outlined p-2.5 border border-outline-variant/60 rounded-full hover:bg-surface-container-low hover:border-rust-action/40 transition-all text-on-surface-variant hover:text-rust-action cursor-pointer"
                  >
                    chevron_right
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
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-gutter"
                >
                  {[0, 1, 2].map((offset) => {
                    const tip = insiderTips[(tipIndex + offset) % insiderTips.length];
                    return (
                      <div
                        key={tip.slug}
                        className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-2xl flex flex-col relative overflow-hidden h-[400px] group hover:bg-white hover:shadow-[0_15px_35px_rgba(30,58,96,0.05)] hover:-translate-y-1 transition-all duration-500"
                      >
                        <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <span className="material-symbols-outlined text-[100px] text-primary">
                            {tip.icon}
                          </span>
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div>
                            <h3 className="font-headline-md text-headline-md text-primary mb-3 font-bold">
                              {tip.title}
                            </h3>
                            <p className="font-body-md text-sm text-on-surface-variant mb-6 leading-relaxed">
                              {tip.description}
                            </p>
                          </div>
                          <a
                            className="font-label-md text-sm text-primary flex items-center gap-1 hover:underline mt-auto group/link"
                            href="#"
                          >
                            Read case study{" "}
                            <span className="material-symbols-outlined text-sm transition-transform group-hover/link:translate-x-1">arrow_forward</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className="flex gap-1.5 mt-md">
              {insiderTips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToTip(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === tipIndex ? "w-12 bg-rust-action" : "w-12 bg-outline-variant/60"
                    }`}
                />
              ))}
            </div>
          </section>

          {/* Maximize Efficiency Banner */}
          <section className="mb-section-gap">
            <AnimatedWrapper inView direction="up" duration={0.65}>
              <div className="bg-[#30312f] rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row items-center relative border border-outline-variant/10">
                <div className="absolute inset-0 bento-pattern pointer-events-none"></div>
                <div className="w-full md:w-1/2 p-lg md:p-xl relative z-10 flex justify-center">
                  <img
                    alt="Platform Dashboard Mockup"
                    className="w-full max-w-[400px] h-auto drop-shadow-2xl rounded-2xl border border-white/10 shadow-2xl hover:scale-[1.02] transition-transform duration-500"
                    src="/Change_stories.jpg"
                  />
                </div>
                <div className="w-full md:w-1/2 p-lg md:pr-xl md:py-xl relative z-10 flex flex-col items-start text-left">
                  <h2 className="font-display-lg text-[#ffb597] mb-md text-4xl md:text-5xl font-bold leading-tight">
                    Ready to turn stories into change?
                  </h2>
                  <div className="flex flex-col gap-3.5 mb-8 w-full">
                    <div className="flex items-center gap-3 text-[#eae8e5] hover:text-[#ffb597] transition-colors duration-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        ✓
                      </span>
                      <span className="font-label-md text-sm md:text-base font-medium">Connect with verified cause</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#eae8e5] hover:text-[#ffb597] transition-colors duration-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        ✓
                      </span>
                      <span className="font-label-md text-sm md:text-base font-medium">Track your impact in real time</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#eae8e5] hover:text-[#ffb597] transition-colors duration-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        ✓
                      </span>
                      <span className="font-label-md text-sm md:text-base font-medium">Free to get started</span>
                    </div>
                  </div>
                  <button className="bg-rust-action text-white px-8 py-3.5 rounded-xl font-bold text-label-md hover:bg-white hover:text-primary transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg">
                    Start for Now!
                  </button>
                </div>
              </div>
            </AnimatedWrapper>
          </section>

          {/* Newsletter Section */}
          <section className="mb-section-gap">
            <AnimatedWrapper inView direction="up" duration={0.55} delay={0.05}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-y-6 md:gap-x-12 py-12 border-t border-b border-outline-variant">
                <div className="w-full md:flex-1 max-w-2xl">
                  <h2 className="font-display-lg text-primary text-3xl md:text-4xl font-bold mb-3 leading-tight">
                    Optimize Your Impact with Kind Earth
                  </h2>
                  <p className="font-body-md text-on-surface-variant text-base leading-relaxed">
                    Simplify community management and stay updated with our latest insights.
                  </p>
                </div>
                <div className="w-full md:w-auto flex-shrink-0">
                  <p className="font-label-md text-xs font-bold text-on-surface-variant mb-2">
                    Newsletter
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      className="px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rust-action/25 w-full sm:w-64"
                      placeholder="What's your email?"
                      type="email"
                    />
                    <button className="bg-rust-action text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary transition-all duration-300 shadow-md hover:-translate-y-0.5">
                      Subscribe
                    </button>
                  </div>
                  <p className="font-label-sm text-[10px] text-on-surface-variant/70 mt-2">
                    Subscribe to our newsletter to get the latest ImpactStory news
                  </p>
                </div>
              </div>
            </AnimatedWrapper>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-lg py-xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-lg mb-xl">
            <div className="col-span-2 md:col-span-1">
              <h2 className="font-display-lg-mobile text-[24px] font-bold text-primary mb-sm">
                ImpactStory
              </h2>

            </div>
            <div>
              <h4 className="font-label-md text-sm text-on-surface mb-md">Customers</h4>
              <ul className="space-y-2">
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Sign In
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    System Status
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Refer a Community
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Impact Central
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-md text-sm text-on-surface mb-md">Products</h4>
              <ul className="space-y-2">
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Impact Tracker
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Software
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Mobile App
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-md text-sm text-on-surface mb-md">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Blog
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Research Center
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Podcast
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Webinars
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-md text-sm text-on-surface mb-md">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    About Us
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Press Kit
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Careers
                  </a>
                </li>
                <li>
                  <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                    Sustainability
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-md border-t border-outline-variant gap-md">
            <div className="flex gap-lg">
              <a className="text-xs text-on-surface-variant hover:text-primary" href="#">
                Instagram
              </a>
              <a className="text-xs text-on-surface-variant hover:text-primary" href="#">
                Twitter
              </a>
              <a className="text-xs text-on-surface-variant hover:text-primary" href="#">
                Facebook
              </a>
              <a className="text-xs text-on-surface-variant hover:text-primary" href="#">
                LinkedIn
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-sm">
              <a
                className="font-label-md text-[10px] text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="font-label-md text-[10px] text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="font-label-md text-[10px] text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
                href="#"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
