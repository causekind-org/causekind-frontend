"use client";

import { useCallback } from "react";
import { notFound, useParams } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { sahasCampaigns } from "@/lib/api";
import { DriveGiveScreen } from "@/features/ngo-drives/components/DriveGiveScreen";

/** /sahas/[slug]/give/[itemId] — give to a Sahas campaign item line, with the shared drive give flow. */
export default function SahasGivePage() {
  if (!FEATURES.sahas) notFound();
  return <SahasGive />;
}

function SahasGive() {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>();
  const id = Number(itemId);
  const loadDrive = useCallback(() => sahasCampaigns.item(slug, id), [slug, id]);
  return (
    <DriveGiveScreen id={id} loadDrive={loadDrive} driveHref={`/sahas/${slug}`}
      giveHref={`/sahas/${slug}/give/${itemId}`} notFoundHref="/sahas" />
  );
}
