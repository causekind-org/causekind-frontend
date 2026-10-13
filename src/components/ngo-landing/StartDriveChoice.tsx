"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { POPUP, useIsPhone } from "@/components/donate/DonateChoice";

/** Where "Items drive" goes: the drive form, past the type page. */
export const ITEMS_DRIVE_HREF = "/ngo/drives/new?type=items";
const OPEN_EVENT = "ck:open-start-drive-choice";

export function openStartDriveChoice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * "What kind of drive?" — the choice every enabled "Start a Drive" link opens, in the
 * look of the donor "How would you like to give?" popup, in NGO green. Mounted once;
 * it catches clicks on links to /ngo/drives/new (exactly, no query) by delegation, so
 * every such link (hero, dashboard, empty states, menus) opens it. Locked "Start a
 * Drive" buttons are not links and keep their own behaviour; modified clicks and
 * opening /ngo/drives/new directly still go to the page.
 */
export function StartDriveChoice() {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("data-start-drive-direct")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/ngo/drives/new" || url.search) return;
      e.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const goItems = () => {
    setOpen(false);
    router.push(ITEMS_DRIVE_HREF);
  };

  const options = (phone: boolean) => (
    <div className={phone ? "mt-4 flex flex-col gap-3" : POPUP.grid}>
      <button type="button" onClick={goItems}
        className={`group flex ${phone ? "items-center gap-3.5 p-4" : "flex-col gap-3.5 p-5"} rounded-[22px] border-2 border-[#e3ece7] bg-[#f6faf8] text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-ngo-700 hover:shadow-[0_10px_28px_rgba(30,107,79,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 dark:border-zinc-700 dark:bg-white/[0.03]`}>
        <span className="flex size-[50px] shrink-0 items-center justify-center rounded-2xl bg-ngo-50 text-ngo-700 dark:bg-ngo-900/30 dark:text-ngo-300">
          <Layers className="size-[25px]" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[19px] font-extrabold text-stone-900 dark:text-stone-50">Items drive</span>
          <span className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Collect blankets, books, ration kits and more. Donors near you pledge the items.
          </span>
        </span>
        {!phone && (
          <span className="mt-auto flex h-11 shrink-0 items-center justify-center rounded-full bg-ngo-700 text-[15px] font-bold text-white transition-colors group-hover:bg-ngo-800">
            Start an items drive
          </span>
        )}
      </button>
      <button type="button" disabled aria-disabled="true"
        className={`relative flex ${phone ? "items-center gap-3.5 p-4" : "flex-col gap-3.5 p-5"} cursor-not-allowed rounded-[22px] border-2 border-[#ece4da] bg-stone-50 text-left opacity-60 dark:border-zinc-700 dark:bg-white/[0.02]`}>
        <span className="absolute right-4 top-4 rounded-md bg-stone-200 px-2 py-1 text-2xs font-black uppercase tracking-wider text-stone-600 dark:bg-zinc-800 dark:text-stone-400">
          Coming soon
        </span>
        <span className="flex size-[50px] shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-zinc-800">
          <HandCoins className="size-[25px]" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[19px] font-extrabold text-stone-900 dark:text-stone-50">Money drive</span>
          <span className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">Raise funds for what you need.</span>
        </span>
      </button>
    </div>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="rounded-t-[26px] bg-white px-4 pb-7 pt-1 dark:bg-zinc-900">
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-ngo-700 dark:text-ngo-300">Start a drive</span>
            <DrawerTitle className="text-[23px] font-extrabold text-stone-900 dark:text-stone-50">What kind of drive?</DrawerTitle>
            <DrawerDescription className="text-sm text-stone-500 dark:text-stone-400">
              Pick what your organization needs.
            </DrawerDescription>
          </div>
          {options(true)}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={POPUP.content}>
        <div className={POPUP.header}>
          <span className={`${POPUP.eyebrow} !text-ngo-700 dark:!text-ngo-300`}>Start a drive</span>
          <DialogTitle className={POPUP.title}>What kind of drive?</DialogTitle>
          <DialogDescription className={POPUP.subtitle}>Pick what your organization needs.</DialogDescription>
        </div>
        {options(false)}
      </DialogContent>
    </Dialog>
  );
}
