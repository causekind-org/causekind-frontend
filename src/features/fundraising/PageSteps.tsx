"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fundraisingCampaigns, type FundraisingApplication, type FundraisingCampaign, type FundraisingCampaignSave } from "@/lib/api";
import { Basics, Privacy, Story, type SetFn } from "./CampaignWizard";
import { Icon, SaveIndicator, type SaveState } from "./ui";
import s from "./fundraising.module.css";
import { UiText } from "@/components/UiText";

/**
 * The public-page part of the single application form (owner, 2026-10-27): steps 5–7 of the
 * application wizard reuse the campaign wizard's Basics, Story and Privacy screens. The page draft
 * is created (or reopened) the first time these steps are reached and autosaves on its own.
 */
export function usePageDraft(app: FundraisingApplication, active: boolean) {
  const [page, setPage] = useState<FundraisingCampaign | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [save, setSave] = useState<SaveState>("saved");
  const pending = useRef<FundraisingCampaignSave>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoadError(false);
    fundraisingCampaigns.fromApplication(app.id).then(setPage).catch(() => setLoadError(true));
  }, [app.id]);
  useEffect(() => { if (active && !page) load(); }, [active, page, load]);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const body = pending.current;
    if (!page || Object.keys(body).length === 0) return true;
    pending.current = {};
    setSave("saving");
    try {
      const next = await fundraisingCampaigns.save(page.id, body);
      setPage((cur) => {
        const keep: Record<string, unknown> = {};
        for (const k of Object.keys(pending.current)) keep[k] = (cur as Record<string, unknown> | null)?.[k];
        return { ...next, ...keep } as FundraisingCampaign;
      });
      setSave("saved");
      return true;
    } catch {
      pending.current = { ...body, ...pending.current };
      setSave("error");
      return false;
    }
  }, [page]);

  const set: SetFn = useCallback((patch) => {
    setPage((cur) => (cur ? { ...cur, ...(patch as Partial<FundraisingCampaign>) } : cur));
    pending.current = { ...pending.current, ...patch };
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { page, setPage, set, flush, save, loadError, reload: load };
}

/** What the page still needs before the application can be submitted (mirrors the server's check). */
export function pageGaps(page: FundraisingCampaign | null, labels: { title: string; story: string; cover: string; consent: string }): string[] {
  if (!page) return [labels.title, labels.story, labels.cover];
  const gaps: string[] = [];
  if (!page.title?.trim()) gaps.push(labels.title);
  if (!page.story?.trim()) gaps.push(labels.story);
  if (!page.coverUrl) gaps.push(labels.cover);
  else if (!page.coverConsent) gaps.push(labels.consent);
  return gaps;
}

export function PageStep({ step, draft, nav, neededBy = null }: {
  step: 4 | 5 | 6;
  draft: ReturnType<typeof usePageDraft>;
  /** Step 3's "by which date" — shown read-only as the page's last day. */
  neededBy?: string | null;
  nav: ReactNode;
}) {
  const { page, setPage, set, flush, save, loadError, reload } = draft;
  if (loadError) {
    return (
      <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
        <Icon name="alert" /><p style={{ flex: "1 1 300px" }}><UiText>We couldn&apos;t open your fundraiser page. Check your connection and try again.</UiText></p>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={reload}><UiText>Try again</UiText></button>
      </div>
    );
  }
  if (!page) return <div aria-busy="true" style={{ minHeight: 320 }} />;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 860 }}><SaveIndicator state={save} /></div>
      {save === "error" && (
        <div role="alert" style={{ maxWidth: 860, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 10, background: "#fbeaea", color: "#6f1414", flexWrap: "wrap" }}>
          <Icon name="alert" /><p style={{ flex: "1 1 400px" }}><strong><UiText>Your last changes haven&apos;t been saved.</UiText></strong> <UiText>They&apos;re still on this screen — check your connection and try again.</UiText></p>
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void flush()}><UiText>Try again</UiText></button>
        </div>
      )}
      {step === 4 && <Basics c={page} set={set} setC={setPage} nav={nav} inApplication neededBy={neededBy} />}
      {step === 5 && <Story c={page} set={set} nav={nav} />}
      {step === 6 && <Privacy c={page} set={set} nav={nav} />}
    </>
  );
}
