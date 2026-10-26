"use client";

import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import s from "./fundraising.module.css";

/**
 * Plain-language help for each fundraising form field (owner request 2026-10-19).
 * Wide screens with a mouse: opens on hover. Touch: opens on tap. Keyboard: Enter/Space.
 */
export const FIELD_HELP: Record<string, { title: string; text: string }> = {
  // Application â About you
  nm: { title: "Legal name", text: "Your full name exactly as it is on your Aadhaar, PAN or passport. We match it with the ID you upload." },
  age: { title: "Age", text: "Your age in years. It comes from your profile â update the profile if it's wrong." },
  ad: { title: "Current address", text: "Where you live now. If it's different from your ID, we may ask for a recent bill or rent agreement." },
  em: { title: "Email", text: "We send review updates here. It's never shown to donors." },
  ph: { title: "Phone", text: "A number we can call about this application. It's never shown publicly." },
  // Application â Who needs help
  forWhom: { title: "Who the fundraiser is for", text: "Choose âMeâ if the money is for you. Choose âSomeone elseâ if you're raising it for a family member or someone you help." },
  bn: { title: "Their full legal name", text: "The person's name exactly as on their ID. Only CauseKind reviewers see it â never donors." },
  pn: { title: "Name shown to donors", text: "What donors will see, e.g. âRameshâ or âRamesh K.â. A first name is fine if they want privacy." },
  ag: { title: "Their age", text: "Pick the age group they fall in. Fundraisers for children may need extra checks." },
  rl: { title: "Your relationship", text: "How you know them â parent, spouse, guardian and so on." },
  au: { title: "Why you", text: "In a few lines, why you're the right person to raise money for them. For example: âI'm her son and I'm handling the hospital bills.â" },
  // Application â Need & gap
  cat: { title: "Category", text: "What the money is mainly for. Pick the closest one â it decides which documents we ask for." },
  wh: { title: "What happened", text: "Explain simply what happened and what the money will pay for. Reviewers read this; you'll write the public story later." },
  ur: { title: "Needed by", text: "The date you need the money by â the surgery date, fee deadline or bill due date. Be as exact as you can." },
  costs: { title: "Cost breakdown", text: "Optional, but it helps reviewers. List each expense with its amount, e.g. âSurgery â¹80,000â, âMedicines â¹12,000â. Add the bill or quote number if you have it." },
  help: { title: "Other help", text: "Money you already have or expect from elsewhere. We subtract it from your costs to work out what's still needed. Enter 0 if none." },
  insuranceAmount: { title: "Insurance", text: "How much your insurance will pay towards these costs. 0 if none." },
  ownContribution: { title: "Own or family contribution", text: "What you or your family can pay yourselves. 0 if none." },
  grantsAmount: { title: "Grants or schemes", text: "Money from government schemes, scholarships or trusts. 0 if none." },
  otherFundraisingAmount: { title: "Other fundraising", text: "Money raised elsewhere â another website, your workplace, community collections. 0 if none." },
  ask: { title: "Amount to raise", text: "How much you want to raise here. If you listed costs, it should match the gap shown above â otherwise tell us why." },
  // Application â Evidence
  ev_ORGANISER_ID: { title: "Your identity", text: "A clear photo or PDF of your Aadhaar, PAN, passport or voter ID. Never shown publicly." },
  ev_ADDRESS_PROOF: { title: "Address proof", text: "A recent electricity bill, rent agreement or bank statement with your current address. Never shown publicly." },
  ev_MEDICAL_REPORT: { title: "Medical report", text: "The doctor's report or note about this condition. Just this condition â not your whole medical history." },
  ev_TREATMENT_ESTIMATE: { title: "Treatment estimate", text: "The hospital's written estimate or quote showing the costs you listed." },
  ev_ENROLMENT_PROOF: { title: "Enrolment proof", text: "Your admission letter or ID card showing the institution and course." },
  ev_FEE_STATEMENT: { title: "Fee statement", text: "The fee receipt or demand from the institution showing the amount and period." },
  ev_EVENT_EVIDENCE: { title: "What happened", text: "Photos, an FIR, a news report or official letter showing the event â e.g. flood or fire damage." },
  ev_CONSENT: { title: "Consent", text: "A signed note from the person you're raising for, saying they agree to this fundraiser." },
  ev_OTHER: { title: "Anything else", text: "Optional. Anything that helps explain the need. It won't speed up the review." },
  // Campaign page
  t: { title: "Campaign title", text: "A short, plain headline donors see first. Say who and what, e.g. âHelp Ramesh walk again after hip surgeryâ." },
  cCat: { title: "Category", text: "Fixed from your approved application. It can't be changed here." },
  dn: { title: "Name shown to donors", text: "The beneficiary's name on the public page. Use a first name if they want privacy." },
  cv: { title: "Cover photo", text: "The main picture on your page. Use a clear photo you have permission to share. Avoid showing IDs, bills or other people's faces without consent." },
  alt: { title: "Photo description", text: "Optional. One sentence describing the photo for people using screen readers, e.g. âRamesh smiling in a hospital bedâ." },
  st: { title: "Your story", text: "Tell donors who needs help, what happened, what the money covers and what difference it makes. Keep it honest â no phone numbers or addresses." },
  ccb: { title: "Cost breakdown", text: "What donors see about where the money goes. Changes from your approved application need a reason." },
  why: { title: "Reason for the change", text: "Why the amount or costs differ from what was approved, e.g. âThe hospital revised its quoteâ." },
  tg: { title: "Target", text: "The total you want to raise on this page. It should match your approved amount unless you give a reason." },
  ed: { title: "End date", text: "The last day people can donate. Donations stop automatically after this date." },
  vis: { title: "Names and place", text: "Choose how much donors see: full name, first name only, or hidden â and whether to show your city or state." },
  pe: { title: "Documents donors can see", text: "Optional. Pick documents that build trust, like a hospital estimate. Your ID and address proof can never be shown." },
  // Admin â application decision dialog
  dScope: { title: "Scope of approval", text: "âThis needâ lets them run one fundraiser for this application only. âAccount eligibilityâ lets them start more fundraisers later â each one still needs publication review." },
  dConditions: { title: "Conditions", text: "Optional rules the applicant must follow, e.g. âUpload the final hospital bill before closingâ. They see this." },
  dReason: { title: "Reason", text: "One or two plain sentences on why you approved. The applicant sees this â no internal details." },
  dNote: { title: "Internal note", text: "For other admins only â what you checked, doubts, anything to watch. The applicant never sees it." },
  dQuestions: { title: "Questions", text: "Ask specific things the applicant can answer or upload, e.g. âPlease upload the hospital estimate with the stamp.â Pick the section each question is about." },
  dDeclineReason: { title: "Reason the applicant sees", text: "Explain kindly and clearly why it wasn't approved, and what (if anything) they can do. Avoid accusations." },
  dDeclineNote: { title: "Internal note", text: "Required. The real reason for other admins and the audit record. The applicant never sees it." },
  // Admin â publication decision
  pChanges: { title: "What to change", text: "List exactly what the organiser must fix before you can publish, e.g. âRemove the hospital file number from the story.â They see this." },
  pDecline: { title: "Reason", text: "Why this page can't be published. The organiser sees it â be clear and kind." },
  pMessage: { title: "Message to the organiser", text: "Optional. A short note they see with the approval, e.g. âLooks good â thank you.â" },
  pNote: { title: "Internal note", text: "For other admins only â what you checked against the application. Required when approving or declining." },
  cnReason: { title: "Why end donations now", text: "For other admins and the audit log, e.g. “Target reached and hospital paid” or “Testing”. The organiser isn't shown this." },
  // Admin â updates, page changes, closure
  rMessage: { title: "Message to organiser", text: "What the organiser sees with your decision. Required when you request changes or decline â say exactly what to fix or why." },
  // Admin â report case
  kNotice: { title: "Public explanation", text: "Shown on the public page while donations are paused. Keep it neutral â never say âfraudâ or blame anyone." },
  kActions: { title: "What the organiser must do", text: "Private to the organiser. Say exactly what they need to send or fix to get donations reopened." },
  kQuestion: { title: "Question", text: "One specific thing the organiser can answer or prove. Never reveal who reported or what they said word for word." },
  kDeadline: { title: "Response deadline", text: "Optional date shown to the organiser. Nothing happens automatically when it passes â you decide what to do." },
  kReason: { title: "Internal reason", text: "Why you're taking this action, for other admins and the audit log. Not shown to the organiser or reporter." },
  kMessage: { title: "Message to organiser", text: "Optional. What the organiser sees in their notification, e.g. âDonations are open again.â" },
};

/**
 * `localize`: read the title and text from the `fieldHelp.<k>` catalogue (organiser
 * screens). Admin screens leave it off and keep the English map; admin-only keys
 * are not in the catalogue.
 */
export function FieldInfo({ k, localize = false }: { k: keyof typeof FIELD_HELP | string; localize?: boolean }) {
  const english = FIELD_HELP[k];
  // No provider (some tests): fall back to the English map. Fixed per tree, so hook order is stable.
  let t: ReturnType<typeof useTranslations> | null = null;
  let tf: ReturnType<typeof useTranslations> | null = null;
  try { t = useTranslations("fieldHelp"); tf = useTranslations("fundraiserFlow"); } catch { /* English */ }
  const help = english && localize && t && typeof t.has === "function" && t.has(`${k}.title`)
    ? { title: t(`${k}.title`), text: t(`${k}.text`) }
    : english;
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!help) return null;
  const enter = () => { if (!hover) return; if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const leave = () => { if (!hover) return; timer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={s.info} aria-label={localize && tf ? tf("aboutField", { field: help.title }) : `About ${help.title}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
          onMouseEnter={enter} onMouseLeave={leave}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.6" r=".6" fill="currentColor" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className={s.infoPop} onMouseEnter={enter} onMouseLeave={leave}
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <strong style={{ display: "block", marginBottom: 4 }}>{help.title}</strong>
        {help.text}
      </PopoverContent>
    </Popover>
  );
}
