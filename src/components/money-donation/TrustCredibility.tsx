'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, ExternalLink, Award, GraduationCap, Stethoscope, Home, Users } from 'lucide-react';
import { CertificateCard } from './CertificateCard';
import { SahasLogo } from './SahasLogo';

const allocationAreas = [
  {
    label: 'Education & Scholarships',
    icon: <GraduationCap className="w-5 h-5" />,
    barColor: 'from-brand-400 to-brand-600',
    iconBg: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600',
    widthPercent: '40%',
    description: 'Scholarships, learning supplies, and school support for underserved students.',
  },
  {
    label: 'Healthcare & Medical Support',
    icon: <Stethoscope className="w-5 h-5" />,
    barColor: 'from-brand-400 to-brand-600',
    iconBg: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600',
    widthPercent: '30%',
    description: 'Community health camps, medical aid, and wellness programs.',
  },
  {
    label: 'Community Welfare & Relief',
    icon: <Home className="w-5 h-5" />,
    barColor: 'from-brand-400 to-brand-600',
    iconBg: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600',
    widthPercent: '20%',
    description: 'Disaster relief, nutrition support, and infrastructure development.',
  },
  {
    label: 'Women & Youth Empowerment',
    icon: <Users className="w-5 h-5" />,
    barColor: 'from-brand-400 to-brand-600',
    iconBg: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600',
    widthPercent: '10%',
    description: 'Skill-building, mentorship, and inclusion initiatives.',
  },
];

export function TrustCredibility() {
  return (
    <section className="min-h-0 lg:min-h-[calc(100svh-3.5rem)] py-8 lg:py-16 bg-background flex items-center">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section header */}
          <div className="max-w-2xl mb-8 sm:mb-14">
            <SahasLogo size={48} className="mb-4" />
            <span className="block text-xs font-bold tracking-wider uppercase text-brand-500 mb-4">
              Trust &amp; Credibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
              Know how your contributions are managed.
            </h2>
          </div>

          {/* Credentials grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 mb-8 sm:mb-14">
            <CertificateCard
              title="12AA Registration Certificate"
              description="Confirms our status as a charitable institution under the Income Tax Act, 1961."
              icon={<Award className="w-7 h-7" />}
              iconBgColor="bg-[#f4e1cc] dark:bg-[#6f3a1f] text-brand-700"
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
              iconBgColor="bg-[#ead8c3] dark:bg-[#55402f] text-brand-700"
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
              iconBgColor="bg-[#e8d3c4] dark:bg-[#52392c] text-brand-700"
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
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-200 text-sm font-medium mb-8 sm:mb-14">
            <Shield className="w-4 h-4 text-teal-500" />
            Verified Nonprofit Partner
          </div>

          <hr className="border-stone-200 dark:border-white/15 mb-8 sm:mb-14" />
        </motion.div>

        {/* ── Where Your Money Goes ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-20">

            {/* Left: heading and context */}
            <div className="lg:w-2/5 flex-shrink-0">
              <span className="inline-block text-xs font-bold tracking-wider uppercase text-brand-500 mb-4 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-full">
                Fund Allocation
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-5 leading-tight">
                Where your money goes
              </h3>
              <p className="text-base text-stone-500 dark:text-stone-400 leading-relaxed mb-6">
                Sahas Charitable Trust channels contributions into direct charitable work across the following focus areas.
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed bg-stone-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-stone-100">
                Allocation is illustrative and based on the trust&apos;s stated areas of work. Audited financials and detailed breakdowns are available upon request.
              </p>
            </div>

            {/* Right: allocation cards with animated bars */}
            <div className="lg:w-3/5 space-y-3 sm:space-y-5">
              {allocationAreas.map((area, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.06)' }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-white/10 p-4 sm:p-6 transition-all duration-300 cursor-default group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl ${area.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      {area.icon}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-sm sm:text-base font-bold text-foreground mb-1">{area.label}</h4>
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-300 tabular-nums">{area.widthPercent}</span>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed">{area.description}</p>
                    </div>
                  </div>
                  {/* Animated gradient bar */}
                  <div className="w-full bg-stone-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
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

          <hr className="border-stone-200 dark:border-white/15 mt-8 sm:mt-14" />
        </motion.div>

      </div>
    </section>
  );
}
