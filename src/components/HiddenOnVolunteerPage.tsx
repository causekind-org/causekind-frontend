"use client";

import { usePathname } from "next/navigation";
import { isCrmPath } from "./AdminRedirect";

/**
 * The volunteer page is opened from a private link and shows a donor's address: no site chrome,
 * and no analytics or session recording, which could capture the link's #token or the address.
 * The staff CRM portal (/crm) has its own shell, so the site's header, footer and floating
 * widgets stay off there too.
 */
export function HiddenOnVolunteerPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return pathname.startsWith("/volunteer-handover") || isCrmPath(pathname) ? null : <>{children}</>;
}
