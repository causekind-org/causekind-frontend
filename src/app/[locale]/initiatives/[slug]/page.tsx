import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInitiative, initiatives } from '@/lib/initiatives';
import { InitiativeStory } from '@/components/initiatives/InitiativeStory';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return initiatives.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const initiative = getInitiative((await params).slug);
  if (!initiative) return { title: 'Initiative not found | CauseKind' };
  return {
    title: `${initiative.title} | CauseKind`,
    description: initiative.intro,
    alternates: { canonical: `/initiatives/${initiative.slug}` },
    openGraph: { title: `${initiative.title} | CauseKind`, description: initiative.intro, images: [initiative.image] },
  };
}

export default async function InitiativePage({ params }: Props) {
  const initiative = getInitiative((await params).slug);
  if (!initiative) notFound();
  return <InitiativeStory initiative={initiative} />;
}
