"use client";

import { useEffect, useState } from "react";
import { adminGetMyPermissions } from "@/lib/api";
import { CrmContactsPanel } from "@/features/crm/CrmContactsPanel";

/** The CRM agent's home. Agents have no access to the admin dashboard. */
export default function AdminCallsPage() {
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    adminGetMyPermissions().then((p) => setCanManage(p.CRM_MANAGE === true)).catch(() => {});
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-3 px-4 py-6">
      <h1 className="text-xl font-semibold">Calls</h1>
      <CrmContactsPanel canManage={canManage} />
    </main>
  );
}
