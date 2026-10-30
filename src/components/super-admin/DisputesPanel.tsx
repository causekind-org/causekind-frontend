"use client";

import { serverDate } from "@/lib/serverTime";
import { useEffect, useState } from "react";
import {
  adminResolvePurchaseIssue, superAdminListDisputes, superAdminResolveDispute, type PostDeliveryIssue,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { Scale, Loader2, ExternalLink, CheckCircle2, Clock } from "lucide-react";

const STATUS_TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]["key"];

// Same theme-token shape as WhatsAppPanel.tsx — chipActive/chipInactive is the
// exact filled-vs-outline pill pattern reused here for the status tabs, so the
// contrast bug (unselected pill text matching its own background) can't recur:
// unselected pills never have a filled background, only a muted text color
// against the page's own bg, and selected pills always pair a solid accent
// fill with a genuinely dark/light contrasting text color.
function useTheme(isDark: boolean) {
  return isDark ? {
    heading: "text-white",
    icon: "text-[#f0b97a]",
    dim: "text-stone-500",
    muted: "text-stone-400",
    card: "border-white/10 bg-white/[0.03]",
    chipActive: "bg-[#f0b97a] text-stone-950 border-[#f0b97a]",
    chipInactive: "border-white/10 text-stone-400 hover:border-white/20 hover:text-white",
    textarea: "border-white/10 bg-[#0b0f1a] text-stone-200 placeholder:text-stone-600",
    primaryBtn: "bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950",
    link: "text-[#f0b97a] hover:underline",
    ok: "text-emerald-400",
    okBg: "bg-emerald-500/10 border-emerald-500/20",
    warnBg: "bg-red-500/10 border-red-500/20",
    warnText: "text-red-400",
  } : {
    heading: "text-stone-900",
    icon: "text-[#b04a15]",
    dim: "text-stone-500",
    muted: "text-stone-500",
    card: "border-stone-200 bg-white",
    chipActive: "bg-[#b04a15] text-white border-[#b04a15]",
    chipInactive: "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-900",
    textarea: "border-stone-200 bg-white text-stone-800 placeholder:text-stone-400",
    primaryBtn: "bg-[#b04a15] hover:bg-[#963e11] text-white",
    link: "text-[#b04a15] hover:underline",
    ok: "text-emerald-600",
    okBg: "bg-emerald-50 border-emerald-200",
    warnBg: "bg-red-50 border-red-200",
    warnText: "text-red-600",
  };
}
type Theme = ReturnType<typeof useTheme>;

const ISSUE_TYPE_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong item",
  UNDISCLOSED_DAMAGE: "Undisclosed damage",
  MISSING_ACCESSORIES: "Missing accessories",
  UNSAFE_ITEM: "Unsafe item",
  MONEY_DEMANDED: "Money demanded",
  INAPPROPRIATE_BEHAVIOUR: "Inappropriate behaviour",
  OTHER: "Other",
  // Donee handover options
  ITEM_NOT_RECEIVED: "Item not received",
  ITEM_DAMAGED: "Item arrived damaged",
  ITEM_NOT_AS_DESCRIBED: "Item not as described",
  QUANTITY_MISMATCH: "Quantity wrong",
  // Donor handover options
  RECIPIENT_DID_NOT_SHOW: "Recipient didn't show up",
  RECIPIENT_DENIED_DELIVERY: "Recipient disputes delivery",
  ITEM_RESOLD_OR_MISUSED: "Item resold or misused",
};

export function DisputesPanel({ isDark }: { isDark: boolean }) {
  const t = useTheme(isDark);
  const [tab, setTab] = useState<StatusTab>("open");
  const [disputes, setDisputes] = useState<PostDeliveryIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    superAdminListDisputes(tab)
      .then((data) => { if (active) setDisputes(data); })
      .catch(() => { if (active) setDisputes([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab]);

  /** Purchase problems resolve through the purchase lifecycle so stock and status move with them. */
  async function handlePurchaseResolve(d: PostDeliveryIssue, action: "RETRY_DELIVERY" | "CANCEL_REMAINDER") {
    const reason = (drafts[d.id] ?? "").trim();
    if (reason.length < 10 || d.offerId == null) { toast.error("Add a reason of at least 10 characters"); return; }
    setResolvingId(d.id);
    try {
      await adminResolvePurchaseIssue(d.offerId, { action, reason });
      toast.success(action === "RETRY_DELIVERY" ? "Redelivery expected — the donor has been told" : "Remainder closed");
      const fresh = await superAdminListDisputes(tab);
      setDisputes(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve dispute");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleResolve(id: number) {
    const resolution = (drafts[id] ?? "").trim();
    if (!resolution) { toast.error("Add a resolution note before resolving"); return; }
    setResolvingId(id);
    try {
      const updated = await superAdminResolveDispute(id, resolution);
      toast.success("Dispute resolved");
      setDisputes((prev) => tab === "open" ? prev.filter((d) => d.id !== id) : prev.map((d) => d.id === id ? updated : d));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve dispute");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className={`text-base sm:text-lg font-black tracking-tight ${t.heading}`}>Disputes</h2>
        <p className={`text-xs ${t.dim}`}>Post-delivery issue reports from donors and recipients.</p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === key ? t.chipActive : t.chipInactive}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`w-6 h-6 animate-spin ${t.icon}`} />
        </div>
      ) : disputes.length === 0 ? (
        <p className={`text-sm text-center py-16 ${t.dim}`}>No disputes in this view.</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <DisputeCard
              key={d.id} d={d} t={t}
              resolving={resolvingId === d.id}
              draft={drafts[d.id] ?? ""}
              onDraftChange={(v) => setDrafts((prev) => ({ ...prev, [d.id]: v }))}
              onResolve={() => handleResolve(d.id)}
              onPurchaseResolve={(action) => handlePurchaseResolve(d, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DisputeCard({
  d, t, resolving, draft, onDraftChange, onResolve, onPurchaseResolve,
}: {
  d: PostDeliveryIssue; t: Theme; resolving: boolean;
  draft: string; onDraftChange: (v: string) => void; onResolve: () => void;
  onPurchaseResolve: (action: "RETRY_DELIVERY" | "CANCEL_REMAINDER") => void;
}) {
  const resolved = !!d.resolvedAt;
  return (
    <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 space-y-2.5 sm:space-y-3 ${t.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-3xs font-black uppercase tracking-wider ${resolved ? `${t.okBg} ${t.ok}` : `${t.warnBg} ${t.warnText}`}`}>
              {resolved ? <CheckCircle2 className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
              {resolved ? "Resolved" : "Open"}
            </span>
            <span className={`text-3xs font-bold uppercase tracking-wider ${t.muted}`}>
              {ISSUE_TYPE_LABELS[d.issueType ?? ""] ?? d.issueType ?? "Unknown"}
            </span>
            {d.purchase && <span className={`text-3xs font-bold uppercase tracking-wider ${t.muted}`}>· Purchase delivery{d.affectedQuantity != null ? ` · ${d.affectedQuantity} affected` : ""}</span>}
          </div>
          <p className={`mt-1.5 font-bold text-sm ${t.heading}`}>{d.itemTitle ?? `Offer #${d.offerId}`}</p>
          <p className={`text-xs mt-0.5 ${t.dim}`}>
            Reported by {d.reportedByName ?? "someone"} ({d.reportedByIsDonor ? "donor" : "recipient"}) &middot; Donor: {d.donorName ?? "—"} &middot; Recipient: {d.doneeName ?? "—"}
          </p>
        </div>
        {d.windowExpiresAt && !resolved && (
          <span className={`inline-flex items-center gap-1 text-3xs font-bold shrink-0 ${t.muted}`}>
            <Clock className="w-3 h-3" /> Window: {serverDate(d.windowExpiresAt).toLocaleDateString("en-IN")}
          </span>
        )}
      </div>

      <p className={`text-sm leading-relaxed ${t.muted}`}>{d.description}</p>
      {d.purchase && (
        <p className={`text-xs leading-relaxed ${t.dim}`}>
          {d.counterpartyResponse
            ? <>{d.reportedByIsDonor ? "Recipient" : "Donor"} replied: {d.counterpartyResponse}</>
            : <>No reply from the {d.reportedByIsDonor ? "recipient" : "donor"} yet.</>}
          {" "}Delivery proof, photos and tracking are in Admin → Offers → Purchases.
        </p>
      )}

      {d.evidenceUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.evidenceUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-xs font-bold ${t.link}`}>
              <ExternalLink className="w-3 h-3" /> Evidence {i + 1}
            </a>
          ))}
        </div>
      )}

      {resolved ? (
        <div className={`rounded-xl border p-3 text-xs ${t.okBg}`}>
          <p className={`font-bold ${t.ok}`}>Resolution</p>
          <p className={`mt-1 ${t.muted}`}>{d.adminResolution}</p>
          <p className={`mt-1.5 ${t.dim}`}>{d.resolvedAt && serverDate(d.resolvedAt).toLocaleString("en-IN")}</p>
        </div>
      ) : d.purchase ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Reason — recorded in the audit log and shown to both participants (at least 10 characters)"
            rows={2}
            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${t.textarea}`}
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onPurchaseResolve("RETRY_DELIVERY")} disabled={resolving || draft.trim().length < 10}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${t.primaryBtn}`}>
              {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Expect redelivery / replacement"}
            </button>
            <button onClick={() => onPurchaseResolve("CANCEL_REMAINDER")} disabled={resolving || draft.trim().length < 10}
              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors disabled:opacity-50 ${t.chipInactive}`}>
              Close undelivered remainder
            </button>
          </div>
          <p className={`text-3xs ${t.dim}`}>Closing counts only what was confirmed received; the rest goes back to the request. If nothing was received, the offer is cancelled.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="How was this resolved?"
            rows={2}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none ${t.textarea}`}
          />
          <button
            onClick={onResolve}
            disabled={resolving}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${t.primaryBtn}`}
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}
