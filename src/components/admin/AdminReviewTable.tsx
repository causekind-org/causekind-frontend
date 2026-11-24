"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import a from "@/features/fundraising/admin.module.css";

export type ReviewColumn<T> = { header: string; cell: (row: T) => React.ReactNode; num?: boolean };

/**
 * The admin queue as a table with a Review button per row, in the style of the
 * fundraising Publication review list. Review opens the item's full view.
 */
export function AdminReviewTable<T>({ rows, columns, rowKey, onReview, label, highlight, disabled, name, rowTestId }: {
  rows: T[]; columns: ReviewColumn<T>[]; rowKey: (row: T) => string | number; onReview: (row: T) => void;
  label: string; highlight?: (row: T) => boolean; disabled?: boolean;
  /** What the row is, for the Review button's accessible name ("Review <name>"). */
  name?: (row: T) => string | null | undefined; rowTestId?: string;
}) {
  return (
    <div className={a.card} style={{ overflowX: "auto" }}>
      <table className={a.table} aria-label={label}>
        <thead><tr>{columns.map((c) => <th key={c.header} className={c.num ? a.num : undefined}>{c.header}</th>)}<th><span className="sr-only">Review</span></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} data-testid={rowTestId}>
              {columns.map((c) => <td key={c.header} className={c.num ? a.num : undefined}>{c.cell(r)}</td>)}
              <td><button type="button" disabled={disabled} className={`${a.btn} ${highlight?.(r) ? a.bp : a.bs}`}
                aria-label={name?.(r) ? `Review ${name(r)}` : undefined} onClick={() => onReview(r)}>Review</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Main line plus a muted second line, as in the Publication review table. */
export function TwoLine({ main, sub }: { main: React.ReactNode; sub?: React.ReactNode }) {
  return <><strong className="ck-user-text">{main}</strong>{sub ? <div className={`${a.muted} ${a.small} ck-user-text`}>{sub}</div> : null}</>;
}

/** "Back to list" above an item's full view. */
export function BackToList({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className={`${a.btn} ${a.bs}`} onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back to list
    </button>
  );
}

/** Tab label with its count, e.g. "Pending (2)"; no count until it has loaded. */
export function labelWithCount(label: string, n: number | null | undefined) {
  return n == null ? label : `${label} (${n})`;
}

/**
 * Per-tab counts for a server-filtered queue: one request per tab, fetched again
 * when `refreshKey` changes. A tab whose request fails shows no number.
 */
export function useServerTabCounts<S>(statuses: S[], count: (s: S) => Promise<number>, refreshKey: unknown) {
  const [counts, setCounts] = useState<(number | null)[]>(() => statuses.map(() => null));
  useEffect(() => {
    let live = true;
    Promise.all(statuses.map((s) => count(s).catch(() => null))).then((c) => { if (live) setCounts(c); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  return counts;
}
