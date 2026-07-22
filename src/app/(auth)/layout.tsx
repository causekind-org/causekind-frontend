"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthDotGrid } from "@/components/AuthDotGrid";

/* ── Shared auth shell for /login and /register ──────────────────────────────
   One persistent layout so the illustration panel is a single element that
   physically swaps sides (left ↔ right) via Framer Motion's `layout` reflow
   animation when the route toggles between the two pages, crossfading its
   own image/quote content mid-swap. The very first time a visitor lands in
   this route group (from anywhere else on the site) the panel additionally
   slides in from off-screen — that only happens on this layout's own mount,
   which Next.js preserves across /login ⇄ /register but re-triggers on a
   fresh entry from outside the group, so no extra tracking state is needed.
   The form-side card gets its own 3D tilt-and-rise entrance every time the
   route (and therefore its content) changes, via AnimatePresence keyed on
   the pathname. ── */

const PANEL_CONTENT: Record<"login" | "register", {
  image: string; quote: string; author: string;
}> = {
  login: {
    image: "/login-illustration.png",
    quote: "The smallest act of kindness is worth more than the grandest intention.",
    author: "Oscar Wilde",
  },
  register: {
    image: "/signup-illustration.jpg",
    quote: "No one has ever become poor by giving.",
    author: "Anne Frank",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const variant: "login" | "register" = pathname?.startsWith("/register") ? "register" : "login";
  const content = PANEL_CONTENT[variant];
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-[calc(100svh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">
      {/* ── Illustration panel — one persistent element, reorders across the row ── */}
      <motion.div
        layout
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
        initial={reduceMotion ? false : { x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          order: variant === "register" ? 2 : 1,
          borderRight: variant === "register" ? "none" : "1px solid #2a1f14",
          borderLeft: variant === "register" ? "1px solid #2a1f14" : "none",
        }}
        className="hidden lg:flex lg:w-[40%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] shrink-0"
      >
        <div className="relative z-10 flex items-center gap-2 mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1">
            Verified In-Kind
          </span>
        </div>

        {/* mode="wait" — this block sits in normal flex flow (not absolutely
            positioned like the illustration below), so the outgoing and
            incoming quote must not overlap mid-crossfade. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={variant}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 space-y-6"
          >
            <blockquote className="space-y-4">
              <p className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif">
                &ldquo;{content.quote}&rdquo;
              </p>
              <footer className="flex items-center gap-2">
                <span className="block h-px w-8 bg-[#e07b3a]" />
                <cite className="text-[#f0b97a] text-sm not-italic font-bold">{content.author}</cite>
              </footer>
            </blockquote>
          </motion.div>
        </AnimatePresence>

        {/* Illustration — crossfades to the other variant's image mid-swap */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence mode="sync">
            <motion.div
              key={content.image}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
              className="absolute inset-0"
            >
              <Image src={content.image} alt="" fill className="object-cover" priority />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#120c04] via-transparent to-[#120c04]" />
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India &middot; 2026
        </div>
      </motion.div>

      {/* ── Form panel — the page's own content, 3D tilt-and-rise on every entry ── */}
      <motion.div
        layout
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
        style={{ order: variant === "register" ? 1 : 2 }}
        className="flex flex-1 flex-col justify-between bg-[#faf8f5] dark:bg-zinc-950 px-6 py-8 lg:px-12 overflow-y-auto relative overflow-hidden"
      >
        {/* Interactive dot-grid — subtle texture behind the form card */}
        <AuthDotGrid />

        {/* Breathing warmth glows representing community light & hope */}
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-[#b04a15]/12 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-[#1e3a60]/10 blur-3xl pointer-events-none" />

        <div />

        <div className="w-full mx-auto relative z-10" style={{ perspective: 1400 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 36, rotateX: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -18, rotateX: 8, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400 dark:text-zinc-600">
          &copy; 2026 CauseKind
        </p>
      </motion.div>
    </div>
  );
}
