"use client";

import { notFound, useParams } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { SahasDonateForm } from "@/features/sahas/SahasDonateForm";

/** /sahas/[slug]/donate — the donate form on its own page, for direct links. */
export default function SahasDonatePage() {
  if (!FEATURES.sahas) notFound();
  return <SahasDonate />;
}

function SahasDonate() {
  const { slug } = useParams<{ slug: string }>();
  return <SahasDonateForm slug={slug} />;
}
