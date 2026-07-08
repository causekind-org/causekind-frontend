"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { buildSupportGmailUrl, DEFAULT_SUPPORT_GMAIL_URL } from "@/lib/utils";
import {
  ArrowLeft,
  ScrollText,
  FileText,
  BookOpen,
  UserCheck,
  KeyRound,
  LayoutGrid,
  BadgeCheck,
  IndianRupee,
  RefreshCw,
  Package,
  ReceiptText,
  PenLine,
  Ban,
  Copyright,
  ExternalLink,
  AlertTriangle,
  ShieldOff,
  Handshake,
  Lock,
  Power,
  Settings2,
  Zap,
  Gavel,
  Scale,
  ListChecks,
  Mail,
  ChevronRight,
} from "lucide-react";

const LAST_UPDATED = "24 June 2026";

const SUPPORT_EMAIL = "support@causekind.com";
const GRIEVANCE_NAME = "Atharva Raorane";
const GRIEVANCE_EMAIL = "Atharvaraorane147@gmail.com";
const COMPANY_ADDRESS =
  "3rd Floor, Apoorva Bldg, Flat no. 19, Vartak School Road, Veer Savarkar Nagar, Anand Nagar, Vasai West, Vasai-Virar, Maharashtra 401202";

// ── Section registry (drives both the TOC and scroll-spy) ──────────────────────
const SECTIONS = [
  { id: "introduction", num: "01", title: "Introduction & Acceptance", icon: FileText },
  { id: "definitions", num: "02", title: "Definitions", icon: BookOpen },
  { id: "eligibility", num: "03", title: "Eligibility", icon: UserCheck },
  { id: "account", num: "04", title: "Account & Security", icon: KeyRound },
  { id: "services", num: "05", title: "Our Services", icon: LayoutGrid },
  { id: "campaigns", num: "06", title: "Campaigns & Verification", icon: BadgeCheck },
  { id: "payments", num: "07", title: "Donations & Payments", icon: IndianRupee },
  { id: "refunds", num: "08", title: "Refunds & Cancellations", icon: RefreshCw },
  { id: "items", num: "09", title: "Item Listings & Matches", icon: Package },
  { id: "tax", num: "10", title: "Tax Certificates (80G)", icon: ReceiptText },
  { id: "user-content", num: "11", title: "User Content & License", icon: PenLine },
  { id: "prohibited", num: "12", title: "Prohibited Conduct", icon: Ban },
  { id: "ip", num: "13", title: "Intellectual Property", icon: Copyright },
  { id: "third-party", num: "14", title: "Third-Party Links", icon: ExternalLink },
  { id: "disclaimer", num: "15", title: "Disclaimer of Warranties", icon: AlertTriangle },
  { id: "liability", num: "16", title: "Limitation of Liability", icon: ShieldOff },
  { id: "indemnity", num: "17", title: "Indemnity", icon: Handshake },
  { id: "privacy", num: "18", title: "Privacy", icon: Lock },
  { id: "termination", num: "19", title: "Suspension & Termination", icon: Power },
  { id: "modifications", num: "20", title: "Modifications", icon: Settings2 },
  { id: "force-majeure", num: "21", title: "Force Majeure", icon: Zap },
  { id: "governing-law", num: "22", title: "Governing Law & Disputes", icon: Gavel },
  { id: "grievance", num: "23", title: "Grievance Officer", icon: Scale },
  { id: "general", num: "24", title: "General", icon: ListChecks },
  { id: "contact", num: "25", title: "Contact Us", icon: Mail },
] as const;

// ── Tiny prose helpers (consistent typography across sections) ─────────────────
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{children}</p>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-stone-900 dark:text-stone-100">{children}</span>;
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#b04a15] dark:text-orange-400" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-extrabold uppercase tracking-wider text-[#b04a15] dark:text-orange-400">
      {children}
    </h3>
  );
}

// ── Section shell: numbered badge + animated reveal ────────────────────────────
function Section({
  id,
  num,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  num: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="scroll-mt-28">
      <section id={id} className="scroll-mt-28">
        <div className="mb-5 flex items-center gap-4 border-l-4 border-[#b04a15] pl-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] text-white shadow-lg shadow-[#b04a15]/25">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Section {num}
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-stone-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#b04a15]/5 rounded-full blur-xl pointer-events-none" />
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function TermsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);
  const [mailHref, setMailHref] = useState(DEFAULT_SUPPORT_GMAIL_URL);

  useEffect(() => {
    // Client-only, post-mount — see the DEFAULT_SUPPORT_GMAIL_URL doc comment
    // in lib/utils.ts for why this can't be computed directly during render.
    setMailHref(buildSupportGmailUrl());
  }, []);

  // Scroll-spy (active section) + reading progress, in one deterministic handler.
  useEffect(() => {
    function onScroll() {
      const line = 140;
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);

      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950">
      {/* Scoped keyframes — kept local so we don't touch global styles */}
      <style>{`
        @keyframes pp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pp-blob  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(28px,-22px) scale(1.12)} 66%{transform:translate(-20px,14px) scale(0.94)} }
        @keyframes pp-shimmer { to { background-position: -200% center } }
        @keyframes pp-ring { 0%{transform:scale(.85);opacity:.55} 100%{transform:scale(1.6);opacity:0} }
        .pp-shimmer-text {
          background-image: linear-gradient(110deg,#f0b97a 20%,#ffffff 40%,#ffffff 50%,#e07b3a 70%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: pp-shimmer 4.5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-float,.pp-blob,.pp-shimmer-text,.pp-ring { animation: none !important; }
        }
      `}</style>

      {/* ── Animated hero ───────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-[#120c04] border-b border-stone-800">
        <div className="pp-blob pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-[#b04a15]/20 blur-3xl" style={{ animation: "pp-blob 14s ease-in-out infinite" }} />
        <div className="pp-blob pointer-events-none absolute -bottom-20 right-1/5 h-[340px] w-[340px] rounded-full bg-[#1e3a60]/25 blur-3xl" style={{ animation: "pp-blob 18s ease-in-out infinite reverse" }} />
        <div className="pp-blob pointer-events-none absolute top-1/3 right-1/3 h-[260px] w-[260px] rounded-full bg-[#f0b97a]/10 blur-3xl" style={{ animation: "pp-blob 22s ease-in-out infinite" }} />

        <div className="relative mx-auto max-w-3xl px-6 pt-14 pb-16 text-center">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <div className="relative mx-auto mb-7 h-20 w-20">
            <span className="pp-ring absolute inset-0 rounded-3xl bg-[#b04a15]/40" style={{ animation: "pp-ring 2.6s ease-out infinite" }} />
            <div
              className="pp-float relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] shadow-2xl shadow-[#b04a15]/40"
              style={{ animation: "pp-float 4s ease-in-out infinite" }}
            >
              <ScrollText className="h-10 w-10 text-white" />
            </div>
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#e07b3a]">
            The rules of the road
          </p>
          <h1 className="pp-shimmer-text text-4xl font-extrabold tracking-tight sm:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-stone-400">
            The agreement between you and CauseKind when you give, raise, list, or request on our platform.
          </p>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/60 px-4 py-2 text-xs font-semibold text-stone-300 backdrop-blur-sm">
            <RefreshCw className="h-3.5 w-3.5 text-[#e07b3a]" />
            Last updated {LAST_UPDATED}
            <span className="mx-1 h-3 w-px bg-stone-700" />
            Version 1.0
          </div>
        </div>
      </header>

      {/* ── Body: sticky TOC + content ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* TOC (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                On this page
              </p>
              <div className="relative">
                <span className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-stone-200 dark:bg-zinc-800" />
                <span
                  className="absolute left-0 top-0 w-0.5 rounded-full bg-gradient-to-b from-[#b04a15] to-[#e07b3a] transition-[height] duration-150"
                  style={{ height: `${progress}%` }}
                />
                <nav className="flex flex-col gap-0.5 pl-4">
                  {SECTIONS.map((s) => {
                    const on = active === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => jumpTo(s.id)}
                        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                          on
                            ? "bg-[#b04a15]/10 text-[#b04a15] dark:bg-orange-400/10 dark:text-orange-400"
                            : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 ${
                            on ? "scale-125 bg-[#f0b97a]" : "bg-stone-300 group-hover:bg-stone-400 dark:bg-zinc-700"
                          }`}
                        />
                        {s.title}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            {/* Mobile "jump to" */}
            <details className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
              <summary className="cursor-pointer text-sm font-bold text-stone-800 dark:text-stone-100">
                On this page
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => jumpTo(s.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold text-stone-600 dark:text-stone-300"
                  >
                    <span className="text-[11px] font-black text-stone-400">{s.num}</span>
                    {s.title}
                  </button>
                ))}
              </div>
            </details>

            {/* Legal-record note */}
            <Reveal className="mb-8">
              <div className="rounded-2xl border border-[#b04a15]/15 bg-gradient-to-br from-[#fff7f0] to-[#fdeede] p-5 text-[13px] font-medium leading-relaxed text-stone-600 dark:border-orange-400/15 dark:from-zinc-900 dark:to-zinc-900/60 dark:text-stone-300">
                This document is an electronic record under the Information Technology Act, 2000 and the rules made
                thereunder. It does not require any physical or digital signature.
              </div>
            </Reveal>

            <div className="space-y-14">
              {/* 01 */}
              <Section id="introduction" num="01" title="Introduction & Acceptance" icon={FileText}>
                <P>
                  Welcome to <Lead>www.causekind.com</Lead> ("CauseKind", "Platform", "We", "Us", "Our"). CauseKind is a
                  charitable-giving platform that connects donors with verified causes and people in need. These Terms
                  &amp; Conditions ("Terms") govern Your ("You", "Your", "User") access to and use of the Platform and
                  all content, features, and services offered on it.
                </P>
                <P>
                  By accessing, browsing, registering on, or using the Platform, You accept and agree to be bound by
                  these Terms and Our <Link href="/privacy" className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">Privacy Policy</Link>. If You do
                  not agree, please do not use the Platform. We may update these Terms at any time at Our sole
                  discretion; continued use after changes constitutes acceptance.
                </P>
              </Section>

              {/* 02 */}
              <Section id="definitions" num="02" title="Definitions" icon={BookOpen}>
                <Bullets
                  items={[
                    <><Lead>Campaign</Lead> — a fundraiser or in-kind drive created on the Platform to raise money or materials for a cause.</>,
                    <><Lead>Campaigner / Donee / Beneficiary</Lead> — a User who creates a Campaign, lists an item request, or receives support.</>,
                    <><Lead>Donor</Lead> — a User who contributes money or items to a Campaign, request, or listing.</>,
                    <><Lead>Item Listing</Lead> — goods a User offers to donate.</>,
                    <><Lead>Item Request</Lead> — goods a Beneficiary requests.</>,
                    <><Lead>Item Match</Lead> — a connection facilitated between a Listing and a Request.</>,
                    <><Lead>Materials</Lead> — goods, items, or in-kind donations.</>,
                    <><Lead>Content</Lead> — text, images, videos, and other material on the Platform.</>,
                  ]}
                />
              </Section>

              {/* 03 */}
              <Section id="eligibility" num="03" title="Eligibility" icon={UserCheck}>
                <P>
                  The Platform is available only to persons who can form a legally binding contract under the{" "}
                  <Lead>Indian Contract Act, 1872</Lead>. If You are under 18, You may use the Platform only under the
                  supervision of a parent or guardian. By using the Platform, You represent that the information You
                  provide is true, accurate, and complete.
                </P>
              </Section>

              {/* 04 */}
              <Section id="account" num="04" title="Account & Security" icon={KeyRound}>
                <Bullets
                  items={[
                    "You may need to register an account (via email/password or Google/Facebook sign-in) to access certain features.",
                    "You are responsible for maintaining the confidentiality of Your account credentials and for all activity under Your account.",
                    "You agree to notify Us immediately of any unauthorized use. We are not liable for any loss arising from Your failure to protect Your credentials.",
                    "We may suspend or terminate accounts that violate these Terms or are used for fraudulent or unlawful activity.",
                  ]}
                />
              </Section>

              {/* 05 */}
              <Section id="services" num="05" title="Our Services" icon={LayoutGrid}>
                <P>
                  CauseKind acts as an intermediary platform that enables: (i) Campaigners to create Campaigns to raise
                  monetary or in-kind support; (ii) Donors to contribute to Campaigns; (iii) Users to post Item Listings
                  and Item Requests and be connected through Item Matches; and (iv) administrative verification of
                  Campaigns. CauseKind is <Lead>not</Lead> a party to any transaction, donation, or arrangement between
                  Users and is <Lead>not</Lead> a trustee, charity, or fiduciary of any funds or materials.
                </P>
              </Section>

              {/* 06 */}
              <Section id="campaigns" num="06" title="Campaigns & Verification" icon={BadgeCheck}>
                <Bullets
                  items={[
                    "Campaigners are solely responsible for the accuracy, legality, and genuineness of their Campaigns, including descriptions, images, goals, and beneficiary details.",
                    <>CauseKind may review or verify Campaigns ("admin-verified"), but such review is <Lead>not exhaustive, error-free, or a guarantee</Lead>. Verification does not constitute an endorsement.</>,
                    "We reserve the right to approve, reject, suspend, edit, or remove any Campaign at Our sole discretion, including those that are misleading, unlawful, or violate these Terms.",
                    "Campaigners must use received funds and materials only for the stated purpose and may be required to provide updates or proof of utilization.",
                  ]}
                />
              </Section>

              {/* 07 */}
              <Section id="payments" num="07" title="Donations & Payments" icon={IndianRupee}>
                <Bullets
                  items={[
                    <>Donations are processed through third-party payment gateways (e.g., <Lead>Razorpay</Lead>). Your payments are subject to the gateway's own terms; We are not responsible for failures, delays, or errors by the gateway.</>,
                    <><Lead>CauseKind does not charge a platform fee on donations.</Lead> However, payment gateway charges, bank fees, currency-conversion fees, or applicable taxes may apply and are borne by You.</>,
                    "You confirm that funds used for donations are from lawful sources and comply with all applicable laws, including foreign-contribution and anti-money-laundering laws.",
                    "A donation, once successfully made, is treated as a contribution to the chosen cause and is processed accordingly.",
                  ]}
                />
              </Section>

              {/* 08 */}
              <Section id="refunds" num="08" title="Refunds & Cancellations" icon={RefreshCw}>
                <P>
                  Donations made on the Platform are <Lead>non-refundable</Lead>, as they are directed to causes and
                  beneficiaries. The only exception: if Your account is <Lead>debited more than once for the same
                  donation</Lead> due to a technical error, the duplicate amount will be refunded to the original payment
                  method after verification. Refund requests for duplicate transactions may be sent to{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </P>
              </Section>

              {/* 09 */}
              <Section id="items" num="09" title="Item Listings, Requests & Matches" icon={Package}>
                <Bullets
                  items={[
                    "Users posting Item Listings or Requests are responsible for the accuracy, legality, ownership, and condition of the items described.",
                    "CauseKind only facilitates a connection (Item Match) between donors and recipients; We do not inspect, handle, transport, warrant, or take custody of any items.",
                    "Any exchange, delivery, or arrangement of items is solely between the Users involved. CauseKind is not responsible for the quality, safety, delivery, or any dispute relating to such items.",
                  ]}
                />
              </Section>

              {/* 10 */}
              <Section id="tax" num="10" title="Tax Exemption Certificates (80G)" icon={ReceiptText}>
                <P>
                  Where a Campaign or beneficiary organization is eligible, tax-exemption certificates (e.g., under{" "}
                  <Lead>Section 80G</Lead> of the Income Tax Act, 1961) may be issued by the recipient organization, not
                  by CauseKind. We do not guarantee the availability, validity, or acceptance of any tax benefit. You are
                  responsible for verifying eligibility with the recipient and Your tax advisor.
                </P>
              </Section>

              {/* 11 */}
              <Section id="user-content" num="11" title="User Content & License" icon={PenLine}>
                <Bullets
                  items={[
                    "You retain ownership of content You submit (Campaign descriptions, images, etc.) but represent that it does not infringe any third party's rights and is not unlawful, defamatory, or misleading.",
                    "You grant CauseKind a worldwide, non-exclusive, royalty-free, sub-licensable license to use, display, reproduce, and distribute Your content for operating, promoting, and marketing the Platform and its Campaigns.",
                    "You are solely responsible for Your content. We may remove any content that violates these Terms or applicable law.",
                  ]}
                />
              </Section>

              {/* 12 */}
              <Section id="prohibited" num="12" title="Prohibited Conduct" icon={Ban}>
                <P>You shall not:</P>
                <Bullets
                  items={[
                    "Use the Platform for any unlawful purpose;",
                    "Post false, fraudulent, defamatory, obscene, or infringing content;",
                    "Impersonate any person or misrepresent Yourself;",
                    "Create fake Campaigns or misuse donations;",
                    "Upload viruses or malicious code;",
                    "Attempt unauthorized access to the Platform, its systems, or other accounts;",
                    "Scrape, overload, or disrupt the Platform; or",
                    "Violate any applicable law or third-party right.",
                  ]}
                />
              </Section>

              {/* 13 */}
              <Section id="ip" num="13" title="Intellectual Property" icon={Copyright}>
                <P>
                  The Platform, including its design, logos, trademarks, software, and content (excluding User Content),
                  is the exclusive property of CauseKind or its licensors and is protected by applicable
                  intellectual-property laws. You may not copy, reproduce, distribute, or create derivative works without
                  Our prior written consent.
                </P>
              </Section>

              {/* 14 */}
              <Section id="third-party" num="14" title="Third-Party Links & Services" icon={ExternalLink}>
                <P>
                  The Platform may contain links to or integrations with third-party websites and services (e.g., payment
                  gateways, sign-in providers). We do not control and are not responsible for their content, practices,
                  or policies. Your use of such third parties is at Your own risk and subject to their terms.
                </P>
              </Section>

              {/* 15 */}
              <Section id="disclaimer" num="15" title="Disclaimer of Warranties" icon={AlertTriangle}>
                <P>
                  The Platform and all services are provided on an <Lead>"as is"</Lead> and <Lead>"as available"</Lead>{" "}
                  basis, without warranties of any kind, express or implied, including merchantability, fitness for a
                  particular purpose, accuracy, or uninterrupted availability. CauseKind does not warrant that Campaigns
                  are genuine, that beneficiaries will use donations as represented, or that the Platform will be
                  error-free or always available.
                </P>
              </Section>

              {/* 16 */}
              <Section id="liability" num="16" title="Limitation of Liability" icon={ShieldOff}>
                <P>
                  To the maximum extent permitted by law, CauseKind shall not be liable for any indirect, incidental,
                  consequential, or special damages, or any loss of funds, data, profit, or goodwill, arising out of or
                  in connection with Your use of the Platform, any Campaign, donation, item exchange, or third-party act
                  or omission. Our total aggregate liability, if any, shall not exceed the platform fees actually
                  received by Us from You (which is currently nil).
                </P>
              </Section>

              {/* 17 */}
              <Section id="indemnity" num="17" title="Indemnity" icon={Handshake}>
                <P>
                  You agree to indemnify and hold harmless CauseKind, its officers, employees, and affiliates from any
                  claims, damages, losses, liabilities, and expenses (including legal fees) arising out of: (i) Your use
                  of the Platform; (ii) Your violation of these Terms or any law; (iii) Your content; or (iv) Your
                  infringement of any third-party right. This obligation survives termination.
                </P>
              </Section>

              {/* 18 */}
              <Section id="privacy" num="18" title="Privacy" icon={Lock}>
                <P>
                  Your use of the Platform is also governed by Our{" "}
                  <Link href="/privacy" className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">Privacy Policy</Link>,
                  which explains how We collect, use, and protect Your information. By using the Platform, You consent to
                  such processing.
                </P>
              </Section>

              {/* 19 */}
              <Section id="termination" num="19" title="Suspension & Termination" icon={Power}>
                <P>
                  We may suspend or terminate Your access to the Platform, with or without notice, if You breach these
                  Terms, engage in fraudulent or unlawful activity, or if required by law. Upon termination, the
                  provisions that by their nature should survive (e.g., intellectual property, indemnity, liability,
                  governing law) will continue to apply.
                </P>
              </Section>

              {/* 20 */}
              <Section id="modifications" num="20" title="Modifications" icon={Settings2}>
                <P>
                  We reserve the right to modify, suspend, or discontinue any part of the Platform or these Terms at any
                  time. Material changes to the Terms will be notified via email or a notice on the Platform. Continued
                  use after changes constitutes acceptance.
                </P>
              </Section>

              {/* 21 */}
              <Section id="force-majeure" num="21" title="Force Majeure" icon={Zap}>
                <P>
                  CauseKind shall not be liable for any failure or delay in performance due to events beyond Our
                  reasonable control, including natural disasters, pandemics, government action, network or power
                  failures, or third-party service disruptions.
                </P>
              </Section>

              {/* 22 */}
              <Section id="governing-law" num="22" title="Governing Law & Dispute Resolution" icon={Gavel}>
                <P>
                  These Terms are governed by the laws of the <Lead>Republic of India</Lead>. Any dispute shall first be
                  attempted to be resolved through good-faith negotiation. Failing that, the dispute shall be referred to{" "}
                  <Lead>arbitration</Lead> by a sole arbitrator under the <Lead>Arbitration and Conciliation Act,
                  1996</Lead>, seated at <Lead>Mumbai, Maharashtra</Lead>, conducted in English. Subject to arbitration,
                  the courts at <Lead>Mumbai, Maharashtra</Lead> shall have exclusive jurisdiction.
                </P>
              </Section>

              {/* 23 */}
              <Section id="grievance" num="23" title="Grievance Officer" icon={Scale}>
                <P>
                  In accordance with the Information Technology Act, 2000 and applicable rules, the details of our
                  Grievance Officer are:
                </P>
                <div className="rounded-2xl border border-[#b04a15]/15 bg-gradient-to-br from-[#fff7f0] to-[#fdeede] p-5 dark:border-orange-400/15 dark:from-zinc-900 dark:to-zinc-900/60">
                  <dl className="space-y-3 text-[15px]">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-28 shrink-0 font-bold text-stone-900 dark:text-stone-100">Name</dt>
                      <dd className="text-stone-600 dark:text-stone-300">{GRIEVANCE_NAME}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-28 shrink-0 font-bold text-stone-900 dark:text-stone-100">Email</dt>
                      <dd>
                        <a href={`mailto:${GRIEVANCE_EMAIL}`} className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">
                          {GRIEVANCE_EMAIL}
                        </a>
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-28 shrink-0 font-bold text-stone-900 dark:text-stone-100">Address</dt>
                      <dd className="text-stone-600 dark:text-stone-300">{COMPANY_ADDRESS}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-28 shrink-0 font-bold text-stone-900 dark:text-stone-100">Response Time</dt>
                      <dd className="text-stone-600 dark:text-stone-300">Within 30 days of receipt of grievance</dd>
                    </div>
                  </dl>
                </div>
              </Section>

              {/* 24 */}
              <Section id="general" num="24" title="General" icon={ListChecks}>
                <Bullets
                  items={[
                    <><Lead>Severability:</Lead> If any provision is held invalid, the rest remain in effect.</>,
                    <><Lead>No Waiver:</Lead> Our failure to enforce any right is not a waiver.</>,
                    <><Lead>Notices:</Lead> Notices to You may be sent to Your registered email; notices to Us to {SUPPORT_EMAIL}.</>,
                    <><Lead>Assignment:</Lead> You may not assign these Terms; We may assign them to an affiliate or successor.</>,
                    <><Lead>Entire Agreement:</Lead> These Terms and the Privacy Policy constitute the entire agreement between You and Us.</>,
                  ]}
                />
              </Section>

              {/* 25 */}
              <Section id="contact" num="25" title="Contact Us" icon={Mail}>
                <P>For any questions about these Terms, please contact Us:</P>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={mailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#b04a15] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#b04a15]/20 transition-colors hover:bg-[#963c0d]"
                  >
                    <Mail className="h-4 w-4" />
                    {SUPPORT_EMAIL}
                  </a>
                  <Link
                    href="/faq"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-colors hover:border-[#b04a15]/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300"
                  >
                    Visit FAQ
                  </Link>
                </div>
                <P>
                  <Lead>CauseKind</Lead> — {COMPANY_ADDRESS}
                </P>
              </Section>
            </div>

            {/* Footer note */}
            <Reveal className="mt-14">
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                <ScrollText className="mx-auto mb-3 h-8 w-8 text-[#b04a15] dark:text-orange-400" />
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  These Terms &amp; Conditions are effective as of {LAST_UPDATED}.
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                  © {new Date().getFullYear()} CauseKind. All rights reserved. · Version 1.0
                </p>
              </div>
            </Reveal>
          </main>
        </div>
      </div>
    </div>
  );
}
