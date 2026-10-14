"use client";

import { useEffect, useRef } from "react";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import { ArrowRight, Check, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AUDIENCE_OPTIONS, type RequestAudience } from "@/lib/requestAudience";

/**
 * Door copy (owner picked the "Three doors" design, 2026-10-08,
 * https://claude.ai/artifact/RwKxb9DDeuSYq4vSh8K8vb). The option labels in
 * requestAudience stay as they are for the board's own switcher; "Donee" reads
 * as jargon to a giver, so the door says "A person".
 */
// The mock-up's type, scoped to this window only (owner, 2026-10-08).
const doorDisplay = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], display: "swap" });
const doorBody = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const DOOR_COPY: Record<RequestAudience, { title: string; kicker: string; body: string; cta: string; deep: string }> = {
  everyone: { title: "Everyone", kicker: "Most people start here", body: "See every verified need near you, from people and NGOs.", cta: "Show me everything", deep: "#6e2a0a" },
  donee: { title: "A person", kicker: "One family at a time", body: "Help one person or family with something they need.", cta: "Show people", deep: "#0f2138" },
  ngo: { title: "An NGO", kicker: "Reach a whole community", body: "Help an organisation support the people it serves.", cta: "Show NGOs", deep: "#0f3a25" },
};

/**
 * "Who would you like to help?" prompt for the /requests directory.
 *
 * Purely presentational: the board owns the audience state and decides when
 * this opens. One tap on an option chooses and closes — there is no Continue
 * step. Nothing is saved; the board opens this on every visit. Built on the
 * shared Radix dialog, which supplies the focus trap, inert background, scroll
 * lock and Escape.
 */
export default function AudienceDialog({
  open,
  current,
  returnFocusId,
  onChoose,
  onDismiss,
}: {
  open: boolean;
  current: RequestAudience;
  /** Id of the page control to focus once the dialog closes. */
  returnFocusId: (audience: RequestAudience) => string;
  onChoose: (audience: RequestAudience) => void;
  onDismiss: () => void;
}) {
  const closingRef = useRef(false);
  const chosenRef = useRef<RequestAudience | null>(null);

  // The drawings are static now (owner, 2026-10-08: match the Three doors mock-up),
  // so there are no loops to pause and no Pause control.
  useEffect(() => {
    if (open) closingRef.current = false;
  }, [open]);

  const choose = (a: RequestAudience) => {
    if (closingRef.current) return;
    closingRef.current = true;
    chosenRef.current = a;
    onChoose(a);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next || closingRef.current) return;
        closingRef.current = true;
        chosenRef.current = null;
        onDismiss();
      }}
    >
      <DialogContent
        showCloseButton={false}
        // No card (owner, 2026-10-08): the doors float on a deep, blurred backdrop.
        overlayClassName="bg-[#140d09]/90 backdrop-blur-md"
        onCloseAutoFocus={e => {
          const el = document.getElementById(returnFocusId(chosenRef.current ?? current));
          if (el) {
            e.preventDefault();
            el.focus();
          }
        }}
        // Three doors (2026-10-08): nearly the whole screen, dark, each choice a
        // tall panel in its role colour. Phones stack the doors.
        className={`${doorBody.className} sm:flex sm:flex-col h-[min(820px,calc(100vh-2rem))] supports-[height:100dvh]:h-[min(820px,calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:[@media(max-height:560px)]:h-auto sm:[@media(max-height:560px)]:max-h-[calc(100dvh-1rem)] w-[calc(100%-1.5rem)] max-w-[1240px] gap-0 overflow-y-auto rounded-none border-0 bg-transparent p-0 text-white shadow-none`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-6 sm:px-10 sm:pb-6 sm:pt-9 sm:[@media(max-height:760px)]:pb-3 sm:[@media(max-height:760px)]:pt-5">
          <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2.5 sm:[@media(max-height:760px)]:gap-1.5">
            <p className="hidden text-xs font-bold uppercase tracking-[0.22em] text-[#e8a77c] sm:block">Step into a door</p>
            <DialogTitle className={`${doorDisplay.className} text-[1.9rem] font-extrabold leading-none tracking-tight text-white sm:text-[3.4rem] sm:[@media(max-height:760px)]:text-[2.6rem]`}>
              Who would you like to help?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#cbb8aa] sm:text-base">
              Pick what you see first. You can switch anytime from the buttons above the requests.
            </DialogDescription>
          </div>
          <DialogClose
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div role="group" aria-label="Whose requests to show" className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 sm:flex-row sm:gap-3.5 sm:px-10 sm:[@media(max-height:560px)]:flex-none">
          {AUDIENCE_OPTIONS.map(o => {
            const selected = o.value === current;
            const door = DOOR_COPY[o.value];
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                onClick={() => choose(o.value)}
                style={{ backgroundImage: `linear-gradient(165deg, ${o.light.accent} 0%, ${door.deep} 100%)` }}
                className={`group relative flex min-h-[132px] min-w-0 items-center gap-4 rounded-[22px] border-2 p-4 text-start text-white transition-[flex-grow,filter,box-shadow] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:transition-none sm:min-h-0 sm:flex-col sm:items-start sm:gap-5 sm:rounded-[28px] sm:p-7 sm:hover:grow-[1.35] sm:[@media(max-height:760px)]:gap-3 sm:[@media(max-height:760px)]:p-5 ${
                  selected
                    ? "grow-[1.6] border-white/90 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] sm:grow-[1.7]"
                    : "grow border-transparent brightness-[0.7] saturate-[0.7] hover:brightness-95 hover:saturate-100"
                }`}
              >
                <span className="hidden w-full items-center justify-between sm:flex">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] opacity-85">{door.kicker}</span>
                  <Tick on={selected} accent={o.light.accent} />
                </span>

                <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white sm:size-auto sm:min-h-0 sm:flex-1 sm:shrink sm:self-stretch sm:bg-transparent sm:[@media(max-height:560px)]:h-[84px] sm:[@media(max-height:560px)]:flex-none">
                  <span className="block w-10 sm:h-full sm:max-h-[160px] sm:w-auto sm:aspect-[190/150]">
                    <DoorDrawing audience={o.value} />
                  </span>
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none sm:shrink-0 sm:gap-2 sm:[@media(max-height:760px)]:gap-1.5">
                  <span className={`${doorDisplay.className} text-[1.6rem] font-extrabold leading-none sm:text-[2.5rem] sm:[@media(max-height:760px)]:text-[2rem]`}>{door.title}</span>
                  <span className="text-[15px] leading-snug text-white/85 sm:max-w-[300px] sm:text-lg sm:[@media(max-height:760px)]:text-base">{door.body}</span>
                  <span className="mt-2 hidden items-center gap-2 text-[15px] font-bold sm:inline-flex sm:[@media(max-height:760px)]:mt-1">
                    {door.cta} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>

                <span className="sm:hidden"><Tick on={selected} accent={o.light.accent} /></span>
                {selected && <span className="sr-only">(current)</span>}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-xs text-[#a8968a] sm:px-10 sm:pb-7 sm:text-sm sm:[@media(max-height:760px)]:pb-4 sm:[@media(max-height:760px)]:pt-3">
          <span>Every request is verified before it shows. Nothing is shared until you choose to give.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The door's selected mark: a filled white tick, or an empty ring. */
function Tick({ on, accent }: { on: boolean; accent: string }) {
  return (
    <span
      aria-hidden="true"
      style={on ? { color: accent } : undefined}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${on ? "bg-white" : "border-2 border-white/60"}`}
    >
      {on && <Check className="size-4" strokeWidth={3} />}
    </span>
  );
}

/**
 * The mock-up's line drawings (static, white), one per door. Decorative: the
 * door's title and text say what it is.
 */
function DoorDrawing({ audience }: { audience: RequestAudience }) {
  const common = { viewBox: "0 0 190 150", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "h-auto w-full sm:h-full", "aria-hidden": true };
  if (audience === "donee") {
    return (
      <svg {...common}>
        <circle cx="122" cy="44" r="18" /><path d="M84 128c0-26 17-44 38-44s38 18 38 44" />
        <path d="M18 104h40l14-12h24" /><rect x="58" y="82" width="26" height="22" rx="4" />
        <path d="M18 120h50c10 0 18-4 26-10" />
        <path d="M104 18c-3-5-11-3-9 3 1 4 9 9 9 9s8-5 9-9c2-6-6-8-9-3z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (audience === "ngo") {
    return (
      <svg {...common}>
        <path d="M48 124V64l47-38 47 38v60" /><path d="M80 124V96h30v28" /><path d="M36 72l59-48 59 48" />
        <circle cx="22" cy="98" r="9" /><path d="M8 126c0-10 6-17 14-17s14 7 14 17" />
        <circle cx="168" cy="98" r="9" /><path d="M154 126c0-10 6-17 14-17s14 7 14 17" />
        <path d="M95 52c-3-5-11-3-9 3 1 4 9 9 9 9s8-5 9-9c2-6-6-8-9-3z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="48" cy="48" r="16" /><path d="M20 120c0-18 12-32 28-32s28 14 28 32" />
      <circle cx="96" cy="58" r="12" /><path d="M76 120c2-14 10-24 20-24s18 10 20 24" />
      <path d="M126 120V80l24-20 24 20v40z" /><path d="M142 120v-18h16v18" />
      <path d="M150 34c-4-6-14-4-12 4 1 5 12 12 12 12s11-7 12-12c2-8-8-10-12-4z" fill="currentColor" stroke="none" />
      <path d="M10 130h170" />
    </svg>
  );
}
