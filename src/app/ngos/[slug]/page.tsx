import type { Metadata } from "next";
import { NgoPublicPage } from "@/features/ngo-profile/NgoPublicPage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Title and description from the public profile; a generic one if it is missing or not public. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `/ngos/${slug}`;
  try {
    const res = await fetch(`${API}/api/v1/ngos/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const ngo = (await res.json()) as { organizationName?: string; aboutUs?: string | null; city?: string | null };
      const name = ngo.organizationName ?? "NGO";
      const about = (ngo.aboutUs ?? "").trim();
      return {
        title: `${name} — Verified NGO on CauseKind`,
        description: about ? (about.length > 155 ? `${about.slice(0, 152)}…` : about)
          : `${name}${ngo.city ? `, ${ngo.city}` : ""}. Verified by CauseKind. See its drives and past activity.`,
        alternates: { canonical },
      };
    }
  } catch { /* fall through to the generic title */ }
  return { title: "NGO — CauseKind", alternates: { canonical }, robots: { index: false } };
}

export default async function NgoPublicProfileRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NgoPublicPage slug={slug} />;
}
