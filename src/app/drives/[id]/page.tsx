"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, MapPin, CalendarClock, Users, Package, Clock, Building2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getNgoDrive, getMyNgoDriveOffers, type PublicNgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { PageSkeleton } from "@/components/skeletons";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, giveState, isNotFound, stillNeeded } from "@/features/ngo-drives/driveGiveState";

const CONDITION_RULE: Record<string, string> = {
  NEW_ONLY: "New or unused items only.",
  GENTLY_USED: "Gently used items are welcome (clean, working, no major damage).",
  NEW_OR_GENTLY_USED: "New or gently used items (clean, working, no major damage).",
};
const DAY: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
const humanize = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

export default function DriveDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user, isLoading: authLoading } = useAuth();

  const [drive, setDrive] = useState<PublicNgoDrive | null>(null);
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isDonor = (user?.role ?? "").toUpperCase() === "DONOR";

  const loadDrive = useCallback(async () => {
    if (Number.isNaN(id)) return;
    setLoadError(null);
    try {
      setDrive(await getNgoDrive(id));
    } catch (e) {
      setLoadError({ notFound: isNotFound(e), message: errorMessage(e, "Please check your connection and try again.") });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // The donor's own offers are loaded separately: if they fail, the drive still shows.
  const loadOffers = useCallback(async () => {
    if (!isDonor) { setOffers([]); return; }
    setOffersError(null);
    try { setOffers(await getMyNgoDriveOffers()); }
    catch (e) { setOffersError(errorMessage(e, "We couldn't check your offers.")); }
  }, [isDonor]);

  useEffect(() => { void loadDrive(); }, [loadDrive]);
  useEffect(() => { if (!authLoading) void loadOffers(); }, [authLoading, loadOffers]);
  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => { void loadDrive(); void loadOffers(); });

  if (loading || authLoading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (loadError?.notFound) return <DriveNotFound backHref="/requests" backLabel="Back to browse" />;
  if (loadError || !drive) {
    return <DriveLoadError message={loadError?.message ?? "Something went wrong."} onRetry={() => { setLoading(true); void loadDrive(); }} />;
  }

  const needed = stillNeeded(drive);
  const total = Math.max(1, drive.quantityNeeded);
  const receivedPct = Math.min(100, (drive.quantityReceived / total) * 100);
  const onTheWayPct = Math.min(100 - receivedPct, (drive.quantityPledged / total) * 100);
  const state = giveState(drive, user, offers);
  const urgent = (drive.urgency ?? "").toUpperCase() === "HIGH" || (drive.urgency ?? "").toUpperCase() === "URGENT";
  const days = (drive.availableDays ?? []).map((d) => DAY[d] ?? d).join(", ");

  return (
    <main className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-900 to-emerald-800 px-4 py-10 text-white sm:px-6 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-2">
            {drive.verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verified NGO
              </span>
            )}
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50">{drive.category}</span>
            {drive.urgency && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${urgent ? "bg-amber-400 text-amber-950" : "bg-white/10 text-emerald-50"}`}>
                {humanize(drive.urgency)} urgency
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{drive.title}</h1>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-emerald-100">
            <li className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" />{drive.ngoOrganizationName || "Verified NGO"}</li>
            {drive.ngoCity && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />{drive.ngoCity}</li>}
            <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4" aria-hidden="true" />Needed by {new Date(drive.neededBy).toLocaleDateString()}</li>
          </ul>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:gap-8">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {drive.referencePhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drive.referencePhotoUrl} alt={`Example of the ${drive.itemName} needed`}
              className="aspect-video w-full rounded-2xl border border-stone-200 object-cover dark:border-zinc-800" />
          )}

          <Card title="About this drive">
            <p className="whitespace-pre-wrap leading-relaxed text-stone-700 dark:text-stone-300">{drive.description}</p>
          </Card>

          <Card title="What's needed">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Fact icon={<Package className="h-5 w-5" />} label="Item">
                {drive.quantityNeeded} {humanize(drive.unit)} of {drive.itemName}
              </Fact>
              <Fact icon={<ShieldCheck className="h-5 w-5" />} label="Condition">
                {CONDITION_RULE[drive.condition ?? ""] ?? (humanize(drive.condition) || "Any good condition")}
              </Fact>
              {drive.beneficiaryCount != null && (
                <Fact icon={<Users className="h-5 w-5" />} label="Who it helps">
                  {drive.beneficiaryCount} {drive.beneficiaryGroup}
                </Fact>
              )}
              {drive.details && <Fact icon={<Package className="h-5 w-5" />} label="Details">{drive.details}</Fact>}
            </dl>
          </Card>

          <Card title="Handover">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Fact icon={<Clock className="h-5 w-5" />} label="When the NGO receives items">
                {days || "Days agreed with the NGO"}{drive.availableFrom && drive.availableTo ? `, ${drive.availableFrom}–${drive.availableTo}` : ""}
              </Fact>
              <Fact icon={<Lock className="h-5 w-5" />} label="Address">
                Drop off at the NGO or ask for a pickup. The NGO&apos;s address and phone are shared after it accepts your offer.
              </Fact>
            </dl>
          </Card>
        </div>

        {/* Side card */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Progress</h2>
            <p className="mt-2 text-2xl font-black text-stone-900 dark:text-stone-100">
              {drive.quantityReceived + drive.quantityPledged} <span className="text-base font-semibold text-stone-500 dark:text-stone-400">of {drive.quantityNeeded} {humanize(drive.unit)} offered</span>
            </p>
            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800"
              role="progressbar" aria-label="Drive progress" aria-valuemin={0} aria-valuemax={drive.quantityNeeded}
              aria-valuenow={drive.quantityReceived + drive.quantityPledged}>
              <div className="h-full bg-emerald-600" style={{ width: `${receivedPct}%` }} />
              <div className="h-full bg-emerald-300 dark:bg-emerald-700" style={{ width: `${onTheWayPct}%` }} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Received" value={drive.quantityReceived} swatch="bg-emerald-600" />
              <Stat label="On the way" value={drive.quantityPledged} swatch="bg-emerald-300 dark:bg-emerald-700" />
              <Stat label="Still needed" value={needed} swatch="bg-stone-300 dark:bg-zinc-600" />
            </dl>

            <div className="mt-6 border-t border-stone-100 pt-5 dark:border-zinc-800">
              {drive.status === "FULFILLED" && (
                <Link href={`/drives/${drive.id}/proof`} className="mb-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-emerald-600 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                  See how the items were used
                </Link>
              )}
              {offersError && isDonor ? (
                <div role="alert" className="text-sm text-red-700 dark:text-red-400">
                  {offersError}{" "}
                  <button type="button" className="font-bold underline" onClick={() => void loadOffers()}>Retry</button>
                </div>
              ) : state.kind === "give" || state.kind === "login" ? (
                <>
                  <Link href={state.href} className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white shadow-sm hover:bg-emerald-700">
                    Give to this drive
                  </Link>
                  <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
                    {state.kind === "login" ? "You'll log in first, then come straight back." : "Many donors give to one drive. Give any amount, up to what's still needed."}
                  </p>
                </>
              ) : state.kind === "continue" ? (
                <Link href={state.href} className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700">
                  Continue your offer
                </Link>
              ) : state.kind === "offered" ? (
                <>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">You already offered {state.offer.quantity} {humanize(drive.unit)}.</p>
                  <Link href={state.href} className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-300 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800">
                    {state.href.includes("/handover") ? "Open your handover" : "See your offer"}
                  </Link>
                </>
              ) : state.kind === "closed" ? (
                <>
                  <button type="button" disabled className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 text-base font-bold text-stone-500 dark:bg-zinc-800 dark:text-stone-400">
                    Give to this drive
                  </button>
                  <p className="mt-3 text-center text-xs text-stone-600 dark:text-stone-400">{state.reason}</p>
                </>
              ) : (
                <p className="text-sm text-stone-600 dark:text-stone-400">{state.reason}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</dt>
        <dd className="mt-1 break-words text-stone-800 dark:text-stone-200">{children}</dd>
      </div>
    </div>
  );
}

function Stat({ label, value, swatch }: { label: string; value: number; swatch: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 flex items-center justify-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
        <span className={`h-2 w-2 rounded-full ${swatch}`} aria-hidden="true" />{label}
      </dt>
      <dd className="text-xl font-black text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
