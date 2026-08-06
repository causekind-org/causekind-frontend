"use client";

import { saTheme } from "@/components/super-admin/saTheme";
import type { SaPage } from "@/lib/api";

/**
 * Shared pager for every Phase 2 list. Reads straight off the backend's
 * PageResponse envelope so no screen has to derive "is there a next page"
 * itself and get it subtly wrong on the last page.
 */
export function SaPagination<T>({
  page,
  onPageChange,
  label = "items",
  isDark,
}: {
  page: SaPage<T> | null;
  onPageChange: (next: number) => void;
  label?: string;
  isDark: boolean;
}) {
  const t = saTheme(isDark);
  if (!page || page.totalItems === 0) return null;

  const first = page.page * page.size + 1;
  const last = page.page * page.size + page.items.length;
  const btn = `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={btn} disabled={page.page === 0} onClick={() => onPageChange(page.page - 1)}>
        Prev
      </button>
      <span className={`text-xs tabular-nums ${t.muted}`}>
        {first}–{last} of {page.totalItems} {label}
      </span>
      <button className={btn} disabled={!page.hasNext} onClick={() => onPageChange(page.page + 1)}>
        Next
      </button>
    </div>
  );
}
