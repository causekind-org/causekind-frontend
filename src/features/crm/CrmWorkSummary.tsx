"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAddCaller, crmCallers, crmCloseFollowup, crmFollowups, crmRemoveCaller, crmReport,
  type CrmCaller, type CrmFollowup, type CrmReport,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
}

/** Open follow-ups and call counts, shown on request above the call list. */
export function CrmWorkSummary({ canManage, refreshKey, onChanged }: {
  canManage: boolean; refreshKey: number; onChanged: () => void;
}) {
  const [followups, setFollowups] = useState<CrmFollowup[]>([]);
  const [report, setReport] = useState<CrmReport | null>(null);
  const [callers, setCallers] = useState<CrmCaller[]>([]);
  const [newCaller, setNewCaller] = useState("");

  const load = useCallback(() => {
    crmFollowups().then(setFollowups).catch(() => {});
    crmReport(canManage).then(setReport).catch(() => {});
    crmCallers().then(setCallers).catch(() => {});
  }, [canManage]);

  useEffect(load, [load, refreshKey]);

  async function close(id: number, action: "done" | "cancel") {
    try {
      await crmCloseFollowup(id, action);
      load();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this follow-up.");
    }
  }

  async function addCaller() {
    if (!newCaller.trim()) return;
    try {
      await crmAddCaller(newCaller.trim());
      setNewCaller("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add this name.");
    }
  }

  async function removeCaller(id: number) {
    try {
      await crmRemoveCaller(id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this name.");
    }
  }

  const now = Date.now();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-2 py-3">
          <p className="font-medium">Follow-ups ({followups.length})</p>
          {followups.length === 0 && <p className="text-sm text-muted-foreground">Nothing planned.</p>}
          {followups.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                {f.contactName ?? "Contact"} ·{" "}
                <span className={new Date(f.dueAt).getTime() < now ? "font-medium text-destructive" : ""}>{formatIst(f.dueAt)}</span>
                {f.note && <span className="block text-xs text-muted-foreground">{f.note}</span>}
              </span>
              <span className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => close(f.id, "done")}>Done</Button>
                <Button size="sm" variant="ghost" onClick={() => close(f.id, "cancel")}>Cancel</Button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 py-3">
          <p className="font-medium">{canManage ? "Team calls" : "My calls"}, last {report?.days ?? 30} days</p>
          {report && (
            <p className="text-sm text-muted-foreground">{report.openFollowups} open follow-ups, {report.overdueFollowups} overdue</p>
          )}
          {report?.rows.length === 0 && <p className="text-sm text-muted-foreground">No calls logged yet.</p>}
          {report?.rows.map((r) => (
            <div key={r.caller} className="text-sm">
              <span className="font-medium">{r.caller}: {r.calls}</span>
              <span className="block text-xs text-muted-foreground">
                {Object.entries(r.outcomes).map(([k, v]) => `${k} ${v}`).join(" · ")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      {canManage && (
        <Card className="md:col-span-2">
          <CardContent className="space-y-2 py-3">
            <p className="font-medium">Caller names</p>
            <div className="flex flex-wrap items-center gap-2">
              {callers.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
                  {c.name}
                  <button type="button" aria-label={`Remove ${c.name}`} className="text-muted-foreground" onClick={() => removeCaller(c.id)}>×</button>
                </span>
              ))}
              {callers.length === 0 && <span className="text-sm text-muted-foreground">No names yet.</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-full sm:w-64" maxLength={120} aria-label="Caller name" placeholder="Add a name"
                value={newCaller} onChange={(e) => setNewCaller(e.target.value)} />
              <Button size="sm" disabled={!newCaller.trim()} onClick={addCaller}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
