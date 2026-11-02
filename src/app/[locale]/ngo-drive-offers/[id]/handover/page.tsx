"use client";

import { useParams } from "next/navigation";
import { DriveHandoverPage } from "@/features/ngo-drives/components/DriveHandoverPage";

/** The donor's handover for an offer to an NGO drive (plan, show the code, issue window). */
export default function DonorDriveHandoverPage() {
  const params = useParams();
  return <DriveHandoverPage role="DONOR" offerId={Number(params.id)} />;
}
