"use client";

import { useEffect, useState } from "react";
import { Lock, MessageCircle } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import ChatWindow from "@/components/ChatWindow";
import MatchChatWindow from "@/components/MatchChatWindow";
import { handoverScope, type HandoverViewModel } from "./model";

/** Who the viewer is talking to, for the chat header. */
function counterpartLabel(vm: HandoverViewModel): { name: string; role: string } {
  const role = vm.flow === "NGO_OFFER"
    ? (vm.role === "DONOR" ? "NGO" : "Donor")
    : (vm.role === "DONOR" ? "Recipient" : "Donor");
  return { name: vm.counterpart.name?.trim() || `the ${role.toLowerCase()}`, role };
}

const EMPTY_TEXT = "No messages yet. Say hello and agree the details of the handover here.";

/** The thread itself: one of the two existing chat windows, framed by its host. */
function Thread({ vm, currentUserEmail }: { vm: HandoverViewModel; currentUserEmail: string }) {
  return vm.flow === "OFFER"
    ? <ChatWindow offerId={vm.id} currentUserEmail={currentUserEmail} locked={vm.closed} embedded emptyText={EMPTY_TEXT} className="h-full" />
    : <MatchChatWindow matchId={vm.id} currentUserEmail={currentUserEmail} locked={vm.closed} embedded emptyText={EMPTY_TEXT} className="h-full" />;
}

/**
 * Desktop chat: a full-width card in the main column, under "Your next step".
 * It used to sit at the bottom of the narrow right rail, under Schedule and
 * Contact, which left the main column ending early beside a long empty gap and
 * gave the conversation a cramped, doubly-titled box.
 *
 * <p>The two existing chat windows are kept behind a `flow` switch rather than
 * merged: they talk to different endpoints and thread models. They render
 * `embedded` here, so this card owns the one header and the one border.
 */
export function HandoverChatPanel({ vm, currentUserEmail, className = "" }: {
  vm: HandoverViewModel;
  currentUserEmail: string;
  className?: string;
}) {
  const { name, role } = counterpartLabel(vm);
  const initial = name.replace(/^the /, "").charAt(0).toUpperCase() || "?";

  return (
    <section
      aria-label={`Chat with ${name}`}
      className={`flex h-[560px] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-stone-200 bg-stone-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--handover-soft)] text-sm font-bold text-[var(--handover-on-soft)]"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">Chat with {name}</h2>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {role} · Agree the time and place here. Your phone number stays private.
          </p>
        </div>
        {vm.closed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-2xs font-semibold text-stone-500 dark:bg-zinc-800">
            <Lock className="size-3" aria-hidden /> Closed
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <Thread vm={vm} currentUserEmail={currentUserEmail} />
      </div>
    </section>
  );
}

/**
 * Mobile chat launcher + Drawer. vaul's Drawer handles focus trapping, Escape
 * and focus restoration; doing that by hand is where accessible dialogs usually
 * go wrong.
 *
 * <p>The launcher is a floating button rather than the full-width sticky bar it
 * replaced. That bar spent ~160px of a phone screen on one control, and its
 * second button ("Schedule handover") was already the primary action inside
 * "Your next step" — see HandoverNextAction.
 *
 * <p>It floats above the dock using `--ck-bottom-chrome` (the dock's own height)
 * rather than a literal, and borrows `floating-support-item` so it slides away
 * with the mobile menu exactly like the global support bubble does.
 */
export function HandoverChatDrawer({ vm, currentUserEmail, open, onOpenChange }: {
  vm: HandoverViewModel;
  currentUserEmail: string;
  /** Controlled by the shell so "Message the donor" elsewhere can open this one
      drawer, rather than there being two chat surfaces that don't know about
      each other. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [unread, setUnread] = useState(false);

  // A message arriving while the drawer is shut is the only thing that should
  // mark it unread — and it must not move the page underneath.
  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as { entityType?: string; entityId?: number } | undefined;
      const type = vm.flow === "OFFER" ? "OFFER" : "MATCH";
      if (!open && detail?.entityType === type && detail?.entityId === vm.id) setUnread(true);
    }
    window.addEventListener("ck-entity-update", onUpdate);
    return () => window.removeEventListener("ck-entity-update", onUpdate);
  }, [open, vm.flow, vm.id]);

  return (
    <>
      {/* One interactive element per action — a plain button driving a
          controlled Drawer, rather than a trigger wrapping a button. */}
      <button
        type="button"
        aria-label={unread ? "Open messages, new message waiting" : "Open messages"}
        onClick={() => { onOpenChange(true); setUnread(false); }}
        className="floating-support-item fixed right-5 bottom-[calc(var(--ck-bottom-chrome)+0.75rem)] z-50 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-[var(--handover-accent)] text-[var(--handover-on-accent)] shadow-[0_10px_30px_-8px_rgba(28,25,23,0.55)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] lg:hidden"
      >
        {/* Breathing halo. Behind the button, never over it — pointer-events-none
            so it cannot swallow the tap, and aria-hidden so it is not announced. */}
        <span
          aria-hidden
          className="ck-handover-fab-halo pointer-events-none absolute inset-0 -z-10 rounded-full bg-[var(--handover-accent)]"
        />
        <MessageCircle className="h-6 w-6" aria-hidden />
        {unread && (
          <span
            className="absolute right-0.5 top-0.5 size-3 rounded-full bg-destructive ring-2 ring-[var(--background)]"
            aria-hidden
          />
        )}
      </button>

      <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setUnread(false); }}>
        {/* Role scope repeated on the content: vaul portals to <body>, outside
            the .handover-* element that defines the accent tokens. */}
        <DrawerContent className={`${handoverScope(vm.role)} h-[85dvh]`}>
          <DrawerHeader>
            <DrawerTitle>Chat with {counterpartLabel(vm).name}</DrawerTitle>
            {/* Radix warns when a Dialog has no description and no explicit
                opt-out. sr-only rather than aria-describedby={undefined}: the
                sentence is genuinely useful to a screen-reader user opening a
                sheet with no other context, and silencing the warning without
                supplying one would just hide the gap. */}
            <DrawerDescription className="sr-only">
              Messages between you and the other person about this handover.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <Thread vm={vm} currentUserEmail={currentUserEmail} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
