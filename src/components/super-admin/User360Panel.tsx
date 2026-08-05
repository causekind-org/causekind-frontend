"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminUserProfile,
  superAdminUserRecords,
  superAdminUserTimeline,
  type SaPage,
  type SaRecordSummary,
  type SaRecordType,
  type SaTimelineEvent,
  type SaTimelinePage,
  type SaUserProfile,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaPagination } from "@/components/super-admin/SaPagination";
import { ArrowLeft, Loader2, ShieldAlert, Lock } from "lucide-react";

type Tab = "identity" | "timeline" | "records";

const RECORD_TABS: { key: SaRecordType; label: string }[] = [
  { key: "REQUEST", label: "Requests" },
  { key: "LISTING", label: "Listings" },
  { key: "OFFER", label: "Offers made" },
  { key: "OFFER_RECEIVED", label: "Offers received" },
  { key: "MATCH", label: "Matches" },
];

/**
 * User 360 — everything known about one account, on one screen.
 *
 * <p>Read-only. Restrictions, suspension and interventions are Phase 4–5; the
 * tabs for those are shown as locked rather than hidden so the shape of the
 * finished console is visible and nobody goes looking for a screen that is
 * simply not built yet.
 */
export function User360Panel({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("identity");
  const [profile, setProfile] = useState<SaUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    superAdminUserProfile(userId)
      .then(setProfile)
      .catch(() => toast.error("Couldn't load this user."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back to directory
        </Button>
        <p className="py-10 text-center text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" /> Back to directory
      </Button>

      <IdentityHeader profile={profile} />

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === "identity"} onClick={() => setTab("identity")}>Identity</TabButton>
        <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>Timeline</TabButton>
        <TabButton active={tab === "records"} onClick={() => setTab("records")}>Records</TabButton>
        <LockedTab>Restrictions</LockedTab>
        <LockedTab>Cases</LockedTab>
        <LockedTab>Actions</LockedTab>
      </div>

      {tab === "identity" && <IdentityTab profile={profile} />}
      {tab === "timeline" && <TimelineTab userId={userId} />}
      {tab === "records" && <RecordsTab userId={userId} />}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function IdentityHeader({ profile }: { profile: SaUserProfile }) {
  const s = profile.accountState;
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{profile.fullName}</h2>
          <p className="text-xs text-muted-foreground">
            #{profile.id} · {profile.role ?? "—"} · {profile.city ?? "no city"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {s.suspended && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="size-3" /> Suspended
            </Badge>
          )}
          {!s.active && <Badge variant="secondary">Inactive</Badge>}
          {s.lockoutUntil && new Date(s.lockoutUntil) > new Date() && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" /> Locked out
            </Badge>
          )}
          {!s.suspended && s.active && <Badge variant="secondary">Active</Badge>}
        </div>
      </div>

      {s.suspended && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-medium">{s.suspensionReason ?? "No reason recorded"}</p>
          <p className="mt-1 text-muted-foreground">
            By {s.suspendedByEmail ?? "unknown"}
            {s.suspendedAt && ` on ${new Date(s.suspendedAt).toLocaleString()}`}
            {s.suspendedUntil
              ? ` · until ${new Date(s.suspendedUntil).toLocaleString()}`
              : " · no end date"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Identity tab ──────────────────────────────────────────────────────────────

function IdentityTab({ profile }: { profile: SaUserProfile }) {
  const s = profile.accountState;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">Contact</h3>
        <Field label="Email" value={profile.maskedEmail} />
        <Field label="Phone" value={profile.maskedPhone} />
        <Field
          label="Registered"
          value={profile.registeredAt ? new Date(profile.registeredAt).toLocaleString() : null}
        />
        {/* Says why it is masked rather than looking like missing data. */}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Contact details are masked. Revealing them is a separately audited action
          and arrives with the governance phase.
        </p>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">Account state</h3>
        <Field label="Active" value={s.active ? "Yes" : "No"} />
        <Field label="Suspended" value={s.suspended ? "Yes" : "No"} />
        <Field label="Failed logins" value={String(s.failedLoginAttempts)} />
        <Field
          label="Lockout until"
          value={s.lockoutUntil ? new Date(s.lockoutUntil).toLocaleString() : "—"}
        />
        <Field label="Token version" value={String(s.tokenVersion)} />
      </section>

      <section className="rounded-lg border p-4 md:col-span-2">
        <h3 className="mb-3 text-sm font-medium">Activity</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(profile.counts).map(([key, value]) => (
            <div key={key} className="min-w-[90px]">
              <p className="text-xl font-semibold">{value}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1").toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────────────

function TimelineTab({ userId }: { userId: number }) {
  const [data, setData] = useState<SaTimelinePage | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    superAdminUserTimeline(userId, { categories, page, size: 50 })
      .then(setData)
      .catch(() => toast.error("Couldn't load the timeline."))
      .finally(() => setLoading(false));
  }, [userId, categories, page]);

  useEffect(load, [load]);

  function toggle(category: string) {
    setPage(0);
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  return (
    <div className="space-y-3">
      {/* Offered from availableCategories, which the backend computes before
          filtering — so narrowing can never empty the filter row itself. */}
      <div className="flex flex-wrap gap-1.5">
        {(data?.availableCategories ?? []).map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              categories.includes(c)
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
        {categories.length > 0 && (
          <button
            onClick={() => { setCategories([]); setPage(0); }}
            className="px-2 py-1 text-[11px] text-muted-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.events.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing on this timeline{categories.length > 0 ? " for the selected categories" : ""}.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.events.items.map((e, i) => (
            <TimelineRow key={`${e.at}-${e.type}-${i}`} event={e} />
          ))}
        </ol>
      )}

      <SaPagination page={data?.events ?? null} onPageChange={setPage} label="events" />
    </div>
  );
}

function TimelineRow({ event }: { event: SaTimelineEvent }) {
  // An admin action is the one category where "who" matters as much as "what".
  const isAdminAction = event.category === "ADMIN";
  return (
    <li
      className={`rounded-lg border p-3 ${isAdminAction ? "border-primary/30 bg-primary/[0.03]" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{event.title}</p>
        <time className="text-[11px] text-muted-foreground">
          {new Date(event.at).toLocaleString()}
        </time>
      </div>
      {event.detail && <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]">{event.category}</Badge>
        {event.actor && (
          <span className="text-[11px] text-muted-foreground">by {event.actor}</span>
        )}
        {event.entityType && event.entityId && (
          <span className="text-[11px] text-muted-foreground">
            · {event.entityType} #{event.entityId}
          </span>
        )}
      </div>
    </li>
  );
}

// ── Records tab ───────────────────────────────────────────────────────────────

function RecordsTab({ userId }: { userId: number }) {
  const [type, setType] = useState<SaRecordType>("REQUEST");
  const [data, setData] = useState<SaPage<SaRecordSummary> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    superAdminUserRecords(userId, type, page, 25)
      .then(setData)
      .catch(() => toast.error("Couldn't load these records."))
      .finally(() => setLoading(false));
  }, [userId, type, page]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {RECORD_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setPage(0); }}
            className={`rounded-md px-2.5 py-1 text-xs transition ${
              type === t.key ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No records of this type.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Detail</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((r) => (
                <tr key={`${r.type}-${r.id}`}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-2 text-xs font-medium">{r.title}</td>
                  <td className="px-3 py-2">
                    {r.status ? (
                      <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.detail ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {r.at ? new Date(r.at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaPagination page={data} onPageChange={setPage} label="records" />
    </div>
  );
}

// ── Tab chrome ────────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
        active
          ? "border-primary font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LockedTab({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="-mb-px flex cursor-not-allowed items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground/50"
      title="Not built yet — arrives with a later phase of the console rebuild"
    >
      <Lock className="size-3" />
      {children}
    </span>
  );
}
