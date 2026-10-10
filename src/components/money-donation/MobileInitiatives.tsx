import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from '@/components/AppLink';
import styles from './MobileInitiatives.module.css';

type Initiative = { slug: string; label: string; icon: ReactNode };

const shortLabels: Record<string, string> = {
  education: 'Education',
  healthcare: 'Healthcare',
  'community-welfare': 'Community welfare',
  empowerment: 'Women & youth',
};

/** Compact 2×2 initiative links shown below md; the tilt cards take over from md up. */
export function MobileInitiatives({ areas }: { areas: Initiative[] }) {
  return (
    <section className={styles.section} aria-labelledby="mobile-initiatives-heading">
      <div className={styles.heading}>
        <h4 id="mobile-initiatives-heading">Supporting core initiatives</h4>
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <ul className={styles.grid}>
        {areas.map((area) => (
          <li key={area.slug}>
            <Link href={`/initiatives/${area.slug}`} className={styles.link} aria-label={`Explore ${area.label}`}>
              <span className={styles.icon} aria-hidden="true">{area.icon}</span>
              <span className={styles.label}>{shortLabels[area.slug] ?? area.label}</span>
              <ChevronRight className={styles.arrow} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
