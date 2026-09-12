'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Award, GraduationCap, Stethoscope, Home, Users } from 'lucide-react';
import CountUp from '@/components/reactbits/CountUp';
import { CertificateCard } from './CertificateCard';
import { SahasLogo } from './SahasLogo';

const allocationAreas = [
  {
    label: 'Education & Scholarships',
    icon: <GraduationCap className="w-5 h-5" />,
    barColor: 'from-[#f97316] to-[#c2410c]',
    iconBg: 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/50',
    widthPercent: '40%',
    description: 'Scholarships, learning supplies, and school support for underserved students.',
  },
  {
    label: 'Healthcare & Medical Support',
    icon: <Stethoscope className="w-5 h-5" />,
    barColor: 'from-[#f43f5e] to-[#9f1239]',
    iconBg: 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300/50',
    widthPercent: '30%',
    description: 'Community health camps, medical aid, and wellness programs.',
  },
  {
    label: 'Community Welfare & Relief',
    icon: <Home className="w-5 h-5" />,
    barColor: 'from-[#0d9488] to-[#d97706]',
    iconBg: 'bg-teal-100/90 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-300/50',
    widthPercent: '20%',
    description: 'Disaster relief, nutrition support, and infrastructure development.',
  },
  {
    label: 'Women & Youth Empowerment',
    icon: <Users className="w-5 h-5" />,
    barColor: 'from-[#d97706] to-[#6b21a8]',
    iconBg: 'bg-purple-100/90 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/50',
    widthPercent: '10%',
    description: 'Skill-building, mentorship, and inclusion initiatives.',
  },
];

export function TrustCredibility() {
  return (
    <section className="min-h-0 lg:min-h-[calc(100svh-3.5rem)] py-8 md:py-12 lg:py-16 bg-[#fff9f4] dark:bg-[#180b04] flex items-center">
      {/* `min-w-0` because this is a flex item of the section above, so it
          defaults to `min-width: auto` — its min-content width. The certificate
          row below scrolls horizontally, and without this the row's content
          would set that min-content and stretch the page instead of scrolling
          inside it. */}
      <div className="min-w-0 w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section header */}
          <div className="max-w-2xl mb-14">
            <SahasLogo size={48} className="mb-4" />
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-900 dark:text-amber-200 mb-4 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 px-3.5 py-1 rounded-full shadow-xs">
              Trust &amp; Credibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
              Know how your contributions are managed.
            </h2>
          </div>

          {/* Credentials grid */}
          {/* Phone: one snap-scrolling row rather than three stacked cards.
              Each card is ~610px tall, so stacked they measured 1830px — over a
              screen and a half of credentials before the allocation figures
              below them. Nothing is hidden; the row just spends one card's
              height instead of three. `-mx-4 px-4` lets it bleed to the screen
              edges so the next card peeks in and advertises the scroll. */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 mb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:w-[82vw] [&>*]:shrink-0 [&>*]:snap-start md:mx-0 md:grid md:w-auto md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:pb-0 md:mb-14 md:[&>*]:w-auto">
            <CertificateCard
              title="12AA Registration Certificate"
              description="Confirms our status as a charitable institution under the Income Tax Act, 1961."
              icon={<Award className="w-7 h-7" />}
              benefits={[
                'Tax exemption on income',
                'Charitable status recognition',
                'Legal compliance'
              ]}
              documentUrl="/certificates/12aa-page-1.webp"
              imageUrl="/certificates/12aa-page-1.webp"
              extraImages={['/certificates/12aa-page-2.webp']}
            />

            <CertificateCard
              title="80G Tax Exemption Certificate"
              description="Allows our donors to claim 50% tax deductions on their contributions."
              icon={<FileText className="w-7 h-7" />}
              benefits={[
                '50% tax deduction for donors',
                'Valid across India',
                'Government approved'
              ]}
              documentUrl="/certificates/80g-page-1.webp"
              imageUrl="/certificates/80g-page-1.webp"
              extraImages={['/certificates/80g-page-2.webp', '/certificates/80g-page-3.webp']}
            />

            <CertificateCard
              title="Trust Registration Certificate"
              description="The foundational legal document establishing Sahas Charitable Trust."
              icon={<Shield className="w-7 h-7" />}
              benefits={[
                'Legal entity status',
                'Operational authorization',
                'Regulatory compliance'
              ]}
              documentUrl="/certificates/trust-registration.webp"
              imageUrl="/certificates/trust-registration.webp"
              extraImages={[]}
            />
          </div>

          {/* Verified badge */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 text-amber-950 dark:text-amber-100 text-sm font-semibold shadow-xs mb-8 md:mb-14">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Verified Nonprofit Partner
          </div>

          <hr className="border-amber-200/60 dark:border-amber-900/40 mb-8 md:mb-14" />
        </motion.div>

        {/* ── Where Your Money Goes ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 md:gap-12 lg:gap-20">
            
            {/* Left: heading and context */}
            <div className="lg:w-2/5 flex-shrink-0">
              <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-900 dark:text-amber-200 mb-4 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 px-3 py-1 rounded-full shadow-xs">
                Fund Allocation
              </span>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3 sm:mb-5 leading-tight">
                Where your money goes
              </h3>
              <p className="hidden sm:block text-base text-stone-600 dark:text-stone-300 leading-relaxed mb-6">
                Sahas Charitable Trust channels contributions into direct charitable work across the following focus areas.
              </p>
              <p className="text-[0.6875rem] sm:text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-amber-50/90 dark:bg-amber-950/50 p-3 sm:p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                Allocation is illustrative and based on the trust&apos;s stated areas of work. Audited financials and detailed breakdowns are available upon request.
              </p>
            </div>

            {/* Right: allocation cards with animated bars */}
            <div className="lg:w-3/5 space-y-5">
              {allocationAreas.map((area, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(217,119,6,0.12)' }}
                  className="bg-[#fffdfa] dark:bg-[#23120a] rounded-2xl border border-amber-200/70 dark:border-amber-800/40 p-4 sm:p-6 transition-all duration-300 cursor-default group hover:border-amber-400"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl ${area.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-xs`}>
                      {area.icon}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-sm sm:text-base font-bold text-foreground mb-1">{area.label}</h4>
                        {/* The figure itself, which main's card left implicit in
                            the bar's width. This is the only place on the phone
                            these four programmes still appear, so the number is
                            worth stating — and worth animating, on the same
                            scroll trigger as the bar under it. CountUp writes
                            straight to the text node, so counting costs no
                            re-renders. */}
                        <span className="shrink-0 text-xs font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                          <CountUp to={parseInt(area.widthPercent, 10)} duration={1.2} delay={i * 0.15} />%
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{area.description}</p>
                    </div>
                  </div>
                  {/* Animated gradient bar */}
                  <div className="w-full bg-amber-100/80 dark:bg-amber-950/60 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: area.widthPercent }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${area.barColor}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <hr className="border-amber-200/60 dark:border-amber-900/40 mt-14" />
        </motion.div>

      </div>
    </section>
  );
}

