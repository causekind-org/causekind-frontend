"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FEATURES } from "@/lib/features";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  UserCheck,
  MapPin,
  MessageSquare,
  Award,
  ShieldCheck,
  FileText,
  HeartHandshake,
  Building2,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { LANDING_ROUTES } from "@/lib/landingConstants";
import mStyles from "./HowItWorksMobile.module.css";

type RoleTab = "donor" | "donee" | "ngo";

interface StepData {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  microAnimation: string;
}

interface TabConfig {
  id: RoleTab;
  label: string;
  roleColor: string;
  roleColorHover: string;
  roleBgSoft: string;
  roleBorder: string;
  roleGlow: string;
  buttonText: string;
  buttonHref: string;
  steps: StepData[];
}

const TABS: TabConfig[] = [
  {
    id: "donor",
    label: "I want to give",
    roleColor: "#B5480F",
    roleColorHover: "#8F3708",
    roleBgSoft: "#FBEDE3",
    roleBorder: "rgba(181, 72, 15, 0.25)",
    roleGlow: "rgba(181, 72, 15, 0.15)",
    buttonText: "Join as Donor",
    buttonHref: LANDING_ROUTES.donorRegister,
    steps: [
      {
        number: "01",
        title: "Sign up for free",
        description: "Create your account in a minute.",
        icon: UserCheck,
        microAnimation: "pulse",
      },
      {
        number: "02",
        title: "See needs near you",
        description: "Browse verified requests within 10 km.",
        icon: MapPin,
        microAnimation: "bounce",
      },
      {
        number: "03",
        title: "Offer an item",
        description: "Choose a need you can fulfil and chat to fix a time and place.",
        icon: MessageSquare,
        microAnimation: "type",
      },
      {
        number: "04",
        title: "Hand it over",
        description: "Give the item in person and receive your impact certificate.",
        icon: Award,
        microAnimation: "shine",
      },
    ],
  },
  {
    id: "donee",
    label: "I need help",
    roleColor: "#1e3a60",
    roleColorHover: "#2d5a96",
    roleBgSoft: "#E8EFF8",
    roleBorder: "rgba(30, 58, 96, 0.25)",
    roleGlow: "rgba(30, 58, 96, 0.15)",
    buttonText: "Join as a Donee",
    buttonHref: LANDING_ROUTES.doneeRegister,
    steps: [
      {
        number: "01",
        title: "Sign up for free",
        description: "Create your account in a minute.",
        icon: UserCheck,
        microAnimation: "pulse",
      },
      {
        number: "02",
        title: "Get verified",
        description: "We check your ID and address to keep everyone safe.",
        icon: ShieldCheck,
        microAnimation: "shield",
      },
      {
        number: "03",
        title: "Post your need",
        description: "Tell us exactly what item you need and why.",
        icon: FileText,
        microAnimation: "shake",
      },
      {
        number: "04",
        title: "Receive with dignity",
        description: "A donor nearby offers it, and you meet to collect it.",
        icon: HeartHandshake,
        microAnimation: "shine",
      },
    ],
  },
  {
    id: "ngo",
    label: "I'm an NGO",
    roleColor: "#1F6B3F",
    roleColorHover: "#14482a",
    roleBgSoft: "#E5F1E9",
    roleBorder: "rgba(31, 107, 63, 0.25)",
    roleGlow: "rgba(31, 107, 63, 0.15)",
    buttonText: FEATURES.ngoRegistration ? "Register your NGO" : "NGO registration · Coming soon",
    // Empty while NGO signup is off: the button renders as "Coming soon", not a link.
    buttonHref: FEATURES.ngoRegistration ? LANDING_ROUTES.ngoRegister : "",
    steps: [
      {
        number: "01",
        title: "Register your organisation",
        description: "Share your registration details.",
        icon: Building2,
        microAnimation: "pulse",
      },
      {
        number: "02",
        title: "Get verified",
        description: "Our team reviews your documents.",
        icon: ShieldCheck,
        microAnimation: "shield",
      },
      {
        number: "03",
        title: "Post needs for your people",
        description: "Request items for your school, shelter or community.",
        icon: PackageCheck,
        microAnimation: "shake",
      },
      {
        number: "04",
        title: "Receive and confirm",
        description: "Collect donations and confirm each handover.",
        icon: Award,
        microAnimation: "shine",
      },
    ],
  },
];

// Interactive 3D Card with solid background & mouse tilt
function StepCard({
  step,
  index,
  roleColor,
  roleBgSoft,
  roleBorder,
}: {
  step: StepData;
  index: number;
  roleColor: string;
  roleBgSoft: string;
  roleBorder: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if coarse pointer (touch device)
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    setRotateX(-y / 14);
    setRotateY(x / 14);
  }, []);

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const IconComp = step.icon;

  return (
    <motion.div
      ref={cardRef}
      className="relative z-10 w-full h-full"
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{
        duration: 0.4,
        delay: reduceMotion ? 0 : index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
      }}
    >
      <div
        className="relative h-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs transition-all duration-200 flex flex-col justify-between group overflow-hidden"
        style={{
          transform: isHovered && !reduceMotion ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px)` : "none",
          boxShadow: isHovered ? `0 14px 28px -10px ${roleBorder}` : undefined,
          borderColor: isHovered ? roleColor : roleBorder,
        }}
      >
        {/* Subtle top role accent highlight */}
        <div
          className="absolute top-0 inset-x-0 h-1 transition-colors duration-300"
          style={{ backgroundColor: isHovered ? roleColor : "transparent" }}
        />

        {/* Card Content: Step number & Animated Micro-Icon */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span
              className="text-3xs font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: roleBgSoft,
                color: roleColor,
              }}
            >
              Step {step.number}
            </span>

            {/* Micro-animated icon container */}
            <div
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-2xs shrink-0"
              style={{
                backgroundColor: roleBgSoft,
                color: roleColor,
              }}
            >
              <IconComp
                className={`w-4 h-4 sm:w-5 sm:h-5 ${step.microAnimation === "bounce"
                    ? "animate-bounce"
                    : step.microAnimation === "pulse"
                      ? "animate-pulse"
                      : ""
                  }`}
              />
            </div>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug mb-1.5">
            {step.title}
          </h3>

          <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Phone step card (< 768px): a compact row — big italic step number, title and
 * description, role icon — so a role's four steps fit on one screen and can be
 * read at a glance while the carousel moves between roles.
 */
function MobileStepCard({ step }: { step: StepData }) {
  const IconComp = step.icon;
  return (
    <article className={mStyles.card}>
      <span className={mStyles.numeral} aria-hidden>
        {step.number}
      </span>
      <div>
        <h3 className={mStyles.title}>
          <span className="sr-only">Step {step.number}: </span>
          {step.title}
        </h3>
        <p className={mStyles.desc}>{step.description}</p>
      </div>
      <span className={mStyles.icon} aria-hidden>
        <IconComp className="w-[1.05rem] h-[1.05rem]" />
      </span>
    </article>
  );
}

/** How long each role stays up on phones before the carousel moves on. */
const AUTO_ADVANCE_MS = 2000;
/** Desktop shows four cards of text per role: give them time to be read. */
const AUTO_ADVANCE_DESKTOP_MS = 2000;

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const reduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<RoleTab>("donor");
  const [hasScrolledIn, setHasScrolledIn] = useState(false);

  // The roles advance on their own while the section is on screen (every 2s on
  // phones, 2s on desktop, paused while the mouse rests on the tabs or cards), until
  // the reader picks a role or swipes — then it is theirs.
  const onScreen = useInView(sectionRef, { amount: 0.35 });
  const [isPhone, setIsPhone] = useState(false);
  const [userDriven, setUserDriven] = useState(false);
  // Only the tabs and cards pause it: the section fills the screen, so pausing on
  // the whole section kept desktop permanently paused under a resting mouse.
  const [hovering, setHovering] = useState(false);
  const pauseOnHover = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setHovering(true);
  };
  const resumeOnLeave = () => setHovering(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const autoplay = onScreen && !reduceMotion && !userDriven && !hovering;
  const advanceMs = isPhone ? AUTO_ADVANCE_MS : AUTO_ADVANCE_DESKTOP_MS;
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => {
      setActiveTab(TABS[(activeIndex + 1) % TABS.length].id);
    }, advanceMs);
    return () => window.clearTimeout(id);
  }, [autoplay, activeIndex, advanceMs]);

  const selectTab = (id: RoleTab) => {
    setUserDriven(true);
    setActiveTab(id);
  };

  const go = (dir: 1 | -1) => {
    selectTab(TABS[(activeIndex + dir + TABS.length) % TABS.length].id);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
  };

  useEffect(() => {
    if (isInView && !hasScrolledIn) {
      setHasScrolledIn(true);
    }
  }, [isInView, hasScrolledIn]);

  const currentTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];
  const labelText = "HOW IT WORKS";

  // Keyboard navigation for accessible tabs (Left/Right Arrow)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="ck-m-section relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 bg-[#FAF8F5] dark:bg-[#140E0B] text-[#1C1410] dark:text-[#F5EEE8] overflow-hidden transition-colors duration-500"
      style={
        {
          "--role-color": currentTabConfig.roleColor,
          "--role-hover": currentTabConfig.roleColorHover,
          "--role-bg-soft": currentTabConfig.roleBgSoft,
          "--role-border": currentTabConfig.roleBorder,
          "--role-glow": currentTabConfig.roleGlow,
        } as React.CSSProperties
      }
    >
      {/* Morphing ambient background glow */}
      <div className="max-md:hidden absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 transition-all duration-700">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] rounded-full blur-3xl transition-colors duration-700"
          style={{ backgroundColor: currentTabConfig.roleGlow }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full">
        {/* Eyebrow / Letter-by-letter typing label */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className="h-0.5 w-6 rounded-full transition-colors duration-500"
            style={{ backgroundColor: "var(--role-color)" }}
          />
          <p
            className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] flex overflow-hidden transition-colors duration-500"
            style={{ color: "var(--role-color)" }}
          >
            {labelText.split("").map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 4 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.03, delay: 0.05 + index * 0.02 }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </p>
          <span
            className="h-0.5 w-6 rounded-full transition-colors duration-500"
            style={{ backgroundColor: "var(--role-color)" }}
          />
        </div>

        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-5">
          <h2
            id="how-it-works-heading"
            className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-snug"
          >
            Simple steps. <span style={{ color: "var(--role-color)" }} className="transition-colors duration-500">Whoever you are.</span>
          </h2>
        </div>

        {/* Three Accessible Tabs Switcher */}
        <div className="flex justify-center mb-3 md:mb-6">
          <div
            ref={tabListRef}
            role="tablist"
            onPointerEnter={pauseOnHover}
            onPointerLeave={resumeOnLeave}
            aria-label="User role journey selector"
            onKeyDown={handleKeyDown}
            className="inline-flex p-1 rounded-full bg-stone-200/70 dark:bg-stone-900/90 border border-stone-300/60 dark:border-stone-800 shadow-inner max-w-full overflow-x-auto scrollbar-none"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectTab(tab.id)}
                  className={`relative px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shrink-0 ${isActive
                      ? "text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: tab.roleColor }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phone: one progress segment per role; the active one fills while
            the carousel waits to move on. */}
        <div className={`${mStyles.segs} md:hidden mb-4`} aria-hidden>
          {TABS.map((tab, i) => (
            <span key={tab.id} className={mStyles.seg}>
              <span
                key={i === activeIndex && autoplay ? `run-${activeTab}` : "idle"}
                className={mStyles.fill}
                data-s={i === activeIndex ? (autoplay ? "run" : "on") : "off"}
                style={{ ["--dur" as string]: `${advanceMs}ms` } as React.CSSProperties}
              />
            </span>
          ))}
        </div>

        {/* Steps Grid with Connecting Path */}
        <div
          role="tabpanel"
          onPointerEnter={pauseOnHover}
          onPointerLeave={resumeOnLeave}
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="relative w-full"
        >
          {/* Connecting SVG Path (Desktop Horizontal Line, placed at z-0 behind solid cards) */}
          <div className="hidden lg:block absolute top-1/2 left-4 right-4 -translate-y-6 pointer-events-none z-0">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 1000 40" fill="none">
              <motion.path
                d="M 60 20 L 940 20"
                stroke="var(--role-color)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                key={activeTab} // redraws when tab switches
                transition={{ duration: hasScrolledIn ? 0.6 : 1.0, ease: "easeInOut" }}
              />
            </svg>
          </div>

          {/* DESKTOP: 4 Symmetrically Centred Steps Cards Grid */}
          <div className="relative z-10 hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch justify-items-stretch w-full">
              {currentTabConfig.steps.map((step, idx) => (
                <StepCard
                  key={`${activeTab}-step-${step.number}`}
                  step={step}
                  index={idx}
                  roleColor={currentTabConfig.roleColor}
                  roleBgSoft={currentTabConfig.roleBgSoft}
                  roleBorder={currentTabConfig.roleBorder}
                />
              ))}
          </div>

          {/* PHONE (< 768px): the roles on a horizontal track — current in
              the middle, next waiting on the right, previous on the left.
              Swipe to move between them. */}
          <div
            className={`${mStyles.viewport} relative z-10 md:hidden`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {TABS.map((tab, ti) => {
              const rel = (ti - activeIndex + TABS.length) % TABS.length;
              const state = rel === 0 ? "active" : rel === 1 ? "after" : "before";
              return (
                <ol
                  key={tab.id}
                  className={mStyles.panel}
                  data-state={state}
                  aria-hidden={rel !== 0}
                  aria-label={`${tab.label}: steps`}
                  style={{ ["--role" as string]: tab.roleColor, ["--soft" as string]: tab.roleBgSoft } as React.CSSProperties}
                >
                  {tab.steps.map((step, idx) => (
                    <li key={step.number} className={mStyles.row} style={{ ["--i" as string]: idx } as React.CSSProperties}>
                      <MobileStepCard step={step} />
                    </li>
                  ))}
                </ol>
              );
            })}
          </div>
          {/* Role CTA Button at the bottom of the active tab */}
          <motion.div
            className="flex justify-center mt-5 sm:mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            key={`cta-${activeTab}`}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            {currentTabConfig.buttonHref ? <Link href={currentTabConfig.buttonHref}>
              <motion.button
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full font-extrabold text-xs sm:text-sm text-white shadow-sm hover:shadow-md transition-all duration-300 active:scale-98 cursor-pointer"
                style={{
                  backgroundColor: currentTabConfig.roleColor,
                  boxShadow: `0 8px 22px -6px ${currentTabConfig.roleBorder}`,
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{currentTabConfig.buttonText}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            </Link> : <span aria-disabled="true"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full font-extrabold text-xs sm:text-sm text-white opacity-70 cursor-not-allowed"
                style={{ backgroundColor: currentTabConfig.roleColor }}
              >
                {currentTabConfig.buttonText}
              </span>}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

