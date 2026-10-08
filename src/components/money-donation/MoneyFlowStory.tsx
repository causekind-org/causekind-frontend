'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Heart, Users, Banknote, HandHeart, GraduationCap, Stethoscope, Home } from 'lucide-react';
import { MobileInitiatives } from './MobileInitiatives';
import { SahasLogo } from './SahasLogo';
import Link from "@/components/AppLink";

/* ─── Step Data ─── */
const steps = [
  {
    icon: <Heart className="w-5 h-5 md:w-7 md:h-7" />,
    iconBg: 'from-[#f97316] via-[#ea580c] to-[#c2410c]',
    glowColor: 'rgba(234,88,12,0.3)',
    label: 'You Donate',
    headline: 'Your journey starts here.',
    description: 'Your contribution through CauseKind is securely collected and directed toward tangible change.',
    detail: 'UPI · Cards · Net Banking',
  },
  {
    icon: <SahasLogo size={44} className="w-7 h-7 md:w-11 md:h-11" />,
    iconBg: 'from-[#f97316] via-[#ea580c] to-[#c2410c]',
    glowColor: 'rgba(217,119,6,0.3)',
    label: 'Sahas Charitable Trust',
    headline: 'Managed with full transparency.',
    description: 'Sahas Charitable Trust — registered with 12AA and 80G certifications — manages every rupee with accountability.',
    detail: 'Registered · Audited',
  },
  {
    icon: <Banknote className="w-5 h-5 md:w-7 md:h-7" />,
    iconBg: 'from-[#f97316] via-[#ea580c] to-[#c2410c]',
    glowColor: 'rgba(234,88,12,0.3)',
    label: 'Funds Are Allocated',
    headline: 'Every rupee is accounted for.',
    description: 'Funds are allocated across verified programs in education, healthcare, and community welfare.',
    detail: 'Zero overhead',
  },
  {
    icon: <HandHeart className="w-5 h-5 md:w-7 md:h-7" />,
    iconBg: 'from-[#f97316] via-[#ea580c] to-[#c2410c]',
    glowColor: 'rgba(217,119,6,0.3)',
    label: 'Direct Impact',
    headline: 'Real people. Real change.',
    description: 'Your contribution directly reaches families, students, and communities — no middlemen.',
    detail: '',
  },
];

const impactAreas = [
  { icon: <GraduationCap className="w-6 h-6" />, label: 'Education & Scholarships', slug: 'education', color: 'from-[#f97316] to-[#c2410c]', bgAccent: 'bg-amber-500/10 dark:bg-amber-500/15' },
  { icon: <Stethoscope className="w-6 h-6" />, label: 'Healthcare & Medical Aid', slug: 'healthcare', color: 'from-[#f97316] to-[#c2410c]', bgAccent: 'bg-amber-500/10 dark:bg-amber-500/15' },
  { icon: <Home className="w-6 h-6" />, label: 'Community Welfare', slug: 'community-welfare', color: 'from-[#f97316] to-[#c2410c]', bgAccent: 'bg-amber-500/10 dark:bg-amber-500/15' },
  { icon: <Users className="w-6 h-6" />, label: 'Women & Youth Empowerment', slug: 'empowerment', color: 'from-[#f97316] to-[#c2410c]', bgAccent: 'bg-amber-500/10 dark:bg-amber-500/15' },
];

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion() ?? false;
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={reduceMotion ? undefined : handleMouse}
      onMouseLeave={reduceMotion ? undefined : handleLeave}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Story Step ─── */
function StoryStep({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  return (
    <div className="relative flex flex-row md:flex-col items-stretch md:items-center gap-3.5 md:gap-0 md:flex-1 z-10 group">
      {/* Icon orb with gold ring */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: index * 0.18, type: 'spring', bounce: 0.35 }}
          className="relative z-10"
        >
          {/* Glow ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: index * 0.18 + 0.2 }}
            className="absolute inset-0 rounded-xl md:rounded-2xl blur-lg md:blur-xl opacity-50 md:opacity-60"
            style={{ background: step.glowColor }}
          />
          <div className={`relative w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br ${step.iconBg} text-white flex items-center justify-center shadow-md md:shadow-lg ring-2 ring-[#d97706]/40 md:shadow-[0_0_18px_rgba(234,88,12,0.28)]`}>
            {step.icon}
            {/* Step number badge */}
            <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#fffbf5] dark:bg-[#2a1309] text-[#c2410c] dark:text-amber-300 text-[0.625rem] md:text-xs font-extrabold flex items-center justify-center shadow-md border border-amber-300/70 dark:border-amber-700/60">
              {index + 1}
            </div>
          </div>
        </motion.div>

        {/* Mobile connecting line */}
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: index * 0.18 + 0.25 }}
            className="w-0.5 flex-1 min-h-3 md:hidden rounded-full bg-gradient-to-b from-[#ea580c]/70 via-[#f59e0b]/50 to-amber-300/30 dark:to-amber-800/30 origin-top my-1.5"
          />
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, delay: index * 0.18 + 0.1 }}
        className={`flex-1 min-w-0 md:text-center pt-0.5 md:pt-0 md:mt-5 md:pb-0 md:px-2 ${isLast ? 'pb-0' : 'pb-4'}`}
      >
        {/* On mobile the detail chip sits beside the label to save a line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5 md:mb-1.5 md:block">
          <span className="inline-block text-[0.625rem] md:text-[0.6875rem] font-bold tracking-widest uppercase text-amber-800 dark:text-amber-300">
            {step.label}
          </span>
          {step.detail && (
            <span className="md:hidden inline-block text-[0.625rem] font-semibold leading-none text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-1 rounded-full">
              {step.detail}
            </span>
          )}
        </div>
        <h3 className="text-[0.9375rem] md:text-lg lg:text-xl font-extrabold text-foreground mb-1 md:mb-2 leading-snug">
          {step.headline}
        </h3>
        <p className="text-[0.8125rem] md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed md:mb-3">
          {step.description}
        </p>
        {step.detail && (
          <span className="hidden md:inline-block text-[0.6875rem] font-semibold text-amber-900 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-300/60 dark:border-amber-700/50 shadow-xs">
            {step.detail}
          </span>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Main Component ─── */
export function MoneyFlowStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const bgX = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);

  return (
    <section ref={containerRef} className="relative py-8 sm:py-14 lg:py-16 overflow-hidden flex flex-col justify-center">

      {/* Decorative background blobs */}
      <motion.div
        style={{ y: bgY }}
        className="absolute -right-40 top-1/4 w-[min(500px,88vw)] h-[min(500px,88vw)] rounded-full bg-amber-500/10 blur-3xl pointer-events-none"
      />
      <motion.div
        style={{ y: bgX }}
        className="absolute -left-40 bottom-1/4 w-[min(400px,74vw)] h-[min(400px,74vw)] rounded-full bg-orange-500/10 blur-3xl pointer-events-none"
      />

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-2 md:pt-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-5 sm:mb-10 text-center max-w-3xl mx-auto"
        >
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-900 dark:text-amber-200 mb-3 md:mb-4 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 px-3 py-1 rounded-full shadow-xs">
            Where Your Money Goes
          </span>
          <h2 className="text-[1.625rem] sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-2.5 md:mb-5 text-balance">
            From you, to those who need it most.
          </h2>
          <p className="text-sm sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl mx-auto">
            Every donation follows a clear, accountable path. Here&apos;s exactly how your contribution creates real impact.
          </p>
        </motion.div>

        {/* ── Horizontal Timeline ── */}
        <div className="relative mb-6 md:mb-8 rounded-2xl md:rounded-none border border-amber-200/80 dark:border-amber-800/40 md:border-0 bg-[#fffdfa]/85 dark:bg-[#23120a]/80 md:bg-transparent md:dark:bg-transparent p-4 md:p-0 shadow-[0_4px_20px_rgba(217,119,6,0.07)] md:shadow-none">
          {/* Desktop connecting line with animated progress */}
          <div className="hidden md:block absolute top-8 left-[8%] right-[8%] h-0.5 bg-amber-200/60 dark:bg-amber-900/40 z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#c2410c] origin-left rounded-full"
            />
            {/* Animated pulse dot traveling along the line */}
            <motion.div
              initial={{ left: '0%', opacity: 0 }}
              whileInView={{ left: '100%', opacity: [0, 1, 1, 1, 0] }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#f97316] shadow-lg shadow-orange-500/50 ring-2 ring-amber-300"
            />
          </div>

          <div className="flex flex-col md:flex-row md:justify-between items-stretch md:items-start md:gap-2 lg:gap-4 relative">
            {steps.map((step, index) => (
              <StoryStep
                key={index}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Supporting Core Initiatives with 3D Tilt ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full"
        >
          <MobileInitiatives areas={impactAreas} />
          <h4 className="text-sm font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300 text-center mb-8 hidden md:block">
            Supporting Core Initiatives
          </h4>
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5" style={{ perspective: '1000px' }}>
            {impactAreas.map((area, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              >
                <TiltCard className="cursor-pointer h-full">
                  <Link href={`/initiatives/${area.slug}`} aria-label={`Explore ${area.label}`} className="card-shimmer relative overflow-hidden flex h-full flex-col items-center justify-center text-center gap-4 p-6 rounded-2xl bg-[#fffdfa] dark:bg-[#23120a] border border-amber-200/80 dark:border-amber-800/40 shadow-[0_4px_20px_rgba(217,119,6,0.08)] hover:shadow-[0_12px_32px_rgba(217,119,6,0.2)] hover:border-amber-400/90 transition-[box-shadow,transform,border-color] duration-300 group active:scale-[0.98]">
                    {/* Gradient accent bg on hover */}
                    <div className={`absolute inset-0 ${area.bgAccent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                    
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${area.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        {area.icon}
                      </div>
                    </div>
                    <span className="relative z-10 text-sm font-semibold text-foreground leading-tight group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors">
                      {area.label}
                    </span>
                  </Link>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

