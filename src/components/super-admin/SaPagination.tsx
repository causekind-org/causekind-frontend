"use client";

import { Button } from "@/components/ui/button";
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
}: {
  page: SaPage<T> | null;
  onPageChange: (next: number) => void;
  label?: string;
}) {
  if (!page || page.totalItems === 0) return null;

  const first = page.page * page.size + 1;
  const last = page.page * page.size + page.items.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page.page === 0}
        onClick={() => onPageChange(page.page - 1)}
      >
        Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        {first}–{last} of {page.totalItems} {label}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!page.hasNext}
        onClick={() => onPageChange(page.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
