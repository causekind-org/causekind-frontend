"use client";

import { useEffect, useState } from "react";
import {
  superAdminDirectory,
  type SaDirectoryFilters,
  type SaPage,
  type SaUserSummary,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { saTheme } from "@/components/super-admin/saTheme";
import { SaPagination } from "@/components/super-admin/SaPagination";
import { User360Panel } from "@/components/super-admin/User360Panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Search, CalendarDays, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

const ROLES = ["DONOR", "DONEE", "REPRESENTATIVE", "NGO_PARTNER", "ADMIN", "SUPER_ADMIN"];

// Local date, not UTC — toISOString() would roll a late-evening pick in IST
// back to the previous day.
function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/**
 * The user directory, and the way into User 360.
 *
 * <p>Distinct from the generic "Users (raw)" entity table in the same console:
 * that one edits raw database rows and is retired at the end of this rebuild.
 * This one is the supported read path — paged in the database, and the entry
 * point to a user's full history.
 *
 * <p>Selection is held here rather than routed so that going back to the list
 * keeps the filters and page the agent had — losing those mid-investigation is
 * the difference between a usable console and an irritating one.
 */
export function UserDirectoryPanel({
  initialUserId,
  isDark,
}: {
  initialUserId?: number;
  isDark: boolean;
}) {
  const t = saTheme(isDark);
  const [selected, setSelected] = useState<number | null>(initialUserId ?? null);
  const [data, setData] = useState<SaPage<SaUserSummary> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queryInput, setQueryInput] = useState("");
  const [filters, setFilters] = useState<SaDirectoryFilters>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
    return <User360Panel userId={selected} isDark={isDark} onBack={() => setSelected(null)} />;
  }

  function applySearch() {
    setPage(0);
    setFilters((f) => ({ ...f, q: queryInput.trim() || undefined }));
  }

  function setFilter(patch: SaDirectoryFilters) {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  }

  function applyDateRange(range: DateRange | undefined) {
    setDateRange(range);
    setFilter({
      registeredFrom: range?.from ? formatLocalDate(range.from) : undefined,
      registeredTo: range?.to ? formatLocalDate(range.to) : undefined,
    });
  }

  function clearDateRange() {
    applyDateRange(undefined);
    setDatePickerOpen(false);
  }

  const control = `h-9 rounded-lg border px-2.5 text-xs transition-colors ${t.input}`;
  const th = `px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider ${t.dim}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className={`absolute left-2.5 top-1/2 size-4 -translate-y-1/2 ${t.dim}`} />
          <input
            placeholder="Name, email, phone or id…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
            className={`${control} w-full pl-8`}
          />
        </div>
        <button
          onClick={applySearch}
          className={`h-9 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${t.btnAccent}`}
        >
          Search
        </button>

        <select
          value={filters.role ?? ""}
          onChange={(e) => setFilter({ role: e.target.value || undefined })}
          className={control}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filters.suspended === undefined ? "" : String(filters.suspended)}
          onChange={(e) =>
            setFilter({ suspended: e.target.value === "" ? undefined : e.target.value === "true" })
          }
          className={control}
        >
          <option value="">Any status</option>
          <option value="true">Suspended</option>
          <option value="false">Not suspended</option>
        </select>

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${control} flex items-center gap-1.5 font-normal`}
            >
              <CalendarDays className="size-3.5" />
              {filters.registeredFrom || filters.registeredTo
                ? `${filters.registeredFrom ? formatDisplayDate(filters.registeredFrom) : "…"} – ${
                    filters.registeredTo ? formatDisplayDate(filters.registeredTo) : "…"
                  }`
                : "Joined date"}
              {(filters.registeredFrom || filters.registeredTo) && (
                <X
                  className="size-3.5 ml-0.5 hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); clearDateRange(); }}
                />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 border-none bg-transparent shadow-none">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={applyDateRange}
              defaultMonth={dateRange?.from}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`size-8 animate-spin ${t.dim}`} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className={`py-10 text-center text-sm ${t.muted}`}>No users match these filters.</p>
      ) : (
        <div className={`overflow-x-auto rounded-xl border ${t.cardFlat}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${t.tableHead}`}>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone</th>
                <th className={th}>Role</th>
                <th className={th}>City</th>
                <th className={th}>Status</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divide}`}>
              {data.items.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`cursor-pointer transition-colors ${t.rowHover}`}
                >
                  <td className={`px-3 py-2 text-xs tabular-nums ${t.dim}`}>{u.id}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${t.heading}`}>{u.fullName}</td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{u.email ?? "—"}</td>
                  <td className={`px-3 py-2 text-xs tabular-nums ${t.muted}`}>{u.phone ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
                      {u.role ?? "—"}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{u.city ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        u.suspended ? t.badgeDanger : u.active ? t.badgeOk : t.badge
                      }`}
                    >
                      {u.suspended ? "Suspended" : u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs tabular-nums ${t.muted}`}>
                    {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaPagination page={data} onPageChange={setPage} label="users" isDark={isDark} />
    </div>
  );
}
