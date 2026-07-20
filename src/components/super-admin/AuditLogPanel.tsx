"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { superAdminAuditLog, type AuditLogEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

/** Read-only trail of every recorded admin/super-admin action — the direct fix
 * for the SQL console and generic entity CRUD previously leaving zero record
 * of who ran what. */
export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("");

  function load() {
    setLoading(true);
    superAdminAuditLog(page, 25, actorFilter ? { actorEmail: actorFilter } : undefined)
      .then(res => { setEntries(res.content); setTotalPages(res.totalPages); })
      .catch(() => toast.error("Failed to load audit log."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Filter by actor email…"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); load(); } }}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => { setPage(0); load(); }}>Filter</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No audit entries found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">When</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Actor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs">{e.actorEmail}</p>
                    <Badge variant="secondary" className="text-[10px]">{e.actorRole}</Badge>
                  </td>
                  <td className="px-4 py-2 font-medium text-xs">{e.action}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {e.entityType ? `${e.entityType}${e.entityId ? ` #${e.entityId}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2 max-w-[320px] truncate text-xs text-muted-foreground" title={e.detail ?? undefined}>
                    {e.detail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
