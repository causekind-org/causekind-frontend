"use client";

import { usePathname } from "next/navigation";

/**
 * The volunteer page is opened from a private link and shows a donor's address: no site chrome,
 * and no analytics or session recording, which could capture the link's #token or the address.
 */
export function HiddenOnVolunteerPage({ children }: { children: React.ReactNode }) {
  return usePathname()?.startsWith("/volunteer-handover") ? null : <>{children}</>;
}
