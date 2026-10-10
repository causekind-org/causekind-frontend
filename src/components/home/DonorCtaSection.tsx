"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Heart, PackageSearch, ArrowRight } from "lucide-react";

interface FeatureCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  /** Open the In-Kind / Money choice instead of following href (see DonateChoice). */
  donateChoice?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ href, title, description, icon, className = "", spotlightColor = "rgba(255, 255, 255, 0.15)", donateChoice = false }) => {
  const divRef = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefersReducedMotion) return;
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });

    // Subtle 3D Tilt logic
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -4; 
    const rotateY = ((x - centerX) / centerX) * 4;
    
    div.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseEnter = () => {
    if (prefersReducedMotion) return;
    setOpacity(1);
    if (divRef.current) {
      divRef.current.style.transition = 'none';
    }
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    setOpacity(0);
    if (divRef.current) {
      divRef.current.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
      divRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    }
  };

  return (
    <Link
      href={href}
      data-donate-choice={donateChoice || undefined}
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative block overflow-hidden rounded-[2rem] p-8 sm:p-10 shadow-sm group ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      
      <div className="relative z-20 flex flex-col h-full items-start" style={{ transform: prefersReducedMotion ? 'none' : 'translateZ(20px)' }}>
        <div className="mb-6 p-4 rounded-2xl bg-black/10 dark:bg-white/10 backdrop-blur-sm">
          {icon}
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight">
          {title}
        </h3>
        <p className="text-sm sm:text-base opacity-90 max-w-sm mb-8 font-medium">
          {description}
        </p>
        
        <div className="mt-auto flex items-center font-bold text-sm tracking-wide uppercase">
          <span className="mr-2">Get started</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </div>
      </div>
    </Link>
  );
};

export function DonorCtaSection() {
  return (
    <section className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] py-20 lg:py-32 px-5 sm:px-8 transition-colors overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[300px] sm:h-[400px] bg-[var(--ck-home-accent,#b04a15)]/5 dark:bg-[var(--ck-home-accent,#b04a15)]/10 blur-[80px] sm:blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white mb-4">
            Ready to make a difference?
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-lg max-w-xl mx-auto">
            Choose how you would like to help CauseKind connect people with practical, accountable support.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: In-Kind Request (Primary) */}
          <FeatureCard
            href="/requests"
            title="In-kind request"
            description="Give items directly to someone nearby."
            icon={<PackageSearch className="w-8 h-8 text-white" />}
            className="bg-gradient-to-br from-[var(--ck-home-accent,#b04a15)] to-[#8a3810] text-white border border-[#c1571f]"
            spotlightColor="rgba(255, 255, 255, 0.25)"
          />

          {/* Card 2: Donate (Secondary) */}
          <FeatureCard
            href="/donate/money"
            donateChoice
            title="Donate"
            description="Support the cause with a contribution."
            icon={<Heart className="w-8 h-8 text-[var(--ck-home-accent,#b04a15)]" />}
            className="bg-white dark:bg-zinc-900 text-stone-900 dark:text-white border-2 border-[var(--ck-home-accent,#b04a15)]/60 hover:border-[var(--ck-home-accent,#b04a15)]"
            spotlightColor="rgba(176, 74, 21, 0.15)"
          />
        </div>
      </div>
    </section>
  );
}
