"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { StaffShell, StaffNavGroup, StaffNavItem, StaffTopbarTitle } from "@/components/staff/StaffShell";
import { PageHeader } from "@/components/staff/primitives";
import { useAuth } from "@/hooks/useAuth";
import { adminGetMyPermissions } from "@/lib/api";
import { CrmContactsPanel } from "@/features/crm/CrmContactsPanel";
import { CrmWorkSummary } from "@/features/crm/CrmWorkSummary";

type View = "contacts" | "followups";

const MENU: { id: View; label: string; icon: typeof Users }[] = [
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "followups", label: "Follow-ups and report", icon: CalendarClock },
];

/** The staff CRM portal. Uses the same StaffShell frame and theme as Admin / Super Admin (2026-11-20). */
export default function CrmPortalPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("contacts");
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    adminGetMyPermissions().then((p) => setCanManage(p.CRM_MANAGE === true)).catch(() => {});
  }, []);

  const current = MENU.find((m) => m.id === view)!;
  const manager = user?.role === "SUPER_ADMIN" || canManage;

  return (
    <StaffShell
      consoleLabel="CRM"
      email={user?.email ?? ""}
      onSignOut={logout}
      nav={
        <StaffNavGroup title="Calls">
          {MENU.map((m) => (
            <StaffNavItem key={m.id} label={m.label} icon={m.icon} active={m.id === view} onClick={() => setView(m.id)} />
          ))}
        </StaffNavGroup>
      }
      topbarStart={<StaffTopbarTitle label={current.label} hint="CauseKind CRM" />}
      topbarEnd={manager ? (
        <Link href={user?.role === "SUPER_ADMIN" ? "/super-admin" : "/admin/dashboard"}
          className="inline-flex h-10 items-center rounded-full border border-white/20 bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15">
          {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
        </Link>
      ) : undefined}
    >
      <div className="w-full max-w-6xl">
        <PageHeader title={current.label}
          description={view === "contacts" ? "Donors and donees to call, with their call history and notes." : "Follow-ups that are due, and the calling report."} />
        {view === "contacts" && <CrmContactsPanel canManage={manager} />}
        {view === "followups" && <CrmWorkSummary canManage={manager} refreshKey={0} onChanged={() => {}} />}
      </div>
    </StaffShell>
  );
}
