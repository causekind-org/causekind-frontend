import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './MobileInitiatives.module.css';

type Initiative = { slug: string; label: string; icon: ReactNode };

const shortLabels: Record<string, string> = {
  education: 'Education',
  healthcare: 'Healthcare',
  'community-welfare': 'Community welfare',
  empowerment: 'Women & youth',
};

export function MobileInitiatives({ areas }: { areas: Initiative[] }) {
  return (
    <section className={styles.section} aria-labelledby="mobile-initiatives-heading">
      <div className={styles.heading}>
        <h4 id="mobile-initiatives-heading">Supporting core initiatives</h4>
        <p>Explore the work you support.</p>
      </div>
      <ul className={styles.grid}>
        {areas.map((area) => (
          <li key={area.slug}>
            <Link href={`/initiatives/${area.slug}`} className={styles.link} aria-label={`Explore ${area.label}`}>
              <span className={styles.icon} aria-hidden="true">{area.icon}</span>
              <ArrowUpRight className={styles.arrow} aria-hidden="true" />
              <span className={styles.label}>{shortLabels[area.slug] ?? area.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
