"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HandHeart, PackagePlus, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { DesktopOption, openDonateChoice, useIsPhone } from "@/components/donate/DonateChoice";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

/**
 * "How would you like to donate?" — what "Donate items" opens for guests and
 * donors: list something they have, or answer a live request. A guest is sent
 * to sign up first (role DONOR preselected, "Log in" offered there) and lands
 * on the same destination afterwards through `?next=`.
 *
 * <p>Opened only by {@link DonateChoice}, once its own popup has finished
 * closing, so the two never stack. "Back" does the same in reverse. Same
 * shell, cards and phone/desktop split as DonateChoice.
 *
 * <p>Copy is English-only on purpose, as in DonateChoice.
 */

const OPEN_EVENT = "ck:open-donate-items-choice";
/** The listing wizard creates the draft and adds `?draft=` itself. */
const LIST_ITEM_HREF = "/items/new";
const NEEDS_HREF = "/requests";

export function openDonateItemsChoice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * The last element focused outside any overlay — the Donate button behind both
 * popups. Tracked continuously for the reason given in ui/dialog: by the time
 * this popup opens, the first one has already closed.
 */
let lastOutsideFocus: HTMLElement | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t || t === document.body) return;
      if (t.closest("[data-slot='dialog-content'],[data-slot='drawer-content'],[role='dialog']")) return;
      lastOutsideFocus = t;
    },
    true,
  );
}

export function DonateItemsChoiceModal() {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const router = useRouter();
  const opener = useRef<HTMLElement | null>(null);
  const afterClose = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onOpen = () => {
      opener.current = lastOutsideFocus;
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const { user } = useAuth();
  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(user ? href : registerUrlPreserving(href));
    },
    [router, user],
  );

  const back = useCallback(() => {
    afterClose.current = openDonateChoice;
    setOpen(false);
  }, []);

  // Runs once the close animation has finished: return focus to the Donate
  // button, then (for Back) reopen the first popup.
  const onCloseAutoFocus = useCallback((e: Event) => {
    const el = opener.current;
    if (el && el.isConnected && typeof el.focus === "function") {
      e.preventDefault();
      el.focus();
    }
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  }, []);

  const cards = (
    <>
      <DesktopOption
        tone="items"
        icon={PackagePlus}
        title="List an item"
        kicker="Give what you have"
        text="Have something you no longer use? List it in 5 short steps and we'll match it with someone nearby who needs it."
        points={["Takes about 5 minutes", "We save as you go", "Matched to verified people nearby"]}
        onSelect={() => go(LIST_ITEM_HREF)}
      />
      <DesktopOption
        tone="need"
        icon={HandHeart}
        title="Fulfil a need"
        kicker="Answer a request"
        text="Browse live requests from verified people and NGOs near you, and give exactly what they're asking for."
        points={["Every request is verified", "See exactly what's needed", "OTP-confirmed handover"]}
        cta="Browse needs"
        onSelect={() => go(NEEDS_HREF)}
      />
    </>
  );

  const eyebrow = (
    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-500">Donate items</span>
  );
  const subtitle = "List something you no longer need, or give exactly what someone has asked for.";

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={setOpen} autoFocus>
        <DrawerContent
          onCloseAutoFocus={onCloseAutoFocus}
          className="max-h-[92dvh] rounded-t-[26px] bg-white pb-7 pt-1 dark:bg-zinc-900"
        >
          {/* Back and × stay put while the rest scrolls. */}
          <div className="mt-2 flex shrink-0 items-center justify-between px-4">
            <BackButton onClick={back} />
            <DrawerClose
              className="flex size-11 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <XIcon className="size-5" aria-hidden />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </div>
          {/* Scrolls on short screens; dragging stays on the grab handle. */}
          <div data-vaul-no-drag className="min-h-0 overflow-y-auto overscroll-contain px-4">
            <div className="mt-1 flex flex-col gap-1">
              {eyebrow}
              <DrawerTitle className="text-[23px] font-extrabold text-stone-900 dark:text-stone-50">
                How would you like to donate?
              </DrawerTitle>
              <DrawerDescription className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</DrawerDescription>
            </div>
            <div className="mt-4 flex flex-col gap-3">{cards}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-w-[760px] gap-7 overflow-y-auto rounded-[28px] border-0 bg-white p-10 pb-7 shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-2 pr-12">
          <BackButton onClick={back} className="-mt-5 mb-1" />
          {eyebrow}
          <DialogTitle className="text-[32px] font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            How would you like to donate?
          </DialogTitle>
          <DialogDescription className="text-base text-stone-500 dark:text-stone-400">{subtitle}</DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-5">{cards}</div>
      </DialogContent>
    </Dialog>
  );
}

function BackButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-2 text-sm font-bold text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-300 dark:hover:text-white ${className}`}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back
    </button>
  );
}
