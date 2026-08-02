"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  superAdminListAdmins, superAdminSetAdminPermissions,
  type AdminAccount,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

/** Mirrors the backend AdminCapability enum, grouped for readability. Order here
 *  is the display order; the backend is the authority on which exist. */
const CAPABILITY_GROUPS: { label: string; capabilities: string[] }[] = [
  {
    label: "Review queues",
    capabilities: ["REQUEST_REVIEW", "LISTING_REVIEW", "OFFER_REVIEW", "MATCH_INTERVENE", "CAMPAIGNS"],
  },
  {
    label: "People",
    capabilities: ["USER_READ", "USER_RESTRICT", "USER_SUSPEND", "SUPPORT_CASE_MANAGE"],
  },
  {
    label: "Communications",
    capabilities: ["WHATSAPP", "COMMUNICATION_MODERATE"],
  },
  {
    label: "Money",
    capabilities: ["PAYMENT_REVIEW"],
  },
  {
    label: "Sensitive",
    capabilities: [
      "IDENTITY_DOCUMENT_VIEW", "SENSITIVE_DATA_REVEAL", "FRAUD_REVIEW",
      "AUDIT_READ", "ADMIN_MANAGE", "PLATFORM_CONFIGURE", "AUTOPILOT",
    ],
  },
];

const CAPABILITY_LABELS: Record<string, string> = {
  CAMPAIGNS: "Campaigns",
  PAYMENT_REVIEW: "Donations & tips",
  REQUEST_REVIEW: "Requests",
  LISTING_REVIEW: "Listings",
  OFFER_REVIEW: "Offers & disputes",
  MATCH_INTERVENE: "Matches",
  WHATSAPP: "WhatsApp",
  USER_READ: "View users",
  USER_RESTRICT: "Restrict users",
  USER_SUSPEND: "Suspend users",
  SUPPORT_CASE_MANAGE: "Support cases",
  COMMUNICATION_MODERATE: "Moderate chat & calls",
  IDENTITY_DOCUMENT_VIEW: "View identity documents",
  SENSITIVE_DATA_REVEAL: "Reveal personal data",
  FRAUD_REVIEW: "Fraud review",
  ADMIN_MANAGE: "Manage admins",
  AUDIT_READ: "Read audit log",
  PLATFORM_CONFIGURE: "Platform configuration",
  AUTOPILOT: "Autopilot",
};

/** Super-admin control over what each ADMIN account can see/do — per-resource
 * toggles enforced server-side by AdminCapabilityFilter. SUPER_ADMIN accounts
 * are shown read-only since they always bypass the filter regardless. */
export function AdminPermissionsPanel() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function load() {
    setLoading(true);
    superAdminListAdmins()
      .then(setAdmins)
      .catch(() => toast.error("Failed to load admin accounts."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggle(admin: AdminAccount, capability: string, next: boolean) {
    const key = `${admin.id}:${capability}`;
    setSavingKey(key);
    // Optimistic update
    setAdmins(prev => prev.map(a => a.id === admin.id
      ? { ...a, permissions: { ...a.permissions, [capability]: next } }
      : a));
    try {
      await superAdminSetAdminPermissions(admin.id, { [capability]: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update permission.");
      // Revert on failure
      setAdmins(prev => prev.map(a => a.id === admin.id
        ? { ...a, permissions: { ...a.permissions, [capability]: !next } }
        : a));
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (admins.length === 0) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No admin accounts found.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Toggle what each admin can access. Revoking a capability blocks the matching
        API endpoints (403) and hides that tab in their dashboard.
      </p>
      {admins.map(admin => (
        <Card key={admin.id}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{admin.fullName}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {admin.role === "SUPER_ADMIN" && <Badge variant="secondary">Super Admin — always full access</Badge>}
                {!admin.active && <Badge variant="destructive">Inactive</Badge>}
              </div>
            </div>
            <div className="space-y-3">
              {CAPABILITY_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {group.capabilities.map(cap => (
                      <label key={cap} className="flex items-center gap-2 text-sm">
                        <Switch
                          // Explicitly true, not "not false": capabilities now carry
                          // their own default and the sensitive ones default OFF, so
                          // a value the backend didn't send must render as off rather
                          // than being shown as granted. Super admins bypass the
                          // filter entirely, so show them as fully granted regardless
                          // of what their (unused) permission rows happen to say.
                          checked={admin.role === "SUPER_ADMIN" || admin.permissions[cap] === true}
                          disabled={admin.role === "SUPER_ADMIN" || savingKey === `${admin.id}:${cap}`}
                          onCheckedChange={(checked) => toggle(admin, cap, checked)}
                        />
                        {CAPABILITY_LABELS[cap] ?? cap}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
