"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { crmCloseFollowup, crmFollowups, crmReport, type CrmFollowup, type CrmReport } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
}

/** Open follow-ups and call counts, shown on request above the call list. */
export function CrmWorkSummary({ canManage, refreshKey, onChanged }: {
  canManage: boolean; refreshKey: number; onChanged: () => void;
}) {
  const [followups, setFollowups] = useState<CrmFollowup[]>([]);
  const [report, setReport] = useState<CrmReport | null>(null);

  const load = useCallback(() => {
    crmFollowups().then(setFollowups).catch(() => {});
    crmReport(canManage).then(setReport).catch(() => {});
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
            <div key={r.actorEmail} className="text-sm">
              <span className="font-medium">{r.actorEmail}: {r.calls}</span>
              <span className="block text-xs text-muted-foreground">
                {Object.entries(r.outcomes).map(([k, v]) => `${k} ${v}`).join(" · ")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
