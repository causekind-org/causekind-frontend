'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Award } from 'lucide-react';
import { CertificateCard } from './CertificateCard';
import { SahasLogo } from './SahasLogo';
import styles from './TrustCredibility.module.css';

/**
 * The trust's registration and tax certificates, restored 2026-10-16 at the
 * owner's request. This is the certificates block of the old TrustCredibility
 * section (deleted in 21a6e21), copied as it was; the rest of that section
 * (fund allocation) stays removed per the 2026-10-08 "no Trust section" call,
 * and it sits on the page background rather than its own band.
 */
export function TrustCertificates() {
  return (
    <section className="ck-below-nav py-12 lg:py-16" aria-label="Trust certificates">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="hidden md:block max-w-2xl mb-14">
            <SahasLogo size={48} className="mb-4" />
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-900 dark:text-amber-200 mb-4 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 px-3.5 py-1 rounded-full shadow-xs">
              Trust &amp; Credibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
              Know how your contributions are managed.
            </h2>
          </div>

          <div className={styles.mobileTrustHeading}>
            <p>Sahas Charitable Trust</p>
            <h2>Trust, on record.</h2>
            <span>Take a look at our certificates.</span>
          </div>

          <div className={`${styles.certificates} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-14`}>
            <CertificateCard
              title="12AA Registration Certificate"
              mobileSummary={{ title: '12AA', subtitle: 'Charitable institution' }}
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
              mobileSummary={{ title: '80G', subtitle: 'Donation tax certificate' }}
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
              mobileSummary={{ title: 'Trust registration', subtitle: 'Legal registration document', wide: true }}
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

          <div className="hidden md:inline-flex items-center gap-3 px-5 py-3 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 text-amber-950 dark:text-amber-100 text-sm font-semibold shadow-xs">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Verified Nonprofit Partner
          </div>
        </motion.div>
      </div>
    </section>
  );
}
