"use client";

import { useParams } from "next/navigation";
import { DriveHandoverPage } from "@/features/ngo-drives/components/DriveHandoverPage";

/** The NGO's handover for one offer to its drive (see the plan, receipt photos, enter the code). */
export default function NgoDriveHandoverPage() {
  const params = useParams();
  return <DriveHandoverPage role="NGO" driveId={Number(params.id)} offerId={Number(params.offerId)} />;
}
