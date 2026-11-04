import type { Metadata } from "next";
import { VolunteerHandoverPage } from "@/features/ngo-drives/volunteer/VolunteerHandoverPage";

export const metadata: Metadata = {
  title: "Pickup handover | CauseKind",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** The page an assigned volunteer opens from their email. No login: the link's token authorises it. */
export default function Page() {
  return <VolunteerHandoverPage />;
}
