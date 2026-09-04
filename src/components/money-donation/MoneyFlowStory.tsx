'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Heart, Building2, Users, Banknote, HandHeart, GraduationCap, Stethoscope, Home, ArrowRight } from 'lucide-react';

/* ─── Step Data ─── */
const steps = [
  {
    icon: <Heart className="w-7 h-7" />,
    iconBg: 'from-brand-400 to-brand-600',
    glowColor: 'rgba(176,74,21,0.25)',
    label: 'You Donate',
    headline: 'Your journey starts here.',
    description: 'Your contribution through CauseKind is securely collected and directed toward tangible change.',
    detail: 'UPI · Cards · Net Banking',
  },
  {
    icon: <Building2 className="w-7 h-7" />,
    iconBg: 'from-blue-400 to-blue-600',
    glowColor: 'rgba(59,130,246,0.25)',
    label: 'Sahas Charitable Trust',
    headline: 'Managed with full transparency.',
    description: 'Sahas Charitable Trust — registered with 12AA and 80G certifications — manages every rupee with accountability.',
    detail: 'Registered · Audited',
  },
  {
    icon: <Banknote className="w-7 h-7" />,
    iconBg: 'from-green-400 to-green-600',
    glowColor: 'rgba(22,163,74,0.25)',
    label: 'Funds Are Allocated',
    headline: 'Every rupee is accounted for.',
    description: 'Funds are allocated across verified programs in education, healthcare, and community welfare.',
    detail: 'Zero overhead',
  },
  {
    icon: <HandHeart className="w-7 h-7" />,
    iconBg: 'from-purple-400 to-purple-600',
    glowColor: 'rgba(147,51,234,0.25)',
    label: 'Direct Impact',
    headline: 'Real people. Real change.',
    description: 'Your contribution directly reaches families, students, and communities — no middlemen.',
    detail: '',
  },
];

const impactAreas = [
  { icon: <GraduationCap className="w-6 h-6" />, label: 'Education & Scholarships', color: 'from-amber-400 to-brand-500', bgAccent: 'bg-amber-50 dark:bg-amber-500/10' },
  { icon: <Stethoscope className="w-6 h-6" />, label: 'Healthcare & Medical Aid', color: 'from-rose-400 to-rose-600', bgAccent: 'bg-rose-50 dark:bg-rose-500/10' },
  { icon: <Home className="w-6 h-6" />, label: 'Community Welfare', color: 'from-teal-400 to-teal-600', bgAccent: 'bg-teal-50 dark:bg-teal-500/10' },
  { icon: <Users className="w-6 h-6" />, label: 'Women & Youth Empowerment', color: 'from-violet-400 to-violet-600', bgAccent: 'bg-violet-50 dark:bg-violet-500/10' },
];

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Story Step ─── */
function StoryStep({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  return (
    <div className="relative flex flex-row md:flex-col items-start md:items-center gap-5 md:gap-0 md:flex-1 z-10 group">
      {/* Icon orb with glow */}
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
            className="absolute inset-0 rounded-2xl blur-xl opacity-60"
            style={{ background: step.glowColor }}
          />
          <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.iconBg} text-white flex items-center justify-center shadow-lg`}>
            {step.icon}
            {/* Step number badge */}
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 text-foreground text-xs font-bold flex items-center justify-center shadow-md border border-stone-100">
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
            className="w-px h-20 md:hidden bg-gradient-to-b from-stone-300 to-transparent origin-top mt-3"
          />
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, delay: index * 0.18 + 0.1 }}
        className="flex-1 md:text-center mt-1 md:mt-5 pb-10 md:pb-0 md:px-2"
      >
        <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-1.5">
          {step.label}
        </span>
        <h3 className="text-lg sm:text-xl font-extrabold text-foreground mb-2 leading-snug">
          {step.headline}
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
          {step.description}
        </p>
        {step.detail && (
          <span className="inline-block text-[11px] font-semibold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-white/10 px-3 py-1 rounded-full">
            {step.detail}
          </span>
        )}
      </motion.div>

      {/* Desktop arrow connector between steps */}
      {!isLast && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: index * 0.18 + 0.35 }}
          className="hidden md:flex absolute -right-4 lg:-right-6 top-7 z-20 text-stone-300"
        >
          <ArrowRight className="w-5 h-5" />
        </motion.div>
      )}
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
    <section ref={containerRef} className="relative py-14 sm:py-20 bg-background overflow-hidden border-t border-stone-100">
      {/* Decorative background blobs */}
      <motion.div
        style={{ y: bgY }}
        className="absolute -right-40 top-1/4 w-[500px] h-[500px] rounded-full bg-brand-50/40 blur-3xl pointer-events-none"
      />
      <motion.div
        style={{ y: bgX }}
        className="absolute -left-40 bottom-1/4 w-[400px] h-[400px] rounded-full bg-blue-50/30 blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-14 text-center max-w-3xl mx-auto"
        >
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-brand-500 mb-4 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-full">
            Where Your Money Goes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-5">
            From you, to those who need it most.
          </h2>
          <p className="text-base sm:text-lg text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl mx-auto">
            Every donation follows a clear, accountable path. Here&apos;s exactly how your contribution creates real impact.
          </p>
        </motion.div>

        {/* ── Horizontal Timeline ── */}
        <div className="relative mb-12">
          {/* Desktop connecting line with animated progress */}
          <div className="hidden md:block absolute top-8 left-[8%] right-[8%] h-0.5 bg-stone-100 dark:bg-white/10 z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-brand-300 via-blue-300 via-green-300 to-purple-300 origin-left rounded-full"
            />
            {/* Animated pulse dot traveling along the line */}
            <motion.div
              initial={{ left: '0%', opacity: 0 }}
              whileInView={{ left: '100%', opacity: [0, 1, 1, 1, 0] }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 shadow-lg shadow-brand-500/40"
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
          className="max-w-4xl mx-auto"
        >
          <h4 className="text-sm font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 text-center mb-8">
            Supporting Core Initiatives
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ perspective: '1000px' }}>
            {impactAreas.map((area, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              >
                <TiltCard className="cursor-pointer">
                  <div className="relative overflow-hidden flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                    {/* Gradient accent bg on hover */}
                    <div className={`absolute inset-0 ${area.bgAccent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                    
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${area.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        {area.icon}
                      </div>
                    </div>
                    <span className="relative z-10 text-sm font-semibold text-foreground leading-tight group-hover:text-foreground transition-colors">
                      {area.label}
                    </span>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
