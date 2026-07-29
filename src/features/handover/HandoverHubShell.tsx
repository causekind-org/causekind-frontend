"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { HandoverJourneyRail } from "./HandoverJourneyRail";
import { HandoverNextAction } from "./HandoverNextAction";
import { HandoverScheduleSummary } from "./HandoverScheduleSummary";
import { HandoverScheduleDialog, type SchedulePayload } from "./HandoverScheduleDialog";
import { HandoverContactPanel } from "./HandoverContactPanel";
import { HandoverChatPanel, HandoverChatDrawer } from "./HandoverChatPanel";
import { HandoverSafetyActions } from "./HandoverSafetyActions";
import type { DonorConfirmPayload, DoneeConfirmPayload } from "./HandoverConfirmationPanel";
import type { HandoverViewModel } from "./model";

/**
 * The shared workspace both routes render.
 *
 * <p>Layout: a compact context header, a horizontal journey rail, then a 12-column
 * split — main action area at 7-8 columns, a sticky coordination rail at 4-5. On
 * mobile it collapses to one column in priority order with a sticky action bar.
 *
 * <p>Design constraints held throughout: flat panels at 8px radius, no nested
 * cards, neutral surfaces dominant with the role accent used only for the next
 * step and interactive affordances. Green/amber/red keep their existing meanings
 * regardless of role — a success is a success whoever is reading it.
 */
export function HandoverHubShell({
  vm, userEmail, otp, actions, onChanged,
}: {
  vm: HandoverViewModel;
  userEmail: string;
  otp: string | null;
  actions: {
    schedule: (p: SchedulePayload) => Promise<void>;
    reschedule: (p: SchedulePayload) => Promise<void>;
    generateOtp: () => Promise<void>;
    confirmDonor: (p: DonorConfirmPayload) => Promise<void>;
    confirmDonee: (p: DoneeConfirmPayload) => Promise<void>;
    setCallPermission?: (next: boolean) => Promise<void>;
  };
  onChanged: () => void;
}) {
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const isReschedule = vm.schedule != null;
  const roleClass = vm.role === "DONOR" ? "handover-donor" : "handover-donee";

  /**
   * One "message them" affordance, two surfaces. On desktop the chat is already
   * on screen in the rail, so opening a drawer over it would be a second copy of
   * the same conversation; there we just move focus to it instead.
   */
  function openChat() {
    const desktop = typeof window !== "undefined"
      && window.matchMedia("(min-width: 1024px)").matches;
    if (desktop) {
      document.getElementById("handover-chat")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    setChatOpen(true);
  }

  return (
    <main className={`${roleClass} min-h-[100dvh] bg-[var(--background)] pb-28 lg:pb-10`}>
      <div className="mx-auto max-w-6xl px-4 pt-5">
        {/* ── Context header ─────────────────────────────────────────────── */}
        <header className="mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-[var(--handover-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            Back
          </button>

          <div className="flex items-start gap-3">
            <ItemImage url={vm.imageUrl} alt="" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
                {vm.title}
              </h1>
              <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">
                {vm.role === "DONOR" ? "For " : "From "}
                {vm.counterpart.name ?? (vm.role === "DONOR" ? "the recipient" : "the donor")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-[11px] text-stone-400">{vm.transactionCode}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Verified handover
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Journey ────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-lg border border-stone-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <HandoverJourneyRail state={vm.state} />
        </div>

        {/* ── Workspace ──────────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7 xl:col-span-8">
            <HandoverNextAction
              vm={vm}
              otp={otp}
              onSchedule={() => setScheduleOpen(true)}
              onGenerateOtp={actions.generateOtp}
              onDonorConfirm={actions.confirmDonor}
              onDoneeConfirm={actions.confirmDonee}
              onOpenChat={openChat}
              onChanged={onChanged}
            />

            {/* Mobile keeps schedule directly under the action; desktop moves it
                into the rail so the main column stays about doing, not reading. */}
            <div className="lg:hidden">
              <HandoverScheduleSummary vm={vm} onReschedule={() => setScheduleOpen(true)} />
            </div>

            {/* Unframed below-the-fold sections, separated by dividers rather than
                more cards — nesting panels inside panels was the old hub's habit. */}
            <HandoverSafetyActions vm={vm} onChanged={onChanged} />
            <HelpSection vm={vm} />
          </div>

          <aside className="space-y-4 lg:col-span-5 lg:sticky lg:top-4 lg:self-start xl:col-span-4">
            <div className="hidden lg:block">
              <HandoverScheduleSummary vm={vm} onReschedule={() => setScheduleOpen(true)} />
            </div>
            <HandoverContactPanel vm={vm} onTogglePermission={actions.setCallPermission} />
            <div id="handover-chat" className="hidden lg:block">
              <HandoverChatPanel vm={vm} currentUserEmail={userEmail} />
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky bar ──────────────────────────────────────────────
          env(safe-area-inset-bottom) keeps it clear of the iOS home indicator. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-1 gap-2">
          <HandoverChatDrawer
            vm={vm}
            currentUserEmail={userEmail}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />
          {vm.role === "DONOR" && vm.state === "awaiting_schedule" && (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="min-h-[44px] flex-1 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)]"
            >
              Schedule handover
            </button>
          )}
        </div>
      </div>

      {vm.role === "DONOR" && (
        <HandoverScheduleDialog
          vm={vm}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          isReschedule={isReschedule}
          onSubmit={isReschedule ? actions.reschedule : actions.schedule}
        />
      )}

    </main>
  );
}

/**
 * The real item, at a fixed aspect ratio so it can never shift the header as it
 * loads. Falls back to a neutral icon — an honest empty state beats a stock photo
 * of something that isn't the item.
 */
function ItemImage({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400 dark:bg-zinc-800">
        <Package className="h-6 w-6" aria-hidden />
      </div>
    );
  }
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800">
      <Image src={url} alt={alt} fill sizes="64px" className="object-cover" unoptimized />
    </div>
  );
}

function HelpSection({ vm }: { vm: HandoverViewModel }) {
  return (
    <section className="border-t border-stone-200 pt-5 dark:border-zinc-800">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">How this works</h2>
      <dl className="mt-2.5 space-y-2 text-sm text-stone-600 dark:text-stone-400">
        <div>
          <dt className="font-semibold text-stone-700 dark:text-stone-300">The code</dt>
          <dd>The donor generates a 6-digit code and gives it to the recipient in person. It confirms you both met.</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-700 dark:text-stone-300">Closing it</dt>
          <dd>
            {vm.flow === "OFFER"
              ? "Once you both confirm, there's a short window for the recipient to flag a problem. After that it completes and a certificate is issued to the donor."
              : "Once you both confirm, the handover completes immediately and a delivery record is created."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-700 dark:text-stone-300">Changing the time</dt>
          <dd>Only the donor can reschedule, up to twice. After that it goes to our team for review.</dd>
        </div>
      </dl>
    </section>
  );
}
