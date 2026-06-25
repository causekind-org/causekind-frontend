"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Database,
  Cog,
  Share2,
  Clock,
  Cookie,
  MessageSquare,
  ExternalLink,
  Lock,
  Baby,
  UserCheck,
  Scale,
  AlertTriangle,
  RefreshCw,
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
  { id: "introduction", num: "01", title: "Introduction", icon: FileText },
  { id: "info-we-collect", num: "02", title: "Information We Collect", icon: Database },
  { id: "how-we-use", num: "03", title: "How We Use Your Information", icon: Cog },
  { id: "sharing", num: "04", title: "Sharing of Information", icon: Share2 },
  { id: "retention", num: "05", title: "Data Retention", icon: Clock },
  { id: "cookies", num: "06", title: "Cookies & Local Storage", icon: Cookie },
  { id: "communications", num: "07", title: "Communications & SMS", icon: MessageSquare },
  { id: "third-party", num: "08", title: "Third-Party Links", icon: ExternalLink },
  { id: "security", num: "09", title: "Security", icon: Lock },
  { id: "children", num: "10", title: "Children's Privacy", icon: Baby },
  { id: "your-rights", num: "11", title: "Your Rights", icon: UserCheck },
  { id: "grievance", num: "12", title: "Grievance Officer", icon: Scale },
  { id: "disclaimer", num: "13", title: "Campaign Accuracy Disclaimer", icon: AlertTriangle },
  { id: "changes", num: "14", title: "Changes to This Policy", icon: RefreshCw },
  { id: "contact", num: "15", title: "Contact Us", icon: Mail },
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

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);

  // Scroll-spy (active section) + reading progress, in one deterministic handler.
  useEffect(() => {
    function onScroll() {
      // Active = last section whose top has crossed the reading line below the header.
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
        {/* drifting glow blobs */}
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

          {/* floating shield with pulse ring */}
          <div className="relative mx-auto mb-7 h-20 w-20">
            <span className="pp-ring absolute inset-0 rounded-3xl bg-[#b04a15]/40" style={{ animation: "pp-ring 2.6s ease-out infinite" }} />
            <div
              className="pp-float relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] shadow-2xl shadow-[#b04a15]/40"
              style={{ animation: "pp-float 4s ease-in-out infinite" }}
            >
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#e07b3a]">
            Your trust, protected
          </p>
          <h1 className="pp-shimmer-text text-4xl font-extrabold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-stone-400">
            How CauseKind collects, uses, and protects your information when you give, raise, and connect.
          </p>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/60 px-4 py-2 text-xs font-semibold text-stone-300 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5 text-[#e07b3a]" />
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
                {/* progress rail */}
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

            <div className="space-y-14">
              {/* 01 ── Introduction */}
              <Section id="introduction" num="01" title="Introduction" icon={FileText}>
                <P>
                  Privacy is a fundamental right, and at <Lead>CauseKind</Lead> ("CauseKind", "We", "Us", "Our"), it is
                  treated as such. This Privacy Policy describes how We collect, use, store, and share information about
                  You ("You", "Your", "User") when You access or use our website{" "}
                  <Lead>www.causekind.com</Lead> and related services (collectively, the "Platform").
                </P>
                <P>
                  This Privacy Policy is published in accordance with the{" "}
                  <Lead>Information Technology Act, 2000</Lead> and the rules made thereunder, specifically the
                  Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
                  Information) Rules, 2011 and the Information Technology (Intermediary Guidelines) Rules, 2011.
                </P>
                <P>
                  By accessing or using the Platform, You agree to be bound by this Privacy Policy. If You do not agree,
                  please do not use the Platform. You hereby provide Your consent to CauseKind as provided under{" "}
                  <Lead>Section 43A and Section 72A of the Information Technology Act, 2000</Lead>.
                </P>
                <P>
                  This Privacy Policy should be read in conjunction with our <Lead>Terms of Use</Lead>. Any undefined
                  term herein shall have the same meaning as in the Terms of Use.
                </P>
              </Section>

              {/* 02 ── Information We Collect */}
              <Section id="info-we-collect" num="02" title="Information We Collect" icon={Database}>
                <SubHead>2.1 Personal Information</SubHead>
                <P>We collect information You provide directly when You:</P>
                <Bullets
                  items={[
                    "Create an account or register on the Platform",
                    "Create, donate to, or participate in a Campaign",
                    "Submit item listings or item requests",
                    "Make a donation or transaction",
                    "Contact Us for support",
                    "Subscribe to newsletters or communications",
                  ]}
                />
                <P>This includes, but is not limited to:</P>
                <Bullets
                  items={[
                    <>
                      <Lead>Contact Information:</Lead> Name, email address, phone number, address, profile photograph,
                      date of birth, gender.
                    </>,
                    <>
                      <Lead>Identity &amp; Account Information:</Lead> Username, password (encrypted), profile details,
                      and social media profile (if linked via Google or other OAuth providers).
                    </>,
                    <>
                      <Lead>Campaign &amp; Beneficiary Information:</Lead> For Campaign creators and Beneficiaries —
                      campaign title, description, photographs, videos, purpose and objectives of the Campaign,
                      financial need details, and associated location information. This information may be used to
                      market the Campaign publicly in order to raise funds or Materials for Beneficiaries.
                    </>,
                    <>
                      <Lead>Transaction Information:</Lead> Donation amounts, payment method preferences, billing
                      address, UPI/payment gateway reference information, transaction history, and donation receipts.
                    </>,
                    <>
                      <Lead>Technical Information:</Lead> IP address, browser type and version, device identifiers,
                      operating system, pages visited, time and date of visits, duration on pages, referring URLs, and
                      other usage statistics.
                    </>,
                    <>
                      <Lead>Communications:</Lead> Records of emails, messages, or correspondence You send Us or that
                      others send Us about Your activities on the Platform.
                    </>,
                  ]}
                />

                <SubHead>2.2 Information Collected Automatically</SubHead>
                <P>
                  When You use the Platform, We automatically collect certain technical information through cookies and
                  similar technologies. Please see Section 06 (Cookies &amp; Local Storage) for more details.
                </P>

                <SubHead>2.3 Third-Party Information</SubHead>
                <P>
                  We may receive information about You from third-party sign-in providers such as Google (when You use
                  Google Sign-In). If You connect a social media account, We may receive Your public profile information
                  and email address from that provider, subject to their privacy settings.
                </P>

                <SubHead>2.4 What We Do NOT Collect</SubHead>
                <P>
                  We do not collect special categories of personal data including details about Your race, ethnicity,
                  religious or philosophical beliefs, sexual orientation, political opinions, or trade union memberships,
                  unless You voluntarily provide such information as part of a Campaign description (e.g., a medical
                  condition relevant to the Campaign). We do not collect information about criminal offences or
                  convictions.
                </P>
              </Section>

              {/* 03 ── How We Use */}
              <Section id="how-we-use" num="03" title="How We Use Your Information" icon={Cog}>
                <P>We use Your personal information for the following purposes:</P>
                <Bullets
                  items={[
                    "To create and manage Your account on the Platform",
                    "To facilitate and process donations, item listings, item requests, and item matches",
                    "To display and promote Campaigns to potential Donors and supporters",
                    "To send transaction confirmations, donation receipts, and campaign updates",
                    "To communicate with You about Your account, campaigns, or support requests",
                    "To verify Your identity and prevent fraud, abuse, or unauthorized activities",
                    "To comply with applicable laws and regulatory requirements",
                    "To improve and develop the Platform and understand user behaviour",
                    "To send You newsletters and updates (only with Your consent; You may opt out at any time)",
                    "To share information with Beneficiaries, Trusts, or NGOs as required to fulfill a Campaign's purpose",
                    "To respond to legal requests, court orders, or government authorities as required by law",
                  ]}
                />
              </Section>

              {/* 04 ── Sharing */}
              <Section id="sharing" num="04" title="Sharing of Information" icon={Share2}>
                <P>
                  We do not sell or rent Your personal data to third parties. We may share Your information in the
                  following circumstances:
                </P>
                <Bullets
                  items={[
                    <>
                      <Lead>With Campaign Creators &amp; Beneficiaries:</Lead> If You donate to a Campaign, the Campaign
                      creator may receive Your name, email address, and donation amount to acknowledge Your
                      contribution. You may opt to donate anonymously.
                    </>,
                    <>
                      <Lead>With NGOs, Trusts, and Partner Organizations:</Lead> We may share information with registered
                      NGOs, Trusts, or charitable organizations listed on the Platform to the extent required for
                      fulfilling the Campaign's objectives and for compliance with applicable law.
                    </>,
                    <>
                      <Lead>With Service Providers:</Lead> We share data with third-party vendors who assist Us in
                      operating the Platform, including payment gateway providers, cloud hosting services, and email
                      delivery services. These providers are contractually bound to use Your data only for the specified
                      purpose and to maintain appropriate security.
                    </>,
                    <>
                      <Lead>For Legal Compliance:</Lead> We may disclose Your information to law enforcement authorities,
                      courts, government agencies, or other parties as required by applicable law, or to enforce our
                      Terms of Use and protect the rights, property, or safety of Users or the public.
                    </>,
                    <>
                      <Lead>Business Transactions:</Lead> In the event of a merger, acquisition, restructuring, or sale
                      of our assets, Your information may be transferred to the successor entity. Such entity will be
                      bound by this Privacy Policy.
                    </>,
                    <>
                      <Lead>With Your Consent:</Lead> We may share Your information for any other purpose with Your
                      explicit prior consent.
                    </>,
                  ]}
                />
              </Section>

              {/* 05 ── Retention */}
              <Section id="retention" num="05" title="Data Retention" icon={Clock}>
                <P>We retain Your personal data for as long as:</P>
                <Bullets
                  items={[
                    "Your account remains active on the Platform",
                    "It is necessary to fulfill the purposes described in this Privacy Policy",
                    "Required by applicable law (e.g., financial records for taxation purposes)",
                  ]}
                />
                <P>
                  When personal data is no longer required, We will delete or anonymize it. In certain circumstances, We
                  may retain anonymized, aggregated data for statistical or research purposes indefinitely.
                </P>
              </Section>

              {/* 06 ── Cookies */}
              <Section id="cookies" num="06" title="Cookies & Local Storage" icon={Cookie}>
                <P>
                  We use a limited number of cookies and Your browser's local storage to operate the Platform and
                  provide a smooth experience.
                </P>
                <SubHead>What we use them for</SubHead>
                <Bullets
                  items={[
                    <>
                      Keeping You signed in across sessions when You select <Lead>"Remember Me"</Lead> at login
                    </>,
                    "Remembering Your preferences and settings",
                    "Ensuring the security and proper functioning of the Platform",
                  ]}
                />
                <P>
                  We <Lead>do not</Lead> currently use cookies for advertising or third-party behavioural tracking.
                </P>
                <SubHead>Your choices</SubHead>
                <P>
                  Most browsers allow You to refuse or delete cookies and clear local storage. However, disabling these
                  may affect certain features, such as staying logged in. You can manage these preferences through Your
                  browser settings.
                </P>
              </Section>

              {/* 07 ── Communications */}
              <Section id="communications" num="07" title="Communications & SMS" icon={MessageSquare}>
                <P>
                  By registering on the Platform and/or providing Your contact information, You consent to receiving
                  communications from Us via:
                </P>
                <Bullets
                  items={[
                    "Email (transactional, service-related, and updates)",
                    "SMS and WhatsApp (campaign updates, donation receipts)",
                    "Push notifications (if You enable them on Your device)",
                  ]}
                />
                <P>
                  You may opt out of non-essential communications at any time by clicking "Unsubscribe" in any email, or
                  by contacting Us at{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">
                    {SUPPORT_EMAIL}
                  </a>
                  . Opting out does not affect transactional or legally required communications.
                </P>
              </Section>

              {/* 08 ── Third-party links */}
              <Section id="third-party" num="08" title="Third-Party Links" icon={ExternalLink}>
                <P>
                  The Platform may contain links to third-party websites, applications, or services. CauseKind is not
                  responsible for the privacy practices or content of those third-party sites. We encourage You to review
                  the privacy policy of any website You visit before providing any personal information.
                </P>
              </Section>

              {/* 09 ── Security */}
              <Section id="security" num="09" title="Security" icon={Lock}>
                <P>
                  We take reasonable technical, operational, and physical measures to protect Your personal data from
                  unauthorized access, disclosure, alteration, or destruction. These include:
                </P>
                <Bullets
                  items={[
                    "SSL/TLS encryption for data in transit",
                    "Encrypted storage of passwords",
                    "Access controls and role-based permissions",
                    "Regular security reviews",
                  ]}
                />
                <P>
                  However, no method of internet transmission or electronic storage is 100% secure. While We strive to
                  protect Your data, We cannot guarantee absolute security. If You suspect a security breach, please
                  contact Us immediately at{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </P>
              </Section>

              {/* 10 ── Children */}
              <Section id="children" num="10" title="Children's Privacy" icon={Baby}>
                <P>
                  The Platform is intended for use only by individuals who can form a legally binding contract under the{" "}
                  <Lead>Indian Contract Act, 1872</Lead>. Persons under the age of 18 may use the Platform only with the
                  involvement of a parent or guardian. We do not knowingly collect personal data from children. If You
                  believe a child has provided Us with personal data without parental consent, please contact Us and We
                  will take appropriate steps to delete such information.
                </P>
              </Section>

              {/* 11 ── Your rights */}
              <Section id="your-rights" num="11" title="Your Rights" icon={UserCheck}>
                <P>You have the following rights with respect to Your personal data:</P>
                <Bullets
                  items={[
                    <>
                      <Lead>Access:</Lead> Request a copy of the personal data We hold about You
                    </>,
                    <>
                      <Lead>Correction:</Lead> Request correction of inaccurate or incomplete data
                    </>,
                    <>
                      <Lead>Erasure:</Lead> Request deletion of Your personal data, subject to legal and contractual
                      obligations
                    </>,
                    <>
                      <Lead>Withdrawal of Consent:</Lead> Withdraw Your consent to data processing at any time (this does
                      not affect processing carried out before withdrawal)
                    </>,
                    <>
                      <Lead>Opt-Out:</Lead> Opt out of marketing communications or non-essential data sharing
                    </>,
                    <>
                      <Lead>Account Deactivation:</Lead> Request deactivation of Your account
                    </>,
                  ]}
                />
                <P>
                  To exercise any of these rights, please contact our Grievance Officer (details in Section 12). We will
                  respond within <Lead>30 days</Lead> of receiving Your request. We may ask You to verify Your identity
                  before fulfilling the request.
                </P>
              </Section>

              {/* 12 ── Grievance officer */}
              <Section id="grievance" num="12" title="Grievance Officer" icon={Scale}>
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

              {/* 13 ── Disclaimer */}
              <Section id="disclaimer" num="13" title="Disclaimer Regarding Campaign Accuracy" icon={AlertTriangle}>
                <P>
                  CauseKind acts as a platform to connect Donors with Beneficiaries and Campaigns. While We endeavour to
                  verify Campaigns, such verification is not exhaustive or warranted by Us. CauseKind is not a party to
                  any Campaign.
                </P>
                <P>
                  Each Donor is encouraged to conduct their own due diligence. CauseKind does not represent or warrant
                  that Beneficiaries will use donated funds or materials in the manner represented. Donors acknowledge
                  that they do not rely solely on CauseKind for the accuracy or completeness of Campaign information.
                </P>
              </Section>

              {/* 14 ── Changes */}
              <Section id="changes" num="14" title="Changes to This Privacy Policy" icon={RefreshCw}>
                <P>
                  We reserve the right to update this Privacy Policy at any time. Material changes will be notified via:
                </P>
                <Bullets
                  items={[
                    "Email to Your registered email address",
                    "A prominent notice on the Platform",
                  ]}
                />
                <P>
                  Your continued use of the Platform after such notification constitutes Your acceptance of the updated
                  Privacy Policy.
                </P>
              </Section>

              {/* 15 ── Contact */}
              <Section id="contact" num="15" title="Contact Us" icon={Mail}>
                <P>
                  For any questions, concerns, or requests related to this Privacy Policy, please contact Us:
                </P>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#b04a15] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#b04a15]/20 transition-colors hover:bg-[#963c0d]"
                  >
                    <Mail className="h-4 w-4" />
                    {SUPPORT_EMAIL}
                  </a>
                  <Link
                    href="/help"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-colors hover:border-[#b04a15]/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300"
                  >
                    Visit Help Center
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
                <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#b04a15] dark:text-orange-400" />
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  This Privacy Policy is effective as of {LAST_UPDATED}.
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
