"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcCampaigns,
  mcSegments,
  mcTemplates,
  mcAudiences,
  type McAudience,
  type McCampaign,
  type McTemplate,
} from "@/lib/api";
import { Loader2, Mail, Plus } from "lucide-react";
import { EMPTY, audienceKey, type Draft } from "./mail/shared";
import { SaLoadError } from "./SaLoadError";
import { CampaignList } from "./mail/CampaignList";
import { CampaignEditor } from "./mail/CampaignEditor";
import { TemplatesView } from "./mail/TemplatesView";
import { SuppressionView } from "./mail/SuppressionView";
import { AudiencesView } from "./mail/AudiencesView";
import { MailIdsView } from "./mail/MailIdsView";
import { InboxView } from "./mail/InboxView";
import { MarketingView } from "./mail/MarketingView";
import { AutomationsView } from "./mail/AutomationsView";
import { OverviewV2, ReportsView, ActivityView, SystemView } from "./mail/InsightsViews";
import { mcMailboxes } from "@/lib/api";

/**
 * Super Admin Mail Center, phase 1: campaigns and templates.
 *
 * <p>Every safety rule (no donees, opt-outs, unsubscribe, daily cap, auto-pause,
 * no unknown variables) lives on the server. This screen only explains them.
 * The preview is a server render, so what is approved is what is sent.
 */

const VIEWS = ["overview", "inbox", "campaigns", "reports", "marketing", "audiences", "automations", "templates", "mailids", "activity", "system", "suppression"] as const;
type View = (typeof VIEWS)[number];

export function MailCenterPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [view, setView] = useState<View>("campaigns");
  const [audiences, setAudiences] = useState<McAudience[]>([]);
  const [campaigns, setCampaigns] = useState<McCampaign[]>([]);
  const [templates, setTemplates] = useState<McTemplate[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [openReport, setOpenReport] = useState<number | null>(null);
  const [openList, setOpenList] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => { mcMailboxes().then((b) => setUnread(b.unreadTotal)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [c, tp, s, au] = await Promise.all([mcCampaigns(), mcTemplates(), mcSegments(), mcAudiences()]);
      setCampaigns(c);
      setAudiences(au);
      setTemplates(tp);
      setSegments(s.segments);
      setVariables(s.variables);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Deep links (inventory SH09): ?section=mail-center&mc=<view>&mcEdit=<id|new>&mcReport=<id>.
  // Navigation inside the Mail Center pushes history so browser Back returns to
  // the previous view; refresh and shared links restore it once data has loaded.
  // Captured at first render: React's dev double-mount runs the leave-cleanup below
  // before data loads, which would otherwise wipe the link being opened.
  const [initialQuery] = useState(() => (typeof window === "undefined" ? "" : window.location.search));
  const toDraft = (c: McCampaign): Draft => ({
    id: c.id, name: c.name, subject: c.subject, preheader: c.preheader ?? "", html: c.html, text: c.text ?? "",
    segments: c.segments.split(",").filter(Boolean), dailyLimit: c.dailyLimit ? String(c.dailyLimit) : "",
    identityId: c.identityId ?? null, tracking: c.tracking !== false,
  });
  const applyUrl = useCallback((list: McCampaign[], search: string) => {
    const q = new URLSearchParams(search);
    const v = q.get("mc");
    setView(v && (VIEWS as readonly string[]).includes(v) ? (v as View) : "campaigns");
    const edit = q.get("mcEdit");
    if (edit === "new") setEditing({ ...EMPTY });
    else if (edit) { const c = list.find((x) => String(x.id) === edit); setEditing(c ? toDraft(c) : null); }
    else setEditing(null);
    const rep = Number(q.get("mcReport"));
    setOpenReport(Number.isInteger(rep) && rep > 0 ? rep : null);
    const lst = Number(q.get("mcList"));
    setOpenList(Number.isInteger(lst) && lst > 0 ? lst : null);
  }, []);
  const urlApplied = useRef(false);
  useEffect(() => {
    if (loading || urlApplied.current) return;
    urlApplied.current = true;
    applyUrl(campaigns, initialQuery);
  }, [loading, campaigns, applyUrl, initialQuery]);
  useEffect(() => {
    const onPop = () => applyUrl(campaigns, window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [campaigns, applyUrl]);
  useEffect(() => {
    if (!urlApplied.current) return;
    // After Back or a restore, state already matches the URL, so nothing is pushed.
    const url = new URL(window.location.href);
    const set = (k: string, val: string | null) => (val == null ? url.searchParams.delete(k) : url.searchParams.set(k, val));
    set("mc", view === "campaigns" ? null : view);
    set("mcEdit", view === "campaigns" && editing ? (editing.id == null ? "new" : String(editing.id)) : null);
    set("mcReport", view === "campaigns" && !editing && openReport != null ? String(openReport) : null);
    set("mcList", view === "audiences" && openList != null ? String(openList) : null);
    if (url.toString() !== window.location.href) window.history.pushState(window.history.state, "", url);
  }, [view, editing, openReport, openList]);
  // Leaving the Mail Center: don't leave its parameters on other sections' URLs.
  useEffect(() => () => {
    const url = new URL(window.location.href);
    ["mc", "mcEdit", "mcReport", "mcList"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, "", url);
  }, []);

  if (loadError) return <SaLoadError what="the Mail Center" onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); setEditing(null); setOpenList(null); }}
            className={`min-h-9 rounded-full border px-4 text-xs font-bold capitalize ${view === v ? t.chipActive : t.chipInactive}`}>
            {v === "suppression" ? "Blocked addresses" : v === "audiences" ? "Saved lists" : v === "mailids" ? "Mail IDs" : v === "system" ? "System emails" : v}{v === "inbox" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
        {view === "campaigns" && !editing && (
          <button type="button" onClick={() => setEditing({ ...EMPTY })}
            className={`ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>
            <Plus className="h-4 w-4" aria-hidden /> New campaign
          </button>
        )}
      </div>

      <p className={`text-xs ${t.muted}`}>
        Emails go only to newsletter subscribers, donors and NGO partners — never to people asking for help.
        Unsubscribed and bouncing addresses are skipped automatically, and every email has an unsubscribe link.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className={`h-6 w-6 animate-spin ${t.muted}`} /></div>
      ) : view === "overview" ? (
        <OverviewV2 isDark={isDark} onGo={(v) => { if ((VIEWS as readonly string[]).includes(v)) { setView(v as View); setEditing(null); } }} />
      ) : view === "audiences" ? (
        <AudiencesView isDark={isDark} audiences={audiences} segments={segments} onChanged={load}
          openId={openList} onOpen={setOpenList}
          onSendCampaign={(id) => { setOpenList(null); setView("campaigns"); setEditing({ ...EMPTY, segments: [audienceKey(id)] }); }} />
      ) : view === "inbox" ? (
        <InboxView isDark={isDark} onUnreadChange={setUnread} />
      ) : view === "reports" ? (
        <ReportsView isDark={isDark} onOpenCampaign={(id) => { setView("campaigns"); setEditing(null); setOpenReport(id); }} />
      ) : view === "activity" ? (
        <ActivityView isDark={isDark} />
      ) : view === "system" ? (
        <SystemView isDark={isDark} />
      ) : view === "automations" ? (
        <AutomationsView isDark={isDark} segments={segments} audiences={audiences} />
      ) : view === "marketing" ? (
        <MarketingView isDark={isDark} />
      ) : view === "mailids" ? (
        <MailIdsView isDark={isDark} />
      ) : view === "suppression" ? (
        <SuppressionView isDark={isDark} />
      ) : view === "templates" ? (
        <TemplatesView isDark={isDark} templates={templates} variables={variables} onChanged={load} />
      ) : editing ? (
        <CampaignEditor isDark={isDark} draft={editing} segments={segments} variables={variables} templates={templates}
          audiences={audiences}
          onClose={() => { setEditing(null); load(); }} />
      ) : (
        <CampaignList isDark={isDark} campaigns={campaigns} openReport={openReport} setOpenReport={setOpenReport}
          onEdit={(c) => setEditing(toDraft(c))}
          onChanged={load} />
      )}
    </div>
  );
}

/** Kept for existing importers; the parser now lives with the Saved lists view. */
export { parseCsv } from "./mail/AudiencesView";
