"use client";

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

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 ${className}`}>
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h2>
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

/** An image / video carousel for one past-activity entry. */
function MediaCarousel({ media, title }: { media: { mediaType: "IMAGE" | "VIDEO"; url: string }[]; title: string }) {
  const [i, setI] = useState(0);
  if (media.length === 0) return null;
  const m = media[Math.min(i, media.length - 1)];
  return (
    <div className="relative overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-950" data-testid="activity-carousel">
      <div className="aspect-video w-full">
        {m.mediaType === "VIDEO"
          ? <video controls preload="metadata" src={m.url} aria-label={`${title} video`} className="h-full w-full bg-black object-contain" />
          : <SafeImg src={m.url} alt={`${title}, photo ${i + 1} of ${media.length}`} className="h-full w-full object-cover"
              fallback={<div className="h-full w-full bg-stone-100 dark:bg-zinc-900" />} />}
      </div>
      {media.length > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => setI((i - 1 + media.length) % media.length)}
            className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" aria-label="Next" onClick={() => setI((i + 1) % media.length)}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, k) => (
              <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-white" : "bg-white/50"}`} aria-hidden />
            ))}
          </div>
        </>
      )}
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
  const [coverFailed, setCoverFailed] = useState(false);
  const [coverRejected, setCoverRejected] = useState(false);
  const [defaultFailed, setDefaultFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
    setCoverRejected(false);
  }, [coverImageUrl]);

  const showCover = Boolean(coverImageUrl && !coverFailed && !coverRejected);

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
              setCoverRejected(true);
            }
          }}
          onError={() => setCoverFailed(true)}
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

  if (state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") return <NgoNotFound />;
  if (state === "error" || !ngo) return <p role="alert" className="p-8 text-center text-red-600">{message || "We couldn't load this page."}</p>;

  const place = [ngo.city, ngo.state].filter(Boolean).join(", ");
  const tr = ngo.trackRecord;
  const website = ngo.website ? (ngo.website.startsWith("http") ? ngo.website : `https://${ngo.website}`) : null;

  return (
    <main data-ck-role-theme="ngo" className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      <FilePreviewDialog files={(ngo.documents ?? []).map(d => ({ name: d.label, url: d.url }))} index={previewIndex}
        onIndexChange={setPreviewIndex} onClose={() => setPreviewIndex(null)} />

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
          {ngo.aboutUs && (
            <Card title="About us">
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-300">{ngo.aboutUs}</p>
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
          {(ngo.representatives?.length ?? 0) > 0 && (
            <Card title="Authorized representatives">
              <ul className="grid gap-2 sm:grid-cols-2">
                {ngo.representatives!.map((r, i) => (
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
          {(ngo.activities?.length ?? 0) > 0 && (
            <Card title="Past activity">
              <ul className="grid gap-4 sm:grid-cols-2">
                {ngo.activities!.map(a => (
                  <li key={a.id} data-testid="public-activity" className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800">
                    <MediaCarousel media={a.media} title={a.title} />
                    <div className="p-3">
                      <p className="font-semibold text-stone-900 dark:text-stone-100">{a.title}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{formatDdMmYyyy(a.activityDate)}</p>
                      {a.description && <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{a.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(ngo.liveDrives?.length ?? 0) > 0 && (
            <Card title="Live drives">
              <div className="grid gap-4 sm:grid-cols-2">
                {ngo.liveDrives!.map(d => <NgoDriveCard key={d.id} drive={d} />)}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" data-testid="ngo-summary">
          <Card title="Organization details">
            <dl className="grid gap-4">
              <Detail icon={Scale} label="Legal structure">{ngo.legalStructure ? formatLegalStructure(ngo.legalStructure) : null}</Detail>
              <Detail icon={Hash} label="Registration number">{ngo.registrationNumber}</Detail>
              <Detail icon={Calendar} label="Year established">{ngo.yearOfEstablishment}</Detail>
              <Detail icon={Building2} label="Registered office">{ngo.registeredOfficeAddress}</Detail>
              <Detail icon={Globe} label="Website">{website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline underline-offset-2 dark:text-emerald-300">{ngo.website}</a>
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
