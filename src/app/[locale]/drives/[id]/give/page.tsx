"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { getNgoDrive } from "@/lib/api";
import { DriveGiveScreen } from "@/features/ngo-drives/components/DriveGiveScreen";

export default function DriveGivePage() {
  const params = useParams();
  const id = Number(params.id);
  const loadDrive = useCallback(() => getNgoDrive(id), [id]);
  return <DriveGiveScreen id={id} loadDrive={loadDrive} driveHref={`/drives/${id}`} giveHref={`/drives/${id}/give`} />;
}
