import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignDetailClient from "./CampaignDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
type Props = { params: Promise<{ id: string }> };

/**
 * Server wrapper: title, description and canonical from the public campaign.
 * Only a definite 404 from the API is "not found" (the proxy turns that into a
 * real 404 status); any other failure keeps a generic title and renders the
 * page, which handles its own loading and errors as before.
 */
async function loadCampaign(id: string): Promise<{ title?: string; description?: string; city?: string } | "missing" | null> {
  if (!/^\d+$/.test(id)) return "missing";
  try {
    const res = await fetch(`${API}/api/v1/campaigns/${id}`, { next: { revalidate: 300 } });
    if (res.status === 404) return "missing";
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const clip = (s: string) => (s.length > 155 ? `${s.slice(0, 152).trimEnd()}…` : s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await loadCampaign(id);
  if (c === "missing") notFound();
  const canonical = `/campaigns/${id}`;
  if (!c?.title) return { title: "Campaign", alternates: { canonical } };
  const about = (c.description ?? "").replace(/\s+/g, " ").trim();
  return {
    title: c.title,
    description: clip(about || `${c.title}${c.city ? `, ${c.city}` : ""}. A campaign on CauseKind.`),
    alternates: { canonical },
  };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  if ((await loadCampaign(id)) === "missing") notFound();
  return <CampaignDetailClient />;
}
