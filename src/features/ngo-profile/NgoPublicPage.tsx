"use client";

import { ChangeStatusNote, OwnerEditButton, OwnerEditDialog, useNgoPageOwner, type OwnerEditKind } from "./NgoProfileOwnerEdit";
import type { NgoProfileManage } from "@/lib/api";
import { PastWorkSection } from "@/features/ngo-drives/components/PastWorkSection";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, Building2, Calendar, ChevronLeft, ChevronRight, FileText, Globe, Hash, Mail, MapPin,
  Package, Phone, Scale, UserRound,
} from "lucide-react";
import { getPublicNgo, type PublicNgoProfile } from "@/lib/api";
import { PageSkeleton } from "@/components/skeletons";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { BackButton, DRIVES_SECTION_HREF } from "@/components/BackButton";
import { NgoDriveCard } from "@/features/ngo-drives/components/NgoDriveCard";
import { formatDdMmYyyy, formatLegalStructure } from "@/features/ngo-drives/driveFormatters";
import { isNotFound, errorMessage } from "@/features/ngo-drives/driveGiveState";

/** Only APPROVED NGOs have a public page; anything else is "not found". */
function NgoNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center" data-testid="ngo-not-found">
      <AlertCircle className="mb-4 h-12 w-12 text-stone-300 dark:text-zinc-600" aria-hidden />
      <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">NGO not found</h1>
      <p className="mt-2 text-stone-500 dark:text-stone-400">This page may have moved, or the NGO is not verified yet.</p>
      <Link href={DRIVES_SECTION_HREF} className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800">
        Browse NGO drives
      </Link>
    </div>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "N";
}

/** An image that falls back to `fallback` when it is missing or fails to load. */
function SafeImg({ src, alt, className, fallback }: { src?: string | null; alt: string; className: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage link
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function Card({ title, children, className = "", action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Detail({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-stone-800 dark:text-stone-200">{children}</dd>
      </div>
    </div>
  );
}


const DEFAULT_BANNER = "/images/ngo-default-banner.jpg";
const DEFAULT_BANNER_MOBILE = "/images/ngo-default-banner-mobile.jpg";

/** A banner must be wide enough and landscape: natural width >= 800px and height <= width. */
export function isBannerDimensions(width: number, height: number): boolean {
  return width >= 800 && height <= width;
}

export function NgoHeroBanner({
  coverImageUrl,
  orgName,
}: {
  coverImageUrl?: string | null;
  orgName: string;
}) {
  // Which cover URL failed to load or was refused (not a banner shape). Kept per URL, so a new
  // cover gets a fresh chance without a reset effect: that effect also ran on mount and, when
  // React flushed it late, wiped out an error that had already fired.
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [defaultFailed, setDefaultFailed] = useState(false);

  const showCover = Boolean(coverImageUrl && failedCover !== coverImageUrl);

  return (
    <div
      className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 sm:h-56 lg:h-64"
      data-testid="ngo-hero-banner"
    >
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImageUrl!}
          alt={`${orgName} cover banner`}
          className="h-full w-full object-cover"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0 && !isBannerDimensions(naturalWidth, naturalHeight)) {
              setFailedCover(coverImageUrl ?? null);
            }
          }}
          onError={() => setFailedCover(coverImageUrl ?? null)}
          data-testid="ngo-cover-image"
        />
      ) : !defaultFailed ? (
        <picture>
          <source media="(max-width: 640px)" srcSet={DEFAULT_BANNER_MOBILE} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_BANNER}
            alt="CauseKind verified NGO distribution drive"
            className="h-full w-full object-cover"
            onError={() => setDefaultFailed(true)}
            data-testid="ngo-default-banner"
          />
        </picture>
      ) : (
        <div
          className="h-full w-full bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800"
          data-testid="ngo-gradient-fallback"
        />
      )}

      {/* Dark gradient overlay so the title, badges, and quick-stats remain completely readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-900/50 to-black/30" />
    </div>
  );
}

export function NgoPublicPage({ slug }: { slug: string }) {
  const [ngo, setNgo] = useState<PublicNgoProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [message, setMessage] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setState("loading");
    getPublicNgo(slug)
      .then(n => { if (live) { setNgo(n); setState("ready"); } })
      .catch(e => { if (live) { setState(isNotFound(e) ? "not-found" : "error"); setMessage(errorMessage(e, "Please try again.")); } });
    return () => { live = false; };
  }, [slug]);

  // The NGO's own page: Edit buttons on every card (never for donors; the server decides ownership).
  const { manage, setManage } = useNgoPageOwner(slug);
  const [editing, setEditing] = useState<OwnerEditKind | null>(null);
  const onOwnerSaved = (m: NgoProfileManage, publicChanged: boolean) => {
    setManage(m);
    // Cosmetic changes show at once: reload what donors see. A verified-field request changes nothing public yet.
    if (publicChanged) getPublicNgo(slug).then(setNgo).catch(() => {});
  };
  const edit = (kind: OwnerEditKind, label: string) => (manage ? <OwnerEditButton label={label} onClick={() => setEditing(kind)} /> : null);

  if (state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") return <NgoNotFound />;
  if (state === "error" || !ngo) return <p role="alert" className="p-8 text-center text-red-600">{message || "We couldn't load this page."}</p>;

  const place = [ngo.city, ngo.state].filter(Boolean).join(", ");
  const tr = ngo.trackRecord;
  // Up to 3 links (older pages: the website as the single link).
  const links = (ngo.links?.length ? ngo.links : ngo.website ? [ngo.website] : [])
    .map((l) => (l.startsWith("http") ? l : `https://${l}`));

  return (
    <main data-ck-role-theme="ngo" className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      <FilePreviewDialog files={(ngo.documents ?? []).map(d => ({ name: d.label, url: d.url }))} index={previewIndex}
        onIndexChange={setPreviewIndex} onClose={() => setPreviewIndex(null)} />
      {manage && <OwnerEditDialog kind={editing} manage={manage} onSaved={onOwnerSaved} onClose={() => setEditing(null)} />}

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white">
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6"><BackButton onDark /></div>
        <NgoHeroBanner
          coverImageUrl={ngo.coverImageUrl}
          orgName={ngo.organizationName}
        />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end -mt-16 sm:-mt-20">
            <SafeImg src={ngo.logoUrl} alt={`${ngo.organizationName} logo`}
              className="relative h-24 w-24 shrink-0 rounded-2xl border-4 border-white bg-white object-cover shadow-lg dark:border-zinc-900"
              fallback={
                <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-white bg-emerald-50 text-3xl font-black text-emerald-800 shadow-lg dark:border-zinc-900 dark:bg-emerald-950 dark:text-emerald-300" data-testid="ngo-initials">
                  {initials(ngo.organizationName)}
                </div>
              } />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">{ngo.organizationName}</h1>
              {manage && <div className="mt-2">{edit("photos", "cover, logo and photos")}</div>}
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-950/40 px-3 py-1 text-xs font-bold tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                Verified by CauseKind{ngo.verifiedAt ? ` on ${formatDdMmYyyy(ngo.verifiedAt)}` : ""}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-50/90">
                {place && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{place}</span>}
                {ngo.yearOfEstablishment && <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" aria-hidden />Formed in {ngo.yearOfEstablishment}</span>}
              </p>
            </div>
            {tr && (
              <dl className="grid grid-cols-2 gap-3 sm:w-72" data-testid="ngo-quick-stats">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <dt className="text-2xs font-bold uppercase tracking-wider text-emerald-100/80">Drives completed</dt>
                  <dd className="mt-1 text-2xl font-black">{tr.completedDrives ?? 0}</dd>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <dt className="text-2xs font-bold uppercase tracking-wider text-emerald-100/80">Items received</dt>
                  <dd className="mt-1 text-2xl font-black">{tr.itemsReceived ?? 0}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(ngo.aboutUs || manage) && (
            <Card title="About us" action={edit("about", "about us")}>
              {ngo.aboutUs
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-300">{ngo.aboutUs}</p>
                : <p className="text-sm text-stone-500">Tell donors what your NGO does.</p>}
            </Card>
          )}

          {((ngo.photoUrls?.length ?? 0) > 0 || manage) && (
            <Card title="Organisation photos" action={edit("photos", "organisation photos")}>
              {(ngo.photoUrls?.length ?? 0) > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="ngo-photos">
                  {ngo.photoUrls!.map((u, i) => (
                    <li key={u + i}><SafeImg src={u} alt={`${ngo.organizationName} photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" fallback={<div className="aspect-[4/3] w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />} /></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-stone-500">No photos yet.</p>}
            </Card>
          )}


          {(ngo.documents?.length ?? 0) > 0 && (
            <Card title="Documents">
              <ul className="flex flex-wrap gap-2" data-testid="ngo-documents">
                {ngo.documents!.map((d, i) => (
                  <li key={d.label + i}>
                    <button type="button" onClick={() => setPreviewIndex(i)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-800 hover:border-emerald-600 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200 dark:hover:bg-emerald-950/40">
                      <FileText className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />{d.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Opens a secure preview. Links expire after a few minutes.</p>
            </Card>
          )}
          {((ngo.representatives?.length ?? 0) > 0 || manage) && (
            <Card title="Authorized representatives" action={edit("representatives", "representatives")}>
              <ChangeStatusNote manage={manage} fields={["representatives"]} />
              <ul className="grid gap-2 sm:grid-cols-2">
                {(ngo.representatives ?? []).map((r, i) => (
                  <li key={`${r.fullName}-${i}`} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <UserRound className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900 dark:text-stone-100">{r.fullName}</p>
                      {r.designation && <p className="text-xs text-stone-500 dark:text-stone-400">{r.designation}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <PastWorkSection title="Past activity" ngoName={ngo.organizationName} activities={ngo.activities ?? ngo.pastActivities} />

          {(ngo.liveDrives?.length ?? 0) > 0 && (
            <Card title="Live drives">
              <div className="grid gap-4 sm:grid-cols-2">
                {ngo.liveDrives!.map(d => <NgoDriveCard key={d.id} drive={d} />)}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" data-testid="ngo-summary">
          <Card title="Organization details" action={manage ? (
            <div className="flex flex-col items-end gap-1.5">
              <OwnerEditButton label="legal details" onClick={() => setEditing("identity")} />
              <button type="button" onClick={() => setEditing("contact")} className="text-xs font-bold text-emerald-800 underline">Edit phone / address</button>
              <button type="button" onClick={() => setEditing("links")} className="text-xs font-bold text-emerald-800 underline">Edit links</button>
            </div>
          ) : null}>
            <ChangeStatusNote manage={manage} fields={["organizationName", "panNumber", "registrationNumber", "officialEmail", "registeredOfficeAddress"]} />
            <dl className="grid gap-4">
              <Detail icon={Scale} label="Legal structure">{ngo.legalStructure ? formatLegalStructure(ngo.legalStructure) : null}</Detail>
              <Detail icon={Hash} label="Registration number">{ngo.registrationNumber}</Detail>
              <Detail icon={Calendar} label="Year established">{ngo.yearOfEstablishment}</Detail>
              <Detail icon={Building2} label="Registered office">{ngo.registeredOfficeAddress}</Detail>
              <Detail icon={Globe} label={links.length > 1 ? "Links" : "Website"}>{links.length > 0 && (
                <span className="flex flex-col gap-1" data-testid="ngo-links">
                  {links.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="break-all text-emerald-800 underline underline-offset-2 dark:text-emerald-300">{l.replace(/^https?:\/\//, "")}</a>
                  ))}
                </span>
              )}</Detail>
              <Detail icon={Phone} label="Organization phone">{ngo.organizationPhone && (
                <a href={`tel:${ngo.organizationPhone.replace(/[^\d+]/g, "")}`} className="text-emerald-800 underline underline-offset-2 dark:text-emerald-300">{ngo.organizationPhone}</a>
              )}</Detail>
              <Detail icon={Mail} label="Official email">{ngo.officialEmail && (
                <a href={`mailto:${ngo.officialEmail}`} className="break-all text-emerald-800 underline underline-offset-2 dark:text-emerald-300">{ngo.officialEmail}</a>
              )}</Detail>
            </dl>
          </Card>

          {tr && (
            <Card title="Track record">
              <dl className="space-y-3">
                {[
                  { label: "Drives completed", value: tr.completedDrives, icon: Package },
                  { label: "Items received", value: tr.itemsReceived, icon: Package },
                  { label: "Drives with proof", value: tr.drivesWithApprovedProof, icon: FileText },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-zinc-950/60">
                    <dt className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"><Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />{label}</dt>
                    <dd className="text-lg font-black text-stone-900 dark:text-stone-100">{value ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}


        </aside>
      </div>
    </main>
  );
}
