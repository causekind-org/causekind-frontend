"use client";
import { UiText, useUiText } from "@/components/UiText";


import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, HandCoins, HandHeart, Megaphone, Package, X, type LucideIcon } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import { Drawer, DrawerClose, DrawerOverlay, DrawerPortal, DrawerTitle } from "@/components/ui/drawer";
import { DONATE_HREF } from "@/lib/donateScroll";
import { useAuth } from "@/hooks/useAuth";
import { openDonateItemsChoice } from "@/components/donate/DonateItemsChoiceModal";
import { TUNING, calmness, createBody, isAtRest, stackedPairs, stepTray, type Body, type BodyKind } from "@/components/donate/trayPhysics";

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
 * <p>Copy is translated through the catalogue (UiText / ui("…"), 2026-10-21);
 * routes and the money/items choice itself are not affected.
 */

const OPEN_EVENT = "ck:open-donate-choice";
const IN_KIND_HREF = "/requests";
const FUNDRAISERS_HREF = "/fundraisers";

export function openDonateChoice() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function useIsPhone() {
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
  const ui = useUiText();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  useTrayPhysics(sheet);
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

  // Guests and donors pick between listing an item and answering a request
  // (DonateItemsChoiceModal). It opens only once this popup has finished
  // closing, so the two never stack and focus returns to the Donate button.
  // Other roles keep going straight to /requests.
  const { user } = useAuth();
  const choosesItems = !user || user.role?.replace(/^ROLE_/, "") === "DONOR";
  const afterClose = useRef<(() => void) | null>(null);
  const runAfterClose = useCallback(() => {
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  }, []);
  const goItems = useCallback(() => {
    if (!choosesItems) return go(IN_KIND_HREF);
    afterClose.current = openDonateItemsChoice;
    setOpen(false);
  }, [choosesItems, go]);

  // One bottom sheet at every width (2026-11-13): three compact cards in a
  // row from 768px, stacked on phones. vaul supplies the focus trap, Escape,
  // backdrop click, scroll lock and focus restore; useTrayPhysics moves the
  // card contents with the sheet; .ck-donate-sheet in
  // styles.css shortens its slide to 300ms and honours reduced motion.
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerPortal>
        <DrawerOverlay className="ck-donate-sheet-overlay bg-black/30 backdrop-blur-md" />
        <VaulDrawer.Content
          ref={setSheet}
          onCloseAutoFocus={runAfterClose}
          aria-describedby={undefined}
          className="ck-donate-sheet fixed inset-x-0 bottom-0 z-[100] flex max-h-[85dvh] flex-col overflow-y-auto overscroll-contain rounded-t-[26px] bg-white shadow-[0_-12px_40px_rgba(28,25,23,0.16)] outline-none md:min-h-[50vh] dark:bg-zinc-900"
        >
          {/* Grab handle: phones only, where the sheet can be dragged down. */}
          <div aria-hidden className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-stone-300 md:hidden dark:bg-zinc-700" />
          <div className="flex w-full flex-1 flex-col gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:px-8 md:pt-5 lg:px-12">
            <div className="flex items-center justify-between gap-4">
              <DrawerTitle className="text-xl font-extrabold tracking-tight text-stone-900 md:text-[22px] dark:text-stone-50"><UiText>
                How would you like to give?
              </UiText></DrawerTitle>
              <DrawerClose
                aria-label={ui("Close")}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-50"
              >
                <X className="size-5" aria-hidden />
              </DrawerClose>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              <SheetOption
                tone="items"
                title={ui("Donate items")}
                text={ui("Give clothes, books, furniture or appliances to someone who needs them.")}
                cta={ui("Donate items")}
                onSelect={goItems}
              />
              <SheetOption
                tone="money"
                title={ui("Donate money")}
                text={ui("Support a verified cause with a secure online donation.")}
                cta={ui("Donate money")}
                onSelect={() => go(DONATE_HREF)}
              />
              <SheetOption
                tone="need"
                icon={Megaphone}
                title={ui("Back a fundraiser")}
                text={ui("Help someone reach their fundraising goal.")}
                cta={ui("Explore fundraisers")}
                onSelect={() => go(FUNDRAISERS_HREF)}
              />
            </div>
          </div>
        </VaulDrawer.Content>
      </DrawerPortal>
    </Drawer>
  );
}

/**
 * Runs trayPhysics on the sheet's cards. Each `[data-tray]` card is a tray and
 * each `[data-body]` inside it a loose body. Every frame the sheet's real
 * position gives its velocity and acceleration, so the contents answer however
 * it actually moves: the opening slide, a close, a drag, an interrupted drag.
 *
 * Nothing goes through React state: bodies live in plain arrays and are
 * painted with `style.transform`. The DOM order and layout are untouched, and
 * a body at home has no transform at all, so settled text is as sharp as ever.
 * The loop stops once everything is at rest and restarts when the sheet is
 * touched or starts an animation. Off under prefers-reduced-motion.
 */
type Tray = { card: HTMLElement; els: HTMLElement[]; bodies: Body[]; pairs: [number, number][] };

function useTrayPhysics(sheet: HTMLElement | null) {
  useEffect(() => {
    if (!sheet || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let running = false;
    let last = 0;
    let sheetY = 0;
    let sheetV = 0;
    let accel = 0;
    let activeAt = 0;
    let trays: Tray[] | null = null;

    const clear = () => {
      for (const t of trays ?? []) for (const el of t.els) { el.style.transform = ""; el.style.willChange = ""; }
    };

    // Measures home boxes with every body at rest, so the card's padding and
    // each body's full size set how far it may travel.
    const build = () => {
      clear();
      trays = Array.from(sheet.querySelectorAll<HTMLElement>("[data-tray]")).map((card) => {
        const c = card.getBoundingClientRect();
        const els = Array.from(card.querySelectorAll<HTMLElement>("[data-body]"));
        const bodies = els.map((el) => {
          const r = el.getBoundingClientRect();
          const home = { left: r.left - c.left, top: r.top - c.top, right: r.right - c.left, bottom: r.bottom - c.top };
          return createBody(el.dataset.body as BodyKind, home, { width: c.width, height: c.height }, Math.random);
        });
        for (const el of els) el.style.willChange = "transform";
        return { card, els, bodies, pairs: stackedPairs(bodies) };
      });
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      clear();
      trays = null;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // Bounded step: a stalled tab must not turn into one enormous shove.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (dt <= 0) return;
      if (!trays) build();
      const y = sheet.getBoundingClientRect().top;
      const v = (y - sheetY) / dt;
      // Lightly smoothed: raw frame-to-frame differences are noisy.
      accel += ((v - sheetV) / dt - accel) * 0.6;
      sheetY = y;
      sheetV = v;
      if (Math.abs(accel) > TUNING.activeAccel) activeAt = now;
      const calm = calmness((now - activeAt) / 1000);

      const steps = Math.max(1, Math.round(dt / 0.004));
      let resting = calm >= 1;
      for (const t of trays!) {
        // A focused or pressed card keeps its button steady under the finger.
        const held = t.card.matches(":active, :focus-visible");
        for (const b of t.bodies) b.held = held && b.kind === "cta";
        for (let i = 0; i < steps; i++) stepTray(t.bodies, t.pairs, accel, calm, dt / steps);
        t.bodies.forEach((b, i) => {
          t.els[i].style.transform =
            `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${b.r.toFixed(3)}deg)`;
        });
        if (resting && !isAtRest(t.bodies)) resting = false;
      }
      // Calm sheet, everything home: snap exactly into the layout and stop.
      if (resting) stop();
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      activeAt = last;
      sheetY = sheet.getBoundingClientRect().top;
      sheetV = 0;
      accel = 0;
      frame = requestAnimationFrame(tick);
    };
    // Boxes change with the viewport; remeasure from rest on the next frame.
    const remeasure = () => { if (trays) { clear(); trays = null; } };

    sheet.addEventListener("pointerdown", start);
    sheet.addEventListener("animationstart", start);
    window.addEventListener("resize", remeasure);
    start();
    return () => {
      sheet.removeEventListener("pointerdown", start);
      sheet.removeEventListener("animationstart", start);
      window.removeEventListener("resize", remeasure);
      stop();
    };
  }, [sheet]);
}

/** A compact card in the donate bottom sheet: icon, title, one line, one button. */
function SheetOption({
  tone, title, text, cta, onSelect, icon,
}: {
  tone: keyof typeof TONES; title: string; text: string; cta: string; onSelect: () => void;
  /** Overrides the tone's icon. */
  icon?: LucideIcon;
}) {
  const t = TONES[tone];
  const Icon = icon ?? t.Icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-tray
      className={`group flex flex-col gap-3 rounded-[18px] border-2 border-[#ece4da] p-3.5 text-left transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:gap-5 md:p-6 dark:border-zinc-700 ${t.card}`}
    >
      <span className="flex items-start gap-3 md:flex-col md:gap-4">
        <span data-body="icon" className={`flex size-10 shrink-0 items-center justify-center rounded-xl md:size-14 md:rounded-2xl ${t.icon}`}>
          <Icon className="size-5 md:size-7" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 md:gap-1.5">
          <span data-body="title" className="text-[17px] font-extrabold leading-tight text-stone-900 md:text-[22px] dark:text-stone-50">{title}</span>
          <span data-body="desc" className="text-sm leading-snug text-stone-500 md:text-base md:leading-relaxed dark:text-stone-400">{text}</span>
        </span>
      </span>
      <span data-body="cta" className={`mt-auto flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[15px] font-bold md:h-12 md:text-base text-white transition-colors ${t.button}`}>
        {cta}
        <ArrowRight className="size-[17px]" aria-hidden />
      </span>
    </button>
  );
}

/**
 * Desktop measurements shared by both donate popups (this one and
 * DonateItemsChoiceModal), so they always match. Sized to fit a laptop at
 * 100% zoom; on short screens (720px tall or less) padding and gaps tighten
 * further, never the text. Below that the popup scrolls inside rather than
 * clipping its buttons.
 */
export const POPUP = {
  content:
    "max-h-[calc(100dvh-1.5rem)] max-w-[690px] gap-6 overflow-y-auto overscroll-contain rounded-[28px] border-0 bg-white p-8 pb-6 shadow-2xl dark:bg-zinc-900 [@media(max-height:720px)]:gap-4 [@media(max-height:720px)]:px-7 [@media(max-height:720px)]:py-5",
  header: "flex flex-col gap-1.5 pr-12 [@media(max-height:720px)]:gap-1",
  eyebrow: "text-xs font-extrabold uppercase tracking-[0.14em] text-brand-500",
  title: "text-[28px] font-extrabold leading-tight tracking-tight text-stone-900 dark:text-stone-50",
  subtitle: "text-[15px] leading-relaxed text-stone-500 dark:text-stone-400",
  grid: "grid grid-cols-2 gap-4 [@media(max-height:720px)]:gap-3",
} as const;

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
  // Donee navy, for answering a request (DonateItemsChoiceModal).
  need: {
    card: "bg-[#f5f8fd] hover:border-[#1e3a60] hover:shadow-[0_10px_28px_rgba(30,58,96,0.14)] dark:bg-white/[0.03] dark:hover:border-[#7fb0e8]",
    icon: "bg-[#e3edf9] text-[#1e3a60] dark:bg-[#7fb0e8]/15 dark:text-[#7fb0e8]",
    ink: "text-[#1e3a60] dark:text-[#7fb0e8]",
    button: "bg-[#1e3a60] group-hover:bg-[#2d5a96]",
    Icon: HandHeart,
  },
} as const;

export function DesktopOption({
  tone, title, kicker, text, points, onSelect, icon, cta = title,
}: {
  tone: keyof typeof TONES; title: string; kicker: string; text: string; points: string[]; onSelect: () => void;
  /** Overrides the tone's icon. */
  icon?: LucideIcon;
  /** The button's label; defaults to the title. Callers pass already-translated text. */
  cta?: string;
}) {
  const t = TONES[tone];
  const Icon = icon ?? t.Icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col gap-3.5 rounded-[22px] border-2 border-[#ece4da] p-5 text-left [@media(max-height:720px)]:gap-2.5 [@media(max-height:720px)]:p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 dark:border-zinc-700 ${t.card}`}
    >
      <span className={`flex size-[50px] items-center justify-center rounded-2xl ${t.icon} [@media(max-height:720px)]:size-11`}>
        <Icon className="size-[25px]" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[19px] font-extrabold text-stone-900 dark:text-stone-50">{title}</span>
        <span className={`text-xs font-bold uppercase tracking-[0.06em] ${t.ink}`}>{kicker}</span>
        <span className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{text}</span>
      </span>
      <span className="flex flex-col gap-1.5 text-sm text-stone-700 dark:text-stone-300 [@media(max-height:720px)]:gap-1">
        {points.map((p) => (
          <span key={p} className="flex items-center gap-2">
            <Check className={`size-4 shrink-0 ${t.ink}`} strokeWidth={2.4} aria-hidden />
            {p}
          </span>
        ))}
      </span>
      <span className={`mt-auto flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition-colors ${t.button}`}>
        {cta}
        <ArrowRight className="size-[17px]" aria-hidden />
      </span>
    </button>
  );
}

export function PhoneOption({
  tone, title, text, onSelect, icon,
}: {
  tone: keyof typeof TONES; title: string; text: string; onSelect: () => void;
  /** Overrides the tone's icon. */
  icon?: LucideIcon;
}) {
  const t = TONES[tone];
  const Icon = icon ?? t.Icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-11 items-center gap-3.5 rounded-[18px] border-2 border-[#ece4da] p-4 text-left focus-visible:outline-none focus-visible:ring-2 dark:border-zinc-700 ${t.card}`}
    >
      <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-[14px] ${t.icon}`}>
        <Icon className="size-[26px]" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-extrabold text-stone-900 dark:text-stone-50">{title}</span>
        <span className="text-[13px] leading-snug text-stone-500 dark:text-stone-400">{text}</span>
      </span>
      <ChevronRight className={`size-5 shrink-0 ${t.ink}`} aria-hidden />
    </button>
  );
}
