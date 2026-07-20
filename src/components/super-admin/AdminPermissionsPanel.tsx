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

const CAPABILITIES = [
  "CAMPAIGNS", "DONATIONS", "ITEMS_REQUESTS", "MATCHES",
  "OFFERS", "WHATSAPP", "USERS", "AUTOPILOT",
] as const;

const CAPABILITY_LABELS: Record<string, string> = {
  CAMPAIGNS: "Campaigns",
  DONATIONS: "Donations",
  ITEMS_REQUESTS: "Items & Requests",
  MATCHES: "Matches",
  OFFERS: "Offers",
  WHATSAPP: "WhatsApp",
  USERS: "Users",
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CAPABILITIES.map(cap => (
                <label key={cap} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={admin.permissions[cap] !== false}
                    disabled={admin.role === "SUPER_ADMIN" || savingKey === `${admin.id}:${cap}`}
                    onCheckedChange={(checked) => toggle(admin, cap, checked)}
                  />
                  {CAPABILITY_LABELS[cap]}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
