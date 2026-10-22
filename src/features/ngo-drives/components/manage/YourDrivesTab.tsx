"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Calendar, Heart, Loader2, Trash2 } from "lucide-react";
import type { NgoDrive } from "@/lib/api";
import { serverDate } from "@/lib/serverTime";
import { Badge } from "@/components/ui/badge";
import { DriveQuantityBar } from "@/features/ngo-drives/components/DriveQuantityBar";
import { DRIVE_STATUS_LABEL, driveInChip, isOfferToReview, type DriveChip } from "./driveActivity";
import { useAuth } from "@/hooks/useAuth";
import { humanize } from "./NgoOfferReviewCard";
import type { DriveOffer } from "./useNgoOffers";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
type DriveRow = "draft" | Exclude<DriveChip, "all">;
const CHIPS: [DriveRow | "all", string][] = [["all", "All"], ["draft", "Draft"], ["review", "In review"], ["live", "Live"], ["completed", "Drive completed"]];
const ROWS: [DriveRow, string][] = [["draft", "Draft"], ["review", "In review"], ["live", "Live"], ["completed", "Drive completed"]];

/** The unsubmitted drive: the wizard keeps one draft per account in this browser (there is no DRAFT drive status). */
export const driveDraftKey = (user: { id?: unknown; userId?: unknown; email?: string | null } | null | undefined) =>
  `ngo-drive-draft-${user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous")}`;
type DriveDraft = { title?: string; category?: string; itemName?: string; quantity?: string | number; unit?: string };
function readDraft(key: string): DriveDraft | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as DriveDraft) : null; } catch { return null; }
}
const STATUS_LABEL = DRIVE_STATUS_LABEL;

export function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} data-testid={testId}
      className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-colors ${active
        ? "border-ngo-700 bg-ngo-700 text-white"
        : "border-stone-200 bg-white text-stone-600 hover:border-ngo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300"}`}>
      {children}
    </button>
  );
}

export function YourDrivesTab({ drives, offers, loading, error, onRetry, startDrive }: {
  drives: NgoDrive[]; offers: DriveOffer[]; loading: boolean; error: boolean; onRetry: () => void; startDrive: ReactNode;
}) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const dc = useDriveCopy();
  const { user } = useAuth();
  const [chip, setChip] = useState<DriveRow | "all">("all");
  const [draft, setDraft] = useState<DriveDraft | null>(null);
  const draftKey = driveDraftKey(user);
  useEffect(() => { setDraft(readDraft(draftKey)); }, [draftKey]);

  const sorted = [...drives].sort((a, b) => serverDate(b.createdAt || Date.now()).getTime() - serverDate(a.createdAt || Date.now()).getTime());
  const rowDrives = (row: DriveRow) => (row === "draft" ? [] : sorted.filter((d) => driveInChip(d.status, row)));
  const count = (row: DriveRow | "all") => row === "all" ? drives.length + (draft ? 1 : 0) : row === "draft" ? (draft ? 1 : 0) : rowDrives(row).length;

  if (loading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-300" /></div>;
  if (error) return (
    <div className="py-12 text-center text-sm text-stone-500">
      <p><UiText>We couldn&apos;t load your drives.</UiText></p>
      <button onClick={onRetry} className="mt-1 font-bold text-ngo-700 hover:underline"><UiText>Try again</UiText></button>
    </div>
  );
  if (drives.length === 0 && !draft) return (
    <div className="space-y-3 py-8 text-center sm:py-14">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>No drives yet</UiText></p>
      <p className="mx-auto max-w-[240px] text-xs text-stone-400"><UiText>Start a drive and tell givers exactly what you need.</UiText></p>
      {startDrive}
    </div>
  );

  // "All": every row that has something. A chip: just that row (with an empty line if empty).
  const rows = ROWS.filter(([row]) => (chip === "all" ? count(row) > 0 : chip === row));

  const renderDrive = (drive: NgoDrive) => {
      const pending = offers.filter((o) => o.drive.id === drive.id && isOfferToReview(o)).length;
            const unit = humanize(drive.unit);
            return (
              <li key={drive.id} data-testid="ngo-drive-card">
                <Link href={`/ngo/drives/${drive.id}`} className="block overflow-hidden rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm transition-colors hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 sm:p-5">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{drive.category}</span>
                    <Badge variant="secondary" data-testid="drive-status-label" className={drive.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-ngo-100 text-ngo-800 dark:bg-ngo-900/40 dark:text-ngo-100"}>
                      {STATUS_LABEL[drive.status] ? dc(STATUS_LABEL[drive.status]) : humanize(drive.status)}
                    </Badge>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-stone-900 dark:text-stone-100">{drive.title}</h3>
                  <p className="mb-3 text-sm font-medium text-stone-600 dark:text-stone-400">{df("qtyUnitOfItem", { qty: drive.quantityNeeded, unit, item: drive.itemName ?? "" })}</p>
                  <div className="mb-4 flex flex-wrap gap-4 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> {df("forGroup", { count: drive.beneficiaryCount ?? 0, group: drive.beneficiaryGroup ?? "" })}</span>
                    {drive.neededBy && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {df("neededBy", { date: new Date(drive.neededBy).toLocaleDateString() })}</span>}
                  </div>
                  {(drive.status === "CHANGES_REQUESTED" || drive.status === "REJECTED") && drive.adminReason && (
                    <p className="mb-3 text-sm text-stone-600 dark:text-stone-400"><strong><UiText>Reason:</UiText></strong> {drive.adminReason}</p>
                  )}
                  <div className="max-w-md">
                    <DriveQuantityBar compact needed={drive.quantityNeeded} received={drive.quantityReceived || 0} pledged={drive.quantityPledged || 0} unit={unit} />
                  </div>
                  {pending > 0 && (
                    <p data-testid="drive-card-pending" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                      {df("offersToReview", { count: pending })}
                    </p>
                  )}
                </Link>
              </li>
            );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={ui("Filter drives")}>
        {CHIPS.map(([key, label]) => (
          <Chip key={key} active={chip === key} onClick={() => setChip(key)} testId={`drive-chip-${key}`}>
            {dc(label)} <span className="tabular-nums opacity-70">{count(key)}</span>
          </Chip>
        ))}
      </div>
      {rows.map(([row, label]) => (
        <section key={row} data-testid={`drive-row-${row}`} aria-labelledby={`drive-row-${row}-h`} className="space-y-3">
          <h3 id={`drive-row-${row}-h`} className="flex items-center gap-2 border-b-2 border-ngo-700/50 pb-2 text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:border-ngo-400/40 dark:text-ngo-400">
            {dc(label)} <span className="rounded-full bg-ngo-100 px-1.5 py-px tabular-nums text-ngo-800 dark:bg-ngo-900/40 dark:text-ngo-100">{count(row)}</span>
          </h3>
          {count(row) === 0 ? <p className="text-sm text-stone-500"><UiText>Nothing here.</UiText></p> : (
            <ul className="space-y-4">
              {row === "draft" && draft ? (
                <li data-testid="ngo-draft-card" className="rounded-xl border border-dashed border-stone-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{draft.category || ui("Not submitted")}</span>
                    <Badge variant="secondary" data-testid="drive-status-label" className="bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-stone-200"><UiText>Draft</UiText></Badge>
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-stone-900 dark:text-stone-100">{draft.title || ui("Untitled drive")}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/ngo/drives/new" className="inline-flex min-h-9 items-center rounded-lg bg-ngo-700 px-4 text-sm font-bold text-white hover:bg-ngo-800"><UiText>Continue editing</UiText></Link>
                    <button type="button" onClick={() => { try { localStorage.removeItem(draftKey); } catch { /* private mode */ } setDraft(null); }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-zinc-700 dark:text-red-300">
                      <Trash2 className="h-4 w-4" aria-hidden /> <UiText>Delete draft</UiText>
                    </button>
                  </div>
                </li>
              ) : rowDrives(row).map(renderDrive)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
