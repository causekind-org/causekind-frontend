import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FundraiserClient from "./FundraiserClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
type Props = { params: Promise<{ id: string }> };

/**
 * Server wrapper: title, description and canonical from the public fundraiser.
 * Only a definite 404 from the API is "not found" (the proxy turns that into a
 * real 404 status); any other failure keeps a generic title and renders the
 * page, which handles its own loading and errors as before.
 */
async function loadFundraiser(id: string): Promise<{ title?: string; description?: string; city?: string } | "missing" | null> {
  // The detail payload nests the title under `card`; the story is the body.
  if (!/^\d+$/.test(id)) return "missing";
  try {
    const res = await fetch(`${API}/api/v1/fundraising/public/campaigns/${id}`, { next: { revalidate: 300 } });
    if (res.status === 404) return "missing";
    if (!res.ok) return null;
    const d = (await res.json()) as { card?: { title?: string; location?: string | null }; story?: string | null };
    return { title: d.card?.title, city: d.card?.location ?? undefined, description: d.story ?? undefined };
  } catch {
    return null;
  }
}

const clip = (s: string) => (s.length > 155 ? `${s.slice(0, 152).trimEnd()}…` : s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await loadFundraiser(id);
  if (c === "missing") notFound();
  const canonical = `/fundraisers/${id}`;
  if (!c?.title) return { title: "Fundraiser", alternates: { canonical } };
  const about = (c.description ?? "").replace(/\s+/g, " ").trim();
  return {
    title: c.title,
    description: clip(about || `${c.title}${c.city ? `, ${c.city}` : ""}. A fundraiser on CauseKind.`),
    alternates: { canonical },
  };
}

export default async function FundraiserPage({ params }: Props) {
  const { id } = await params;
  if ((await loadFundraiser(id)) === "missing") notFound();
  return <FundraiserClient />;
}
