"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import ChatWindow from "@/components/ChatWindow";
import MatchChatWindow from "@/components/MatchChatWindow";
import { handoverScope, type HandoverViewModel } from "./model";
import { handoverSecondary } from "./handoverStyles";
import { Panel } from "./HandoverScheduleSummary";

/**
 * Chat: inline in the desktop coordination rail, a full-height Drawer on mobile.
 *
 * <p>The two existing chat windows are kept as-is behind a `flow` switch rather
 * than merged — they talk to different endpoints and different thread models, and
 * unifying them would mean a rewrite of working, tested components for no user-
 * visible gain. This is the seam, not a merge.
 *
 * <p>Both windows own their own scroll container, which is what keeps a new message
 * from scrolling the whole page.
 */
export function HandoverChatPanel({ vm, currentUserEmail, className = "" }: {
  vm: HandoverViewModel;
  currentUserEmail: string;
  className?: string;
}) {
  const locked = vm.closed;

  return (
    <Panel title="Messages" className={className}>
      <div className="h-[420px] overflow-hidden rounded-md">
        {vm.flow === "OFFER"
          ? <ChatWindow offerId={vm.id} currentUserEmail={currentUserEmail} locked={locked} className="h-full" />
          : <MatchChatWindow matchId={vm.id} currentUserEmail={currentUserEmail} locked={locked} className="h-full" />}
      </div>
    </Panel>
  );
}

/**
 * Mobile chat launcher + Drawer. HeroUI's Drawer handles focus trapping, Escape
 * and focus restoration; doing that by hand is where accessible dialogs usually
 * go wrong.
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
      {/* One interactive element per action — a plain Button driving a
          controlled Drawer, rather than a trigger wrapping a button. */}
      <Button
        variant="outline"
        className={`relative ${handoverSecondary}`}
        aria-label={unread ? "Open messages, new message waiting" : "Open messages"}
        onClick={() => { onOpenChange(true); setUnread(false); }}
      >
        <MessageCircle aria-hidden />
        Messages
        {unread && (
          <span
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card"
            aria-hidden
          />
        )}
      </Button>

      <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setUnread(false); }}>
        {/* Role scope repeated on the content: vaul portals to <body>, outside
            the .handover-* element that defines the accent tokens. */}
        <DrawerContent className={`${handoverScope(vm.role)} h-[85dvh]`}>
          <DrawerHeader>
            <DrawerTitle>Messages</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            {vm.flow === "OFFER"
              ? <ChatWindow offerId={vm.id} currentUserEmail={currentUserEmail} locked={vm.closed} className="h-full" />
              : <MatchChatWindow matchId={vm.id} currentUserEmail={currentUserEmail} locked={vm.closed} className="h-full" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
