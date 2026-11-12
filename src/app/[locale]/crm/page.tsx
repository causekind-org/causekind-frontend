"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, LogOut, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminGetMyPermissions } from "@/lib/api";
import { CrmContactsPanel } from "@/features/crm/CrmContactsPanel";
import { CrmWorkSummary } from "@/features/crm/CrmWorkSummary";

type View = "contacts" | "followups";

const MENU: { id: View; label: string; icon: typeof Users }[] = [
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "followups", label: "Follow-ups and report", icon: CalendarClock },
];

/** The staff CRM portal: its own shell, separate from the admin dashboard. */
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
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex h-12 items-center gap-4 bg-[#1e2a44] px-4 text-white">
        <span className="font-semibold">CauseKind CRM</span>
        <span className="ml-auto hidden truncate text-sm text-slate-200 sm:inline">{user?.email}</span>
        {user?.role === "SUPER_ADMIN" || canManage ? (
          <Link href="/admin/dashboard" className="text-sm text-slate-200 hover:text-white">Admin</Link>
        ) : null}
        <button type="button" onClick={logout} aria-label="Sign out"
          className="flex h-8 items-center gap-1.5 rounded px-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">
          <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <nav aria-label="Breadcrumb" className="px-6 pt-3 text-sm text-muted-foreground">
        CRM › {current.label}
      </nav>
      <h1 className="px-6 pb-3 pt-1 text-xl font-semibold">{current.label}</h1>

      <div className="flex flex-1 flex-wrap border-t bg-background">
        <aside className="w-full border-b py-2 md:w-56 md:border-b-0 md:border-r">
          {MENU.map((m) => {
            const active = m.id === view;
            const Icon = m.icon;
            return (
              <button key={m.id} type="button" onClick={() => setView(m.id)} aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2 border-l-[3px] px-4 py-2 text-left text-sm ${
                  active ? "border-blue-700 bg-blue-50 font-semibold text-blue-900" : "border-transparent hover:bg-muted"
                }`}>
                <Icon className="size-4" /> {m.label}
              </button>
            );
          })}
        </aside>
        <main className="min-w-0 flex-1 p-4">
          {view === "contacts" && <CrmContactsPanel canManage={manager} />}
          {view === "followups" && <CrmWorkSummary canManage={manager} refreshKey={0} onChanged={() => {}} />}
        </main>
      </div>
    </div>
  );
}
