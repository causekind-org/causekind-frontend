"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminApplyRestriction,
  superAdminRestrictionMeta,
  superAdminRestrictions,
  superAdminRevokeRestriction,
  superAdminUserProfile,
  superAdminUserRecords,
  superAdminUserTimeline,
  type SaPage,
  type SaRecordSummary,
  type SaRecordType,
  type SaRestriction,
  type SaRestrictionMeta,
  type SaRestrictionScope,
  type SaRestrictionType,
  type SaTimelineEvent,
  type SaTimelinePage,
  type SaUserProfile,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { saTheme, type SaTheme } from "@/components/super-admin/saTheme";
import { SaPagination } from "@/components/super-admin/SaPagination";
import { ArrowLeft, Loader2, ShieldAlert, Lock } from "lucide-react";

type Tab = "identity" | "timeline" | "records" | "restrictions";

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
 * <p>Identity, Timeline and Records are read-only. Restrictions (Phase 4) is the
 * first tab here that changes anything: granular, reversible controls short of
 * suspension, each of which the backend actually enforces at the point the
 * action happens.
 *
 * <p>Cases and Actions remain locked rather than hidden, so the shape of the
 * finished console stays visible and nobody goes looking for a screen that is
 * simply not built yet.
 */
export function User360Panel({
  userId,
  onBack,
  isDark,
}: {
  userId: number;
  onBack: () => void;
  isDark: boolean;
}) {
  const t = saTheme(isDark);
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

  const backBtn = (
    <button
      onClick={onBack}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
    >
      <ArrowLeft className="size-3.5" /> Back to directory
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className={`size-8 animate-spin ${t.dim}`} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        {backBtn}
        <p className={`py-10 text-center text-sm ${t.muted}`}>User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backBtn}
      <IdentityHeader profile={profile} t={t} />

      <div className={`flex flex-wrap gap-1 border-b ${t.cardFlat}`}>
        <TabButton active={tab === "identity"} onClick={() => setTab("identity")} t={t}>Identity</TabButton>
        <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")} t={t}>Timeline</TabButton>
        <TabButton active={tab === "records"} onClick={() => setTab("records")} t={t}>Records</TabButton>
        <TabButton active={tab === "restrictions"} onClick={() => setTab("restrictions")} t={t}>Restrictions</TabButton>
        <LockedTab t={t}>Cases</LockedTab>
        <LockedTab t={t}>Actions</LockedTab>
      </div>

      {tab === "identity" && <IdentityTab profile={profile} t={t} />}
      {tab === "timeline" && <TimelineTab userId={userId} t={t} isDark={isDark} />}
      {tab === "records" && <RecordsTab userId={userId} t={t} isDark={isDark} />}
      {tab === "restrictions" && <RestrictionsTab userId={userId} t={t} />}
    </div>
  );
}

// ── Restrictions (Phase 4) ────────────────────────────────────────────────────

/**
 * Granular, reversible controls short of suspension.
 *
 * <p>Renders `inForce`, never `status`. A row keeps status ACTIVE after its
 * expiry passes — expiry is computed from the timestamp rather than swept by a
 * job — so showing the raw status would present a lapsed restriction as live.
 *
 * <p>The type list comes from the server rather than being hard-coded here. A
 * copy of the enum in the frontend is a copy that drifts, and the labels
 * describe what each one actually blocks, which is not derivable from the name.
 */
function RestrictionsTab({ userId, t }: { userId: number; t: SaTheme }) {
  const [rows, setRows] = useState<SaRestriction[] | null>(null);
  const [meta, setMeta] = useState<SaRestrictionMeta | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    superAdminRestrictions(userId)
      .then(setRows)
      .catch(() => { setRows([]); toast.error("Couldn't load restrictions."); });
  }, [userId]);

  useEffect(load, [load]);
  useEffect(() => {
    superAdminRestrictionMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  const inForce = (rows ?? []).filter((r) => r.inForce);
  const past = (rows ?? []).filter((r) => !r.inForce);

  async function revoke(r: SaRestriction) {
    const reason = window.prompt("Why is this being lifted? (required)");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await superAdminRevokeRestriction(r.id, reason.trim());
      load();
      toast.success("Restriction lifted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) {
    return <div className="flex justify-center py-10"><Loader2 className={`size-6 animate-spin ${t.dim}`} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${t.muted}`}>
          Controls short of suspension. The user is told the reason, so write it for them.
        </p>
        {!adding && (
          <button
            disabled={busy || !meta}
            onClick={() => setAdding(true)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
          >
            Add restriction
          </button>
        )}
      </div>

      {adding && meta && (
        <AddRestrictionForm
          t={t}
          meta={meta}
          busy={busy}
          onCancel={() => setAdding(false)}
          onSubmit={async (body) => {
            setBusy(true);
            try {
              await superAdminApplyRestriction(userId, body);
              setAdding(false);
              load();
              toast.success("Restriction applied");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "That didn't work.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      <section>
        <h3 className={`mb-2 text-sm font-bold ${t.heading}`}>In force</h3>
        {inForce.length === 0 ? (
          <p className={`text-xs ${t.muted}`}>Nothing currently restricted.</p>
        ) : (
          <ul className="space-y-2">
            {inForce.map((r) => (
              <li key={r.id} className={`rounded-xl border p-3 ${t.dangerPanel}`}>
                <RestrictionBody r={r} t={t} meta={meta} />
                <button
                  disabled={busy}
                  onClick={() => revoke(r)}
                  className={`mt-2 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${t.btn}`}
                >
                  Lift
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h3 className={`mb-2 text-sm font-bold ${t.heading}`}>Lifted or expired</h3>
          <ul className="space-y-2">
            {past.map((r) => (
              <li key={r.id} className={`rounded-xl border p-3 ${t.card}`}>
                <RestrictionBody r={r} t={t} meta={meta} />
                {r.revokedBy && (
                  <p className={`mt-1 text-[11px] ${t.dim}`}>
                    Lifted by {r.revokedBy}
                    {r.revocationReason && ` — ${r.revocationReason}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RestrictionBody({ r, t, meta }: { r: SaRestriction; t: SaTheme; meta: SaRestrictionMeta | null }) {
  const label = meta?.types.find((x) => x.name === r.type)?.label ?? r.type.replace(/_/g, " ");
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-sm font-semibold ${t.heading}`}>
          {label}
          {r.scopeType !== "PLATFORM" && (
            <span className={`font-normal ${t.muted}`}>
              {" "}· {r.scopeType.toLowerCase()} #{r.scopeId}
            </span>
          )}
        </p>
        <span className={`text-[11px] ${t.dim}`}>
          {r.expiresAt ? `until ${new Date(r.expiresAt).toLocaleString()}` : "no end date"}
        </span>
      </div>
      <p className={`mt-0.5 text-xs ${t.text}`}>{r.reason}</p>
      {r.internalNote && <p className={`mt-1 text-[11px] italic ${t.muted}`}>Internal: {r.internalNote}</p>}
      <p className={`mt-1 text-[11px] ${t.dim}`}>
        by {r.createdBy} · {new Date(r.createdAt).toLocaleString()}
      </p>
    </>
  );
}

function AddRestrictionForm({
  t, meta, busy, onCancel, onSubmit,
}: {
  t: SaTheme;
  meta: SaRestrictionMeta;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (body: {
    type: SaRestrictionType; scopeType?: SaRestrictionScope; scopeId?: number;
    reason: string; internalNote?: string; expiresAt?: string;
  }) => void;
}) {
  const [type, setType] = useState<SaRestrictionType>(meta.types[0].name);
  const [scopeType, setScopeType] = useState<SaRestrictionScope>("PLATFORM");
  const [scopeId, setScopeId] = useState("");
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const blocks = meta.types.find((x) => x.name === type)?.blocks;
  const needsScopeId = scopeType !== "PLATFORM";
  const canSend = reason.trim() !== "" && (!needsScopeId || scopeId.trim() !== "");

  return (
    <div className={`rounded-xl border p-3 ${t.card}`}>
      <label className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${t.dim}`}>
        What to block
      </label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SaRestrictionType)}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${t.input}`}
      >
        {meta.types.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
      </select>
      {/* What the type actually prevents, from the server. Names like
          CALL_REQUEST do not say whether they block making or receiving. */}
      {blocks && <p className={`mt-1 text-[11px] ${t.muted}`}>{blocks}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className={`text-[11px] ${t.muted}`}>Applies to</label>
        <select
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as SaRestrictionScope)}
          className={`rounded-lg border px-2 py-1.5 text-xs ${t.input}`}
        >
          <option value="PLATFORM">Everywhere</option>
          {meta.scopes.filter((s) => s !== "PLATFORM").map((s) => (
            <option key={s} value={s}>One {s.toLowerCase()}</option>
          ))}
        </select>
        {needsScopeId && (
          <input
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={`${scopeType.toLowerCase()} id`}
            inputMode="numeric"
            className={`w-28 rounded-lg border px-2 py-1.5 text-xs ${t.input} ${t.placeholder}`}
          />
        )}
      </div>

      <label className={`mb-1 mt-3 block text-[11px] font-semibold uppercase tracking-wide ${t.dim}`}>
        Reason — the user sees this
      </label>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why this is being applied, written for the person it affects"
        className={`w-full rounded-lg border p-2.5 text-sm ${t.input} ${t.placeholder}`}
      />

      <label className={`mb-1 mt-2 block text-[11px] font-semibold uppercase tracking-wide ${t.dim}`}>
        Internal note — the user never sees this
      </label>
      <textarea
        rows={2}
        value={internalNote}
        onChange={(e) => setInternalNote(e.target.value)}
        placeholder="Context for colleagues"
        className={`w-full rounded-lg border p-2.5 text-sm ${t.input} ${t.placeholder}`}
      />

      <label className={`mt-3 flex flex-wrap items-center gap-1.5 text-[11px] ${t.muted}`}>
        Until
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className={`rounded-lg border px-2 py-1 text-xs ${t.input}`}
        />
        <span className={t.dim}>leave empty to keep it until lifted</span>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy || !canSend}
          onClick={() => onSubmit({
            type,
            scopeType,
            scopeId: needsScopeId ? Number(scopeId) : undefined,
            reason: reason.trim(),
            internalNote: internalNote.trim() === "" ? undefined : internalNote.trim(),
            expiresAt: expiresAt === "" ? undefined : expiresAt,
          })}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btnAccent}`}
        >
          Apply restriction
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function IdentityHeader({ profile, t }: { profile: SaUserProfile; t: SaTheme }) {
  const s = profile.accountState;
  const pill = "rounded-full border px-2.5 py-0.5 text-[10px] font-bold";
  return (
    <div className={`rounded-xl border p-4 ${t.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${t.heading}`}>{profile.fullName}</h2>
          <p className={`text-xs ${t.muted}`}>
            #{profile.id} · {profile.role ?? "—"} · {profile.city ?? "no city"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {s.suspended && (
            <span className={`${pill} inline-flex items-center gap-1 ${t.badgeDanger}`}>
              <ShieldAlert className="size-3" /> Suspended
            </span>
          )}
          {!s.active && !s.suspended && <span className={`${pill} ${t.badge}`}>Inactive</span>}
          {s.lockoutUntil && new Date(s.lockoutUntil) > new Date() && (
            <span className={`${pill} inline-flex items-center gap-1 ${t.badge}`}>
              <Lock className="size-3" /> Locked out
            </span>
          )}
          {!s.suspended && s.active && <span className={`${pill} ${t.badgeOk}`}>Active</span>}
        </div>
      </div>

      {s.suspended && (
        <div className={`mt-3 rounded-lg border p-3 text-xs ${t.dangerPanel}`}>
          <p className="font-semibold">{s.suspensionReason ?? "No reason recorded"}</p>
          <p className={`mt-1 ${t.muted}`}>
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

function IdentityTab({ profile, t }: { profile: SaUserProfile; t: SaTheme }) {
  const s = profile.accountState;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={`rounded-xl border p-4 ${t.card}`}>
        <h3 className={`mb-3 text-sm font-bold ${t.heading}`}>Contact</h3>
        <Field label="Email" value={profile.email} t={t} />
        <Field label="Phone" value={profile.phone} t={t} />
        <Field
          label="Registered"
          value={profile.registeredAt ? new Date(profile.registeredAt).toLocaleString() : null}
          t={t}
        />
      </section>

      <section className={`rounded-xl border p-4 ${t.card}`}>
        <h3 className={`mb-3 text-sm font-bold ${t.heading}`}>Account state</h3>
        <Field label="Active" value={s.active ? "Yes" : "No"} t={t} />
        <Field label="Suspended" value={s.suspended ? "Yes" : "No"} t={t} />
        <Field label="Failed logins" value={String(s.failedLoginAttempts)} t={t} />
        <Field
          label="Lockout until"
          value={s.lockoutUntil ? new Date(s.lockoutUntil).toLocaleString() : "—"}
          t={t}
        />
        <Field label="Token version" value={String(s.tokenVersion)} t={t} />
      </section>

      <section className={`rounded-xl border p-4 md:col-span-2 ${t.card}`}>
        <h3 className={`mb-3 text-sm font-bold ${t.heading}`}>Activity</h3>
        <div className="flex flex-wrap gap-5">
          {Object.entries(profile.counts).map(([key, value]) => (
            <div key={key} className="min-w-[90px]">
              <p className={`text-xl font-bold tabular-nums ${t.heading}`}>{value}</p>
              <p className={`text-xs capitalize ${t.muted}`}>
                {key.replace(/([A-Z])/g, " $1").toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, t }: { label: string; value: string | null; t: SaTheme }) {
  return (
    <div className={`flex justify-between gap-3 border-b py-1.5 last:border-0 ${t.cardFlat}`}>
      <span className={`text-xs ${t.muted}`}>{label}</span>
      <span className={`text-xs font-semibold ${t.text}`}>{value ?? "—"}</span>
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────────────

function TimelineTab({ userId, t, isDark }: { userId: number; t: SaTheme; isDark: boolean }) {
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
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              categories.includes(c) ? t.chipActive : t.chipInactive
            }`}
          >
            {c}
          </button>
        ))}
        {categories.length > 0 && (
          <button
            onClick={() => { setCategories([]); setPage(0); }}
            className={`px-2 py-1 text-[11px] underline ${t.muted}`}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`size-6 animate-spin ${t.dim}`} />
        </div>
      ) : !data || data.events.items.length === 0 ? (
        <p className={`py-10 text-center text-sm ${t.muted}`}>
          Nothing on this timeline{categories.length > 0 ? " for the selected categories" : ""}.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.events.items.map((e, i) => (
            <TimelineRow key={`${e.at}-${e.type}-${i}`} event={e} t={t} />
          ))}
        </ol>
      )}

      <SaPagination page={data?.events ?? null} onPageChange={setPage} label="events" isDark={isDark} />
    </div>
  );
}

function TimelineRow({ event, t }: { event: SaTimelineEvent; t: SaTheme }) {
  // An admin action is the one category where "who" matters as much as "what".
  const isAdminAction = event.category === "ADMIN";
  return (
    <li className={`rounded-xl border p-3 ${isAdminAction ? t.accentPanel : t.card}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-sm font-semibold ${t.heading}`}>{event.title}</p>
        <time className={`text-[11px] tabular-nums ${t.dim}`}>
          {new Date(event.at).toLocaleString()}
        </time>
      </div>
      {event.detail && <p className={`mt-1 text-xs ${t.muted}`}>{event.detail}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            isAdminAction ? t.badgeAccent : t.badge
          }`}
        >
          {event.category}
        </span>
        {event.actor && <span className={`text-[11px] ${t.dim}`}>by {event.actor}</span>}
        {event.entityType && event.entityId && (
          <span className={`text-[11px] ${t.dim}`}>· {event.entityType} #{event.entityId}</span>
        )}
      </div>
    </li>
  );
}

// ── Records tab ───────────────────────────────────────────────────────────────

function RecordsTab({ userId, t, isDark }: { userId: number; t: SaTheme; isDark: boolean }) {
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

  const th = `px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider ${t.dim}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {RECORD_TABS.map((rt) => (
          <button
            key={rt.key}
            onClick={() => { setType(rt.key); setPage(0); }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              type === rt.key ? t.chipActive : t.chipInactive
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`size-6 animate-spin ${t.dim}`} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className={`py-10 text-center text-sm ${t.muted}`}>No records of this type.</p>
      ) : (
        <div className={`overflow-x-auto rounded-xl border ${t.cardFlat}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${t.tableHead}`}>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Title</th>
                <th className={th}>Status</th>
                <th className={th}>Detail</th>
                <th className={th}>When</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divide}`}>
              {data.items.map((r) => (
                <tr key={`${r.type}-${r.id}`}>
                  <td className={`px-3 py-2 text-xs tabular-nums ${t.dim}`}>{r.id}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${t.heading}`}>{r.title}</td>
                  <td className="px-3 py-2">
                    {r.status ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
                        {r.status}
                      </span>
                    ) : (
                      <span className={`text-xs ${t.dim}`}>—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-xs ${t.muted}`}>{r.detail ?? "—"}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs tabular-nums ${t.muted}`}>
                    {r.at ? new Date(r.at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaPagination page={data} onPageChange={setPage} label="records" isDark={isDark} />
    </div>
  );
}

// ── Tab chrome ────────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, children, t,
}: { active: boolean; onClick: () => void; children: React.ReactNode; t: SaTheme }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
        active ? t.tabActive : t.tabInactive
      }`}
    >
      {children}
    </button>
  );
}

function LockedTab({ children, t }: { children: React.ReactNode; t: SaTheme }) {
  return (
    <span
      className={`-mb-px flex cursor-not-allowed items-center gap-1 border-b-2 px-3 py-2 text-sm ${t.tabLocked}`}
      title="Not built yet — arrives with a later phase of the console rebuild"
    >
      <Lock className="size-3" />
      {children}
    </span>
  );
}
