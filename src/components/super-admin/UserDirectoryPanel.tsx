"use client";

import { useEffect, useState } from "react";
import {
  superAdminDirectory,
  type SaDirectoryFilters,
  type SaPage,
  type SaUserSummary,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaPagination } from "@/components/super-admin/SaPagination";
import { User360Panel } from "@/components/super-admin/User360Panel";
import { Loader2, Search } from "lucide-react";

const ROLES = ["DONOR", "DONEE", "REPRESENTATIVE", "NGO_PARTNER", "ADMIN", "SUPER_ADMIN"];

/**
 * The user directory, and the way into User 360.
 *
 * <p>Distinct from the generic "Users" entity table in the same console: that
 * one edits raw database rows and is retired at the end of this rebuild. This
 * one is the supported read path — masked, paged in the database, and the entry
 * point to a user's full history.
 *
 * <p>Selection is held here rather than routed so that going back to the list
 * keeps the filters and page the agent had — losing those mid-investigation is
 * the difference between a usable console and an irritating one.
 */
export function UserDirectoryPanel({ initialUserId }: { initialUserId?: number }) {
  const [selected, setSelected] = useState<number | null>(initialUserId ?? null);
  const [data, setData] = useState<SaPage<SaUserSummary> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queryInput, setQueryInput] = useState("");
  const [filters, setFilters] = useState<SaDirectoryFilters>({});

  // A user chosen from elsewhere (search, ⌘K) opens straight into their 360.
  useEffect(() => {
    if (initialUserId) setSelected(initialUserId);
  }, [initialUserId]);

  useEffect(() => {
    if (selected !== null) return;   // list is hidden; don't fetch behind the 360
    setLoading(true);
    superAdminDirectory(filters, page, 25)
      .then(setData)
      .catch(() => toast.error("Couldn't load the directory."))
      .finally(() => setLoading(false));
  }, [filters, page, selected]);

  if (selected !== null) {
    return <User360Panel userId={selected} onBack={() => setSelected(null)} />;
  }

  function applySearch() {
    setPage(0);
    setFilters((f) => ({ ...f, q: queryInput.trim() || undefined }));
  }

  function setFilter(patch: SaDirectoryFilters) {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, email, phone or id…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={applySearch}>Search</Button>

        <select
          value={filters.role ?? ""}
          onChange={(e) => setFilter({ role: e.target.value || undefined })}
          className="h-9 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filters.suspended === undefined ? "" : String(filters.suspended)}
          onChange={(e) =>
            setFilter({ suspended: e.target.value === "" ? undefined : e.target.value === "true" })
          }
          className="h-9 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">Any status</option>
          <option value="true">Suspended</option>
          <option value="false">Not suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No users match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Phone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">City</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.id}</td>
                  <td className="px-3 py-2 text-xs font-medium">{u.fullName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.maskedEmail ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.maskedPhone ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">{u.role ?? "—"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.city ?? "—"}</td>
                  <td className="px-3 py-2">
                    {u.suspended ? (
                      <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                    ) : u.active ? (
                      <Badge variant="secondary" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaPagination page={data} onPageChange={setPage} label="users" />
    </div>
  );
}
