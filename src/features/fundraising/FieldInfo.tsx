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
  // Application — About you
  nm: { title: "Legal name", text: "Your full name exactly as it is on your Aadhaar, PAN or passport. We match it with the ID you upload." },
  age: { title: "Age", text: "Your age in years. It comes from your profile — update the profile if it's wrong." },
  ad: { title: "Current address", text: "Where you live now. If it's different from your ID, we may ask for a recent bill or rent agreement." },
  em: { title: "Email", text: "We send review updates here. It's never shown to donors." },
  ph: { title: "Phone", text: "A number we can call about this application. It's never shown publicly." },
  // Application — Who needs help
  forWhom: { title: "Who the fundraiser is for", text: "Choose “Me” if the money is for you. Choose “Someone else” if you're raising it for a family member or someone you help." },
  bn: { title: "Their full legal name", text: "The person's name exactly as on their ID. Only CauseKind reviewers see it — never donors." },
  pn: { title: "Name shown to donors", text: "What donors will see, e.g. “Ramesh” or “Ramesh K.”. A first name is fine if they want privacy." },
  ag: { title: "Their age", text: "Pick the age group they fall in. Fundraisers for children may need extra checks." },
  rl: { title: "Your relationship", text: "How you know them — family, guardian, employee, friend and so on." },
  au: { title: "Why you", text: "In a few lines, why you're the right person to raise money for them. For example: “I'm her son and I'm handling the hospital bills.”" },
  // Application — Need & gap
  cat: { title: "What is the money for?", text: "Pick the one closest to your need. It tells us which papers to ask you for." },
  wh: { title: "What happened", text: "Tell us what happened and what the money will pay for, in your own words. Only our team reads this." },
  ur: { title: "Date", text: "The day you need the money by. For example, the day of the operation or the last day to pay fees." },
  costs: { title: "What the money pays for", text: "You can skip this, but it helps. Write each thing, how much it costs, and the number on its bill. Example: “Operation ₹80,000 · Bill 4512”." },
  ref: { title: "Bill or receipt number", text: "The number printed on the bill, receipt or price paper for this thing. It helps us check your papers." },
  help: { title: "Money you already have", text: "Money you have now, or will get from somewhere else. Our team looks at it, but it is not taken away from the total. Write 0 if none." },
  insuranceAmount: { title: "From insurance", text: "How much your insurance will pay. Write 0 if none." },
  ownContribution: { title: "From you or your family", text: "How much you or your family can pay. Write 0 if none." },
  grantsAmount: { title: "From schemes or grants", text: "Money from a government scheme, scholarship or trust. Write 0 if none." },
  otherFundraisingAmount: { title: "From other fundraising", text: "Money collected somewhere else, like another website, your workplace or your community. Write 0 if none." },
  ask: { title: "How much money", text: "The total money you need. If you list costs below, it should be the same as “Still needed” — if not, tell us why." },
  // Application — Evidence
  ev_ORGANISER_ID: { title: "Your identity", text: "A clear photo or PDF of your Aadhaar, PAN, passport or voter ID. Never shown publicly." },
  ev_ADDRESS_PROOF: { title: "Address proof", text: "A recent electricity bill, rent agreement or bank statement with your current address. Never shown publicly." },
  ev_MEDICAL_REPORT: { title: "Medical report", text: "The doctor's report or note about this condition. Just this condition — not your whole medical history." },
  ev_TREATMENT_ESTIMATE: { title: "Treatment estimate", text: "The hospital's written estimate or quote showing the costs you listed." },
  ev_ENROLMENT_PROOF: { title: "Enrolment proof", text: "Your admission letter or ID card showing the institution and course." },
  ev_FEE_STATEMENT: { title: "Fee statement", text: "The fee receipt or demand from the institution showing the amount and period." },
  ev_EVENT_EVIDENCE: { title: "What happened", text: "An official record of the event: an FIR or police report (theft, accident), a fire brigade report or panchnama (fire), a tehsildar or disaster relief certificate (flood), or a death certificate (loss of an earning member)." },
  ev_RELATIONSHIP_PROOF: { title: "Proof of relationship", text: "Shows how you are related to the person you're raising for: a ration card, birth certificate, or IDs with the same family name or address." },
  ev_COST_PROOF: { title: "Cost proof", text: "A quotation, estimate or bill for what the money will pay for, so reviewers can check the amount." },
  ev_connection: { title: "Proof you know them", text: "For someone who isn't family: salary or payment records to them, a letter from a local authority, or photos together with a short note on how you know them." },
  ev_supporting: { title: "Supporting document", text: "One more document that shows the need is real, such as an official letter or a report of what happened. It must be a separate upload from your cost proof." },
  ev_CONSENT: { title: "Consent", text: "A signed note from the person you're raising for, saying they agree to this fundraiser." },
  ev_OTHER: { title: "Anything else", text: "Optional. Anything that helps explain the need. It won't speed up the review." },
  // Campaign page
  t: { title: "Campaign title", text: "A short, plain headline donors see first. Say who and what, e.g. “Help Ramesh walk again after hip surgery”." },
  cCat: { title: "Category", text: "Fixed from your approved application. It can't be changed here." },
  dn: { title: "Name shown to donors", text: "The beneficiary's name on the public page. Use a first name if they want privacy." },
  cv: { title: "Cover photo", text: "The main picture on your page. Use a clear photo you have permission to share. Avoid showing IDs, bills or other people's faces without consent." },
  alt: { title: "Photo description", text: "Optional. One sentence describing the photo for people using screen readers, e.g. “Ramesh smiling in a hospital bed”." },
  st: { title: "Your story", text: "Tell donors who needs help, what happened, what the money covers and what difference it makes. Keep it honest — no phone numbers or addresses." },
  ccb: { title: "Cost breakdown", text: "What donors see about where the money goes. Changes from your approved application need a reason." },
  why: { title: "Reason for the change", text: "Why the amount or costs differ from what was approved, e.g. “The hospital revised its quote”." },
  tg: { title: "Target", text: "The total you want to raise on this page. It should match your approved amount unless you give a reason." },
  ed: { title: "End date", text: "The last day people can donate. Donations stop automatically after this date." },
  vis: { title: "Names and place", text: "Choose how much donors see: full name, first name only, or hidden — and whether to show your city or state." },
  pe: { title: "Documents donors can see", text: "Optional. Pick documents that build trust, like a hospital estimate. Your ID and address proof can never be shown." },
  // Admin — application decision dialog
  dScope: { title: "Scope of approval", text: "“This need” lets them run one fundraiser for this application only. “Account eligibility” lets them start more fundraisers later — each one still needs publication review." },
  dConditions: { title: "Conditions", text: "Optional rules the applicant must follow, e.g. “Upload the final hospital bill before closing”. They see this." },
  dReason: { title: "Reason", text: "One or two plain sentences on why you approved. The applicant sees this — no internal details." },
  dNote: { title: "Internal note", text: "For other admins only — what you checked, doubts, anything to watch. The applicant never sees it." },
  dQuestions: { title: "Questions", text: "Ask specific things the applicant can answer or upload, e.g. “Please upload the hospital estimate with the stamp.” Pick the section each question is about." },
  dDeclineReason: { title: "Reason the applicant sees", text: "Explain kindly and clearly why it wasn't approved, and what (if anything) they can do. Avoid accusations." },
  dDeclineNote: { title: "Internal note", text: "Required. The real reason for other admins and the audit record. The applicant never sees it." },
  // Admin — publication decision
  pChanges: { title: "What to change", text: "List exactly what the organiser must fix before you can publish, e.g. “Remove the hospital file number from the story.” They see this." },
  pDecline: { title: "Reason", text: "Why this page can't be published. The organiser sees it — be clear and kind." },
  pMessage: { title: "Message to the organiser", text: "Optional. A short note they see with the approval, e.g. “Looks good — thank you.”" },
  pNote: { title: "Internal note", text: "For other admins only — what you checked against the application. Required when approving or declining." },
  cnReason: { title: "Why end donations now", text: "For other admins and the audit log, e.g. “Target reached and hospital paid” or “Testing”. The organiser isn't shown this." },
  // Admin — updates, page changes, closure
  rMessage: { title: "Message to organiser", text: "What the organiser sees with your decision. Required when you request changes or decline — say exactly what to fix or why." },
  // Admin — report case
  kNotice: { title: "Public explanation", text: "Shown on the public page while donations are paused. Keep it neutral — never say “fraud” or blame anyone." },
  kActions: { title: "What the organiser must do", text: "Private to the organiser. Say exactly what they need to send or fix to get donations reopened." },
  kQuestion: { title: "Question", text: "One specific thing the organiser can answer or prove. Never reveal who reported or what they said word for word." },
  kDeadline: { title: "Response deadline", text: "Optional date shown to the organiser. Nothing happens automatically when it passes — you decide what to do." },
  kReason: { title: "Internal reason", text: "Why you're taking this action, for other admins and the audit log. Not shown to the organiser or reporter." },
  kMessage: { title: "Message to organiser", text: "Optional. What the organiser sees in their notification, e.g. “Donations are open again.”" },
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
