"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  superAdminCreateCrmStaff, superAdminCrmStaff, superAdminResetCrmStaffPassword, superAdminSetCrmStaffActive,
  type CrmStaffAccount,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EMPTY = { fullName: "", loginId: "", phone: "", password: "" };

/** Super admin: the logins staff use at /crm. Passwords can be reset, never shown. */
export function CrmStaffPanel() {
  const [staff, setStaff] = useState<CrmStaffAccount[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(() => {
    superAdminCrmStaff().then(setStaff).catch(() => toast.error("Could not load the CRM logins."));
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => superAdminCreateCrmStaff(form), "Login created. Share the ID and password with the staff member.")) {
      setForm(EMPTY);
    }
  }

  async function reset(id: number) {
    if (await run(() => superAdminResetCrmStaffPassword(id, newPassword), "Password changed. They are signed out everywhere.")) {
      setResetFor(null);
      setNewPassword("");
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">CRM staff logins</h2>
        <p className="text-sm text-muted-foreground">
          Staff sign in at <span className="font-mono">/crm</span> with these. They can only use the CRM. Passwords are
          stored encrypted, so nobody can see them later: if one is forgotten, set a new one here.
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm font-medium">Name
              <Input value={form.fullName} onChange={set("fullName")} maxLength={120} placeholder="Priya Sharma" />
            </label>
            <label className="space-y-1 text-sm font-medium">Login ID
              <Input value={form.loginId} onChange={set("loginId")} maxLength={40} placeholder="priya" autoComplete="off" />
            </label>
            <label className="space-y-1 text-sm font-medium">Phone
              <Input value={form.phone} onChange={set("phone")} inputMode="tel" placeholder="98xxxxxxxx" />
            </label>
            <label className="space-y-1 text-sm font-medium">Password (8+ characters)
              <Input type="text" value={form.password} onChange={set("password")} autoComplete="new-password" />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={busy || !form.fullName.trim() || !form.loginId.trim() || !form.phone.trim() || form.password.length < 8}>
                Create login
              </Button>
              <span className="text-xs text-muted-foreground">Their name is also added to the Called by list.</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Login ID</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No CRM logins yet.</td></tr>
            )}
            {staff.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="px-3 py-2.5 font-medium">{s.fullName}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{s.loginId.replace(/@crm\.causekind$/, "")}</td>
                <td className="px-3 py-2.5">{s.phone}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Active" : "Turned off"}</Badge>
                </td>
                <td className="space-y-2 px-3 py-2.5 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => { setResetFor(resetFor === s.id ? null : s.id); setNewPassword(""); }}>
                      Set new password
                    </Button>
                    <Button size="sm" variant={s.active ? "ghost" : "outline"} disabled={busy}
                      onClick={() => run(() => superAdminSetCrmStaffActive(s.id, !s.active), s.active ? "Login turned off." : "Login turned on.")}>
                      {s.active ? "Turn off" : "Turn on"}
                    </Button>
                  </div>
                  {resetFor === s.id && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Input className="w-48" aria-label={`New password for ${s.fullName}`} placeholder="New password"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                      <Button size="sm" disabled={busy || newPassword.length < 8} onClick={() => reset(s.id)}>Save</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
