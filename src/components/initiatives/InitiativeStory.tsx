'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, HeartHandshake } from 'lucide-react';
import { useRef } from 'react';
import type { Initiative } from '@/lib/initiatives';

export function InitiativeStory({ initiative }: { initiative: Initiative }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const imageY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-6%', '6%']);
  const scale = useTransform(scrollYProgress, [0, 0.35], reduce ? [1, 1] : [1.06, 1]);

  return (
    <main ref={ref} className="bg-background text-foreground">
      <section className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden bg-stone-950 text-white">
        <motion.div style={{ y: imageY, scale }} className="absolute inset-0 origin-center">
          <Image src={initiative.image} alt={initiative.imageAlt} fill priority sizes="100vw" className="object-cover opacity-75" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/55 to-stone-950/10" />
        <div className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <Link href="/donate/money#about-sahas" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" /> All initiatives
            </Link>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-[#f0b97a]">{initiative.shortTitle}</p>
            <h1 className="max-w-3xl text-balance font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{initiative.headline}</h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">{initiative.intro}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24 lg:py-32 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Why it matters</p>
          <h2 className="text-balance max-w-md font-serif text-4xl leading-tight sm:text-5xl">{initiative.purpose}</h2>
          <Link href="/donate/money#donate-form" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(176,74,21,0.22)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-brand-600 active:scale-[0.96]">
            Support this work <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-5">
          {initiative.chapters.map((chapter, index) => (
            <motion.article key={chapter.title} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="group rounded-3xl border border-stone-200 bg-white p-7 shadow-[0_10px_30px_rgba(93,52,25,0.06)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(93,52,25,0.1)] sm:p-10 dark:border-white/10 dark:bg-zinc-900">
              <div className="mb-10 flex items-start justify-between gap-4">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${initiative.color} text-white shadow-md`}><HeartHandshake className="h-6 w-6" /></span>
                <span className="text-sm font-semibold text-stone-400">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-brand-600">{chapter.focus}</p>
              <h3 className="text-balance text-2xl font-extrabold sm:text-3xl">{chapter.title}</h3>
              <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-stone-600 dark:text-stone-300">{chapter.body}</p>
              <p className="mt-6 border-t border-stone-100 pt-4 text-sm font-semibold text-stone-500 dark:border-white/10 dark:text-stone-400">{chapter.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-[#fff7ed] px-4 py-20 text-center dark:border-white/10 dark:bg-zinc-900 sm:px-6 lg:py-28">
        <h2 className="text-balance font-serif text-4xl sm:text-5xl">Small acts can keep a bigger story moving.</h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-stone-600 dark:text-stone-300">Choose how you would like to help CauseKind connect people with practical, accountable support.</p>
        <Link href="/donate/money#donate-form" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-bold text-white shadow-[0_10px_24px_rgba(176,74,21,0.22)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-brand-600 active:scale-[0.96]">Donate through CauseKind <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </main>
  );
}
