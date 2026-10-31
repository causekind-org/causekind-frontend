"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isNgoRole } from "@/lib/isNgoRole";
import { getNgoDriveReport, type NgoDriveReport } from "@/lib/api";
import { PageSkeleton } from "@/components/skeletons";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { DriveProofCard } from "@/features/ngo-drives/components/DriveProofCard";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, isNotFound } from "@/features/ngo-drives/driveGiveState";
import { formatISTDate } from "@/lib/formatIST";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
const CONTAINER = "mx-auto w-full max-w-3xl px-4 sm:px-6";
const unitWords = (u?: string | null) => (u ? u.replaceAll("_", " ").toLowerCase() : "items");
const fmt = (d?: string | null) => (d ? formatISTDate(d) : "—");
const methodWords = (m?: string | null) => (m === "PICKUP" || m === "NGO_PICKUP" ? "NGO pickup" : m ? "Drop-off" : "—");

/** The NGO's own drive report: the impact tiles, the proof, and the donors whose items arrived (names only). */
export default function NgoDriveReportPage() {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const methodWords = (m?: string | null) => (m === "PICKUP" || m === "NGO_PICKUP" ? ui("NGO pickup") : m ? ui("Drop-off") : "—");
  const id = Number(useParams().id);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [report, setReport] = useState<NgoDriveReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<{ urls: string[]; index: number } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace(`/login?next=/ngo/drives/${id}/report`); return; }
    if (!isNgoRole(user.role?.toUpperCase())) { router.replace("/dashboard"); return; }
    getNgoDriveReport(id).then((r) => { setReport(r); setState("ready"); })
      .catch((e) => { setState(isNotFound(e) || (e as { status?: number })?.status === 403 ? "not-found" : "error"); setMessage(errorMessage(e, ui("Please try again."))); });
  }, [id, user, isLoading, router]);

  if (state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") return <DriveNotFound backHref="/dashboard/ngo?tab=history" backLabel={ui("Back to History")} />;
  if (state === "error" || !report) return <DriveLoadError message={message} onRetry={() => { setState("loading"); router.refresh(); }} />;

  const unit = unitWords(report.unit) || ui("items");
  const tiles: [string, string][] = [
    [df("xOfY", { x: report.quantityReceived, y: report.quantityNeeded }), df("itemReceived", { item: report.itemName ?? unit })],
    [String(report.proof?.beneficiariesReached ?? report.beneficiaryCount ?? "—"), report.beneficiaryGroup ? df("groupReached", { group: report.beneficiaryGroup }) : ui("people reached")],
    [String(report.totalDonors), df("donorsWord", { count: report.totalDonors })],
  ];

  return (
    <main data-ck-role-theme="ngo" className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      {/* One container for hero and cards, so the title, tiles and cards share both edges. */}
      <div className="bg-gradient-to-br from-ngo-900 to-ngo-800 text-white" data-testid="report-hero">
        <div className={CONTAINER + " py-8 sm:py-10"}>
          <div className="mb-6">
            <Link href="/dashboard/ngo?tab=history" className="inline-flex items-center gap-2 text-sm text-ngo-100 hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden /> <UiText>Back to History</UiText>
            </Link>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ngo-200"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> <UiText>Drive report</UiText></p>
          <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">{report.title}</h1>
        </div>
      </div>

      {/* The cards start below the hero (no overlap), on the light page background. */}
      <div className={CONTAINER + " mt-8 space-y-6"} data-testid="report-body">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="report-tiles">
          {tiles.map(([n, label]) => (
            <div key={label} className="flex h-full flex-col justify-center rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="break-words text-2xl font-black text-ngo-700 dark:text-ngo-300">{n}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
            </div>
          ))}
        </div>

        {report.proof ? <DriveProofCard proof={report.proof} factsGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" /> : (
          <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 dark:border-zinc-800 dark:bg-zinc-900"><UiText>No distribution proof yet.</UiText></p>
        )}

        <section data-testid="report-donors" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{df("donorsHeading", { count: report.totalDonors })}</h2>
          {report.donors.length === 0 ? <p className="mt-3 text-sm text-stone-500"><UiText>No items were received for this drive.</UiText></p> : (
            <ul className="mt-4 divide-y divide-stone-100 dark:divide-zinc-800">
              {report.donors.map((d) => (
                <li key={d.offerId} data-testid="report-donor" className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-stone-900 dark:text-stone-100">{d.donorName}</p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{d.quantity ?? "—"} {unit} · {methodWords(d.handoverMethod)}</p>
                    <p className="text-xs text-stone-500">{df("offeredReceived", { offered: fmt(d.offeredAt), received: fmt(d.receivedAt) })}</p>
                  </div>
                  {d.handoverPhotos.length > 0 && (
                    <div className="flex shrink-0 gap-2">
                      {d.handoverPhotos.slice(0, 3).map((u, i) => (
                        <button key={u} type="button" aria-label={df("handoverPhotoFrom", { n: i + 1, name: d.donorName })} onClick={() => setPhotos({ urls: d.handoverPhotos, index: i })}
                          className="h-14 w-14 overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p data-testid="report-total" className="mt-3 border-t border-stone-100 pt-3 text-sm font-semibold text-stone-700 dark:border-zinc-800 dark:text-stone-300">
            {df("reportTotal", { count: report.totalDonors, received: report.totalReceived, unit })}
          </p>
        </section>
      </div>
      <FilePreviewDialog files={(photos?.urls ?? []).map((u, i) => ({ name: df("handoverPhoto", { n: i + 1 }), url: u, mimeType: "image/jpeg" }))}
        index={photos?.index ?? null} onIndexChange={(i) => setPhotos((p) => (p ? { ...p, index: i } : p))} onClose={() => setPhotos(null)} />
    </main>
  );
}
