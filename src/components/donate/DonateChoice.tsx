"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, HandCoins, Package } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { DONATE_HREF } from "@/lib/donateScroll";

/**
 * "How would you like to give?" — the choice every Donate button opens.
 *
 * <p>Donate buttons stay plain links (DonateNowButton ships no client JS), so
 * this component is mounted once in the root layout and catches their clicks
 * by delegation:
 *
 * <ul>
 *   <li>`a[data-donate-cta]` — every DonateNowButton;</li>
 *   <li>`a[data-donate-choice]` — any other link that should open the choice;</li>
 *   <li>`[data-donate-direct]` opts a button out (it already says "money").</li>
 * </ul>
 *
 * <p>Modified clicks (new tab, etc.) and clicks before hydration fall through to
 * the link's own href, the money form, exactly as before. Code that is not a
 * link (the mobile menu) calls {@link openDonateChoice}.
 *
 * <p>Copy is English-only on purpose: the site will be translated by Google
 * Translate, so these strings are not in messages/*.json.
 */

const OPEN_EVENT = "ck:open-donate-choice";
const IN_KIND_HREF = "/requests";

export function openDonateChoice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isPhone;
}

export function DonateChoice() {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[data-donate-cta], a[data-donate-choice]");
      if (!link || link.hasAttribute("data-donate-direct")) return;
      e.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    // Capture phase: runs before Next's Link handler starts the navigation.
    document.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      // The money form's arrival handler owns scrolling, as with DonateNowButton.
      router.push(href, { scroll: href !== DONATE_HREF });
    },
    [router],
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="rounded-t-[26px] bg-white px-4 pb-7 pt-1 dark:bg-zinc-900">
          <div className="mt-3 flex flex-col gap-1">
            <DrawerTitle className="text-[23px] font-extrabold text-stone-900 dark:text-stone-50">
              How would you like to give?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-stone-500 dark:text-stone-400">
              Both reach verified people and NGOs.
            </DrawerDescription>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <PhoneOption
              tone="items"
              title="Donate items"
              text="Clothes, books, furniture to a verified need. OTP handover + certificate."
              onSelect={() => go(IN_KIND_HREF)}
            />
            <PhoneOption
              tone="money"
              title="Donate money"
              text="Secure online payment to a cause. Receipt by email."
              onSelect={() => go(DONATE_HREF)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[760px] gap-7 rounded-[28px] border-0 bg-white p-10 pb-7 shadow-2xl dark:bg-zinc-900">
        <div className="flex flex-col gap-2 pr-12">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-500">Donate</span>
          <DialogTitle className="text-[32px] font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            How would you like to give?
          </DialogTitle>
          <DialogDescription className="text-base text-stone-500 dark:text-stone-400">
            Both go to verified people and NGOs. Pick the way that suits you.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <DesktopOption
            tone="items"
            title="Donate items"
            kicker="In-Kind donation"
            text="Give clothes, books, furniture or appliances directly to someone who has asked for them."
            points={["Matched to a verified need", "OTP-confirmed handover", "Certificate for every gift"]}
            onSelect={() => go(IN_KIND_HREF)}
          />
          <DesktopOption
            tone="money"
            title="Donate money"
            kicker="Monetary donation"
            text="Make a secure online contribution to a cause or campaign you care about."
            points={["Secure payment via Razorpay", "Any amount, one time", "Receipt sent to your email"]}
            onSelect={() => go(DONATE_HREF)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TONES = {
  items: {
    card: "bg-[#fffaf5] hover:border-brand-500 hover:shadow-[0_10px_28px_rgba(176,74,21,0.14)] dark:bg-white/[0.03]",
    icon: "bg-[#fbe6d8] text-brand-500 dark:bg-brand-500/15",
    ink: "text-brand-500",
    button: "bg-brand-500 group-hover:bg-brand-600",
    Icon: Package,
  },
  money: {
    card: "bg-[#f6faf8] hover:border-ngo-700 hover:shadow-[0_10px_28px_rgba(30,107,79,0.14)] dark:bg-white/[0.03]",
    icon: "bg-ngo-50 text-ngo-700 dark:bg-ngo-900/30 dark:text-ngo-300",
    ink: "text-ngo-700 dark:text-ngo-300",
    button: "bg-ngo-700 group-hover:bg-ngo-800",
    Icon: HandCoins,
  },
} as const;

function DesktopOption({
  tone, title, kicker, text, points, onSelect,
}: {
  tone: keyof typeof TONES; title: string; kicker: string; text: string; points: string[]; onSelect: () => void;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col gap-4 rounded-[22px] border-2 border-[#ece4da] p-6 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 dark:border-zinc-700 ${t.card}`}
    >
      <span className={`flex size-14 items-center justify-center rounded-2xl ${t.icon}`}>
        <t.Icon className="size-7" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-[21px] font-extrabold text-stone-900 dark:text-stone-50">{title}</span>
        <span className={`text-xs font-bold uppercase tracking-[0.06em] ${t.ink}`}>{kicker}</span>
        <span className="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">{text}</span>
      </span>
      <span className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-300">
        {points.map((p) => (
          <span key={p} className="flex items-center gap-2">
            <Check className={`size-4 shrink-0 ${t.ink}`} strokeWidth={2.4} aria-hidden />
            {p}
          </span>
        ))}
      </span>
      <span className={`mt-auto flex h-[50px] items-center justify-center gap-2 rounded-full text-base font-bold text-white transition-colors ${t.button}`}>
        {title}
        <ArrowRight className="size-[18px]" aria-hidden />
      </span>
    </button>
  );
}

function PhoneOption({
  tone, title, text, onSelect,
}: {
  tone: keyof typeof TONES; title: string; text: string; onSelect: () => void;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-11 items-center gap-3.5 rounded-[18px] border-2 border-[#ece4da] p-4 text-left focus-visible:outline-none focus-visible:ring-2 dark:border-zinc-700 ${t.card}`}
    >
      <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-[14px] ${t.icon}`}>
        <t.Icon className="size-[26px]" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-extrabold text-stone-900 dark:text-stone-50">{title}</span>
        <span className="text-[13px] leading-snug text-stone-500 dark:text-stone-400">{text}</span>
      </span>
      <ChevronRight className={`size-5 shrink-0 ${t.ink}`} aria-hidden />
    </button>
  );
}
