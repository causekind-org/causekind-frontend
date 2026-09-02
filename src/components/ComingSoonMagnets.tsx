"use client";

import { createPortal } from "react-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import { MousePointerClick } from "lucide-react";

const TERRACOTTA = "#b04a15";
const COPPER     = "#e07b3a";
const INK        = "#1e3a60";
const GOLD       = "#f0b97a";
const CREAM      = "#faf8f5";

function TapeAccent({ color }: { color: string }) {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
      width: "48px", height: "22px", background: color, opacity: 0.55,
      borderRadius: "3px", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", zIndex: 10,
    }} />
  );
}

function Stamp() {
  return (
    <div aria-label="Coming Soon" style={{
      position: "absolute", top: "18px", right: "14px",
      border: `2.5px solid ${GOLD}`, borderRadius: "6px", padding: "3px 8px",
      transform: "rotate(12deg)", color: GOLD, fontFamily: "monospace",
      fontSize: "var(--text-3xs)", fontWeight: 900, letterSpacing: "0.15em",
      textTransform: "uppercase" as const, lineHeight: 1.2,
      userSelect: "none" as const, opacity: 0.9, whiteSpace: "nowrap" as const,
      boxShadow: `0 0 0 1px ${GOLD}44 inset`,
    }}>
      COMING<br />SOON
    </div>
  );
}

function PosterFace({ gradient, title, Illustration }: { gradient: string; title: string; Illustration: React.ComponentType }) {
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%", background: gradient,
      borderRadius: "inherit", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "var(--ck-poster-gap, 8px)",
      padding: "var(--ck-poster-pad, 24px 16px 20px)", overflow: "hidden",
    }}>
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <Stamp />
      {/* Same bespoke line-art scene shown inside the modal — a real illustration
          rather than a stock heart glyph floating in a colored square. */}
      <div style={{ width: "var(--ck-illo-w, 104px)", height: "var(--ck-illo-h, 78px)", opacity: 0.95 }}>
        <Illustration />
      </div>
      <p style={{
        margin: 0, color: CREAM, fontWeight: 800,
        fontSize: "var(--ck-poster-title, clamp(0.9375rem, 0.875rem + 0.3125vw, 1.125rem))", textAlign: "center" as const,
        lineHeight: 1.25, letterSpacing: "-0.01em",
        textShadow: "0 1px 4px rgba(0,0,0,0.35)", zIndex: 1,
      }}>{title}</p>
      <p style={{
        margin: 0, color: GOLD, fontWeight: 700, fontSize: "var(--text-4xs)",
        letterSpacing: "0.2em", textTransform: "uppercase" as const, zIndex: 1,
        display: "var(--ck-poster-brand, block)",
      }}>CauseKind</p>
    </div>
  );
}

/* ─── SVG illustrations ──────────────────────────────────────────────────── */
function FundraisingIllustration() {
  return (
    <svg viewBox="0 0 240 180" fill="none" style={{ width: "100%", height: "100%" }}>
      <ellipse cx="120" cy="95" rx="95" ry="70" fill={`${TERRACOTTA}10`} />
      <rect x="44" y="118" width="30" height="42" rx="4" fill={`${TERRACOTTA}38`} />
      <rect x="90" y="88"  width="30" height="72" rx="4" fill={`${TERRACOTTA}60`} />
      <rect x="136" y="54" width="30" height="106" rx="4" fill={TERRACOTTA} />
      <polyline points="59,112 105,80 151,48" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="59"  cy="112" r="5" fill={GOLD} />
      <circle cx="105" cy="80"  r="5" fill={GOLD} />
      <circle cx="151" cy="48"  r="5" fill={GOLD} />
      <path d="M174 40 L182 30 L190 40" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="182" y1="30" x2="182" y2="56" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="52" r="20" fill={`${GOLD}22`} stroke={GOLD} strokeWidth="1.5" />
      <circle cx="36" cy="52" r="12" fill={`${GOLD}15`} stroke={GOLD} strokeWidth="1" strokeDasharray="3 2" />
      <path d="M36 44v16M33 47h6a2 2 0 010 4h-4a2 2 0 000 4h6" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OnlineDonationsIllustration() {
  return (
    <svg viewBox="0 0 240 180" fill="none" style={{ width: "100%", height: "100%" }}>
      <ellipse cx="120" cy="90" rx="90" ry="70" fill={`${INK}0d`} />
      <rect x="80" y="26" width="60" height="108" rx="12" fill={`${INK}18`} stroke={INK} strokeWidth="2" />
      <rect x="88" y="40" width="44" height="62" rx="5" fill={`${INK}25`} />
      <path d="M110 78 C110 78 98 69 98 61 C98 57 101 54 105 54 C107 54 110 57 110 57 C110 57 113 54 115 54 C119 54 122 57 122 61 C122 69 110 78 110 78Z" fill={TERRACOTTA} />
      <path d="M104 63 L109 68 L117 58" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="110" cy="121" r="6" fill={`${INK}30`} stroke={INK} strokeWidth="1" />
      <path d="M150 66 Q164 90 150 114" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M160 57 Q178 90 160 123" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="55" cy="68" r="18" fill={`${GOLD}22`} stroke={GOLD} strokeWidth="1.5" />
      <path d="M55 60v16M52 63h6a2 2 0 010 4h-4a2 2 0 000 4h6" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CSRIllustration() {
  return (
    <svg viewBox="0 0 240 180" fill="none" style={{ width: "100%", height: "100%" }}>
      <ellipse cx="120" cy="95" rx="95" ry="68" fill="#14532d0a" />
      <rect x="20" y="60" width="54" height="100" rx="5" fill="#14532d1a" stroke="#14532d" strokeWidth="1.5" />
      <rect x="29" y="70" width="14" height="13" rx="2" fill="#14532d45" />
      <rect x="51" y="70" width="14" height="13" rx="2" fill="#14532d45" />
      <rect x="29" y="92" width="14" height="13" rx="2" fill="#14532d45" />
      <rect x="51" y="92" width="14" height="13" rx="2" fill="#14532d45" />
      <rect x="36" y="128" width="22" height="32" rx="2" fill="#14532d35" />
      <rect x="166" y="60" width="54" height="100" rx="5" fill={`${INK}18`} stroke={INK} strokeWidth="1.5" />
      <rect x="175" y="70" width="14" height="13" rx="2" fill={`${INK}45`} />
      <rect x="197" y="70" width="14" height="13" rx="2" fill={`${INK}45`} />
      <rect x="175" y="92" width="14" height="13" rx="2" fill={`${INK}45`} />
      <rect x="197" y="92" width="14" height="13" rx="2" fill={`${INK}45`} />
      <rect x="182" y="128" width="22" height="32" rx="2" fill={`${INK}35`} />
      <circle cx="120" cy="102" r="32" fill="white" opacity="0.94" />
      <path d="M104 106 C104 106 109 99 114 101 L120 104 L126 101 C131 99 136 106 136 106" stroke={TERRACOTTA} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M102 110 L115 105 L125 105 L138 110" stroke={TERRACOTTA} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="120" cy="26" rx="20" ry="15" fill="#15803d45" />
      <ellipse cx="106" cy="33" rx="14" ry="11" fill="#15803d65" />
      <ellipse cx="134" cy="33" rx="14" ry="11" fill="#15803d65" />
      <line x1="120" y1="42" x2="120" y2="62" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Card details ───────────────────────────────────────────────────────── */
const CARD_DETAILS = [
  {
    tagline: "Raise funds for causes that matter",
    description: "Create admin-verified fundraising campaigns for education, medical emergencies, disaster relief, and more. Set a transparent target and watch the community rally.",
    bullets: [
      "Every campaign admin-verified before going live",
      "Real-time donation tracking & progress dashboard",
      "Automatic impact reports for every donor",
      "0% platform fee — every rupee reaches the cause",
    ],
    accent: TERRACOTTA,
    Illustration: FundraisingIllustration,
  },
  {
    tagline: "Give money, know exactly where it goes",
    description: "Send donations directly to verified campaigns via UPI, cards, or net banking. Every transaction is traceable, and you receive a digital receipt for each donation.",
    bullets: [
      "UPI, debit/credit cards, net banking supported",
      "Instant digital receipts and 80G certificates",
      "Full donation history and impact timeline",
      "Secure, encrypted payment processing",
    ],
    accent: INK,
    Illustration: OnlineDonationsIllustration,
  },
  {
    tagline: "Corporate giving with measurable impact",
    description: "Partner with CauseKind to align your CSR budget with verified on-ground projects. Transparent reporting, tax-compliant certificates, real community outcomes.",
    bullets: [
      "Curated projects matching your CSR mandate",
      "Section 80G compliant tax certificates",
      "Custom impact dashboards for compliance",
      "Dedicated CSR account manager",
    ],
    accent: "#15803d",
    Illustration: CSRIllustration,
  },
];

/* ─── Card definitions ───────────────────────────────────────────────────── */
interface CardDef {
  title: string;
  gradient: string;
  tapeColor: string;
  baseRotation: number;
  /** How far down this card hangs, in multiples of `--ck-stagger`. */
  stagger: number;
  floatDelay: string;
}

const CARDS: CardDef[] = [
  { title: "Fundraising Campaigns", gradient: `linear-gradient(145deg, ${TERRACOTTA} 0%, ${COPPER} 100%)`,          tapeColor: CREAM, baseRotation: -5,   stagger: 0,   floatDelay: "0s"   },
  { title: "Online Donations",      gradient: `linear-gradient(145deg, ${INK} 0%, ${TERRACOTTA} 100%)`,             tapeColor: GOLD,  baseRotation:  4,   stagger: 1.5, floatDelay: "1.4s" },
  { title: "CSR Partnerships",      gradient: `linear-gradient(145deg, #14532d 0%, #166534 45%, #15803d 100%)`,     tapeColor: GOLD,  baseRotation: -2.5, stagger: 0.6, floatDelay: "2.6s" },
];

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function CardModal({ cardIdx, startRect, onClose }: {
  cardIdx: number;
  startRect: DOMRect;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const card   = CARDS[cardIdx];
  const detail = CARD_DETAILS[cardIdx];
  const { Illustration } = detail;

  const startX = startRect.left + startRect.width  / 2 - window.innerWidth  / 2;
  const startY = startRect.top  + startRect.height / 2 - window.innerHeight / 2;

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 360);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  return createPortal(
    <>
      {/* Backdrop.
          This closes on click, and that is correct — but it is only safe
          because the card opens from its own `click` handler. A tap's
          compatibility click is dispatched after `pointerup`, so a card that
          opened on `pointerup` mounted this element under the finger in time
          for that trailing click to land here and close it again. See the
          activation comment in MagnetCard. */}
      <div
        className="ck-modal-backdrop"
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(5,3,1,0.80)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          animation: closing ? "ck-bd-out 0.36s ease forwards" : "ck-bd-in 0.3s ease forwards",
        }}
      />

      {/* Split modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        className="ck-modal-split"
        style={{
          position: "fixed", top: "50%", left: "50%", zIndex: 9999,
          width: "min(720px, 95vw)", maxHeight: "88vh",
          borderRadius: "22px", overflow: "hidden",
          display: "flex",
          boxShadow: [
            "0 56px 120px rgba(0,0,0,0.58)",
            "0 12px 40px rgba(0,0,0,0.32)",
            "0 0 0 1px rgba(255,255,255,0.07)",
          ].join(", "),
          ["--sx" as string]: `${startX}px`,
          ["--sy" as string]: `${startY}px`,
          animation: closing
            ? "ck-modal-out 0.36s cubic-bezier(0.4,0,1,1) forwards"
            : "ck-modal-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        } as React.CSSProperties}
      >
        {/* ── LEFT — gradient illustration panel ── */}
        <div
          className="ck-modal-left"
          style={{
            width: "42%", flexShrink: 0,
            background: card.gradient,
            padding: "28px 22px 28px 28px",
            display: "flex", flexDirection: "column",
            justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Radial highlight */}
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.18) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          {/* Bottom vignette */}
          <div aria-hidden style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(to top, rgba(0,0,0,0.25), transparent)",
            pointerEvents: "none",
          }} />

          {/* Coming Soon pill */}
          <div style={{
            zIndex: 1, alignSelf: "flex-start",
            padding: "5px 13px", borderRadius: "20px",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(8px)",
            color: GOLD, fontSize: "var(--text-4xs)", fontWeight: 900,
            letterSpacing: "0.22em", textTransform: "uppercase" as const,
          }}>Coming Soon</div>

          {/* Illustration. The SVG is width/height 100% on a 240x180 viewBox, so
              once the panel goes full-width on a phone it self-sizes to ~240px
              tall and dominates the sheet — the mobile rules cap this wrapper,
              and the viewBox's default "meet" keeps it centred inside the cap. */}
          <div className="ck-modal-illo" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, padding: "12px 0" }}>
            <Illustration />
          </div>

          {/* Card title */}
          <p style={{
            zIndex: 1, margin: 0,
            color: "rgba(255,255,255,0.92)", fontSize: "var(--text-lg)",
            fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.02em",
            textShadow: "0 1px 6px rgba(0,0,0,0.35)",
          }}>{card.title}</p>
        </div>

        {/* ── RIGHT — content panel ── */}
        <div
          className="ck-modal-right"
          style={{
            flex: 1, background: CREAM,
            padding: "32px 32px 32px 28px",
            display: "flex", flexDirection: "column",
            gap: "0", overflowY: "auto",
            position: "relative",
          }}
        >
          {/* Tag. Right padding keeps a long tagline clear of the close button,
              which overlays this corner on desktop. */}
          <p style={{
            margin: "0 0 6px", paddingRight: "40px",
            fontSize: "var(--text-3xs)", fontWeight: 900,
            letterSpacing: "0.16em", textTransform: "uppercase" as const,
            color: detail.accent,
          }}>{detail.tagline}</p>

          {/* Heading */}
          <h3 style={{
            margin: "0 0 10px", paddingRight: "40px",
            fontSize: "var(--text-2xl)", fontWeight: 800,
            color: "#1c1917", letterSpacing: "-0.025em", lineHeight: 1.2,
          }}>{card.title}</h3>

          {/* Divider */}
          <div style={{ height: "1px", background: `${detail.accent}20`, margin: "0 0 14px" }} />

          {/* Description */}
          <p style={{
            margin: "0 0 18px", fontSize: "var(--text-sm)", color: "#57534e", lineHeight: 1.7,
          }}>{detail.description}</p>

          {/* Bullets */}
          <ul style={{ margin: "0 0 auto", padding: 0, listStyle: "none", display: "flex", flexDirection: "column" as const, gap: "9px" }}>
            {detail.bullets.map((b) => (
              <li key={b} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                fontSize: "var(--text-sm)", color: "#44403c", lineHeight: 1.5,
              }}>
                <span style={{
                  flexShrink: 0, marginTop: "2px",
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: `${detail.accent}18`, color: detail.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--text-3xs)", fontWeight: 900,
                }}>✓</span>
                {b}
              </li>
            ))}
          </ul>

          {/* Notify badge */}
          <div style={{
            marginTop: "22px", padding: "11px 14px", borderRadius: "12px",
            background: `${detail.accent}0d`,
            border: `1px solid ${detail.accent}25`,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "var(--text-sm)" }}>🔔</span>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 700, color: detail.accent, lineHeight: 1.4 }}>
              We're building this now — follow CauseKind for early access.
            </p>
          </div>
        </div>

        {/* Close button — pinned to the CARD's corner, not the content panel.
            It used to live inside .ck-modal-right, which is overflow-y:auto, so
            it scrolled away with the text and collided with a long tagline. As a
            child of the split it stays put; once stacked on mobile that corner is
            the green panel, clear of any copy. Styled to read on both surfaces. */}
        <button
          onClick={close}
          aria-label="Close"
          className="ck-modal-close"
          style={{
            position: "absolute", top: "12px", right: "12px", zIndex: 5,
            width: "32px", height: "32px", borderRadius: "50%",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            cursor: "pointer", color: "#57534e",
            fontSize: "var(--text-xl)", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s ease, transform 0.15s ease",
          }}
        >×</button>
      </div>
    </>,
    document.body
  );
}

/* ─── MagnetCard ─────────────────────────────────────────────────────────── */
/** Movement past this many px makes the gesture a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 6;

function MagnetCard({ card, idx, reducedMotion, sectionRef, onOpen }: {
  card: CardDef;
  idx: number;
  reducedMotion: boolean;
  sectionRef: React.RefObject<HTMLElement | null>;
  onOpen: (rect: DOMRect) => void;
}) {
  const wrapRef = useRef<HTMLButtonElement>(null);

  const dragging          = useRef(false);
  const dragStart         = useRef({ x: 0, y: 0 });
  const dragOffset        = useRef({ x: 0, y: 0 });
  const accumulatedOffset = useRef({ x: 0, y: 0 });
  /**
   * Set once a drag passes the threshold, and read by the click handler: a
   * mouse drag still ends in a `click`, and that click must not be mistaken
   * for a tap on the card.
   */
  const draggedPastThreshold = useRef(false);
  const releaseTimer         = useRef<number | null>(null);

  const [tilt,        setTilt]        = useState({ rx: 0, ry: 0 });
  const [isHover,     setIsHover]     = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const [dragPos,     setDragPos]     = useState({ x: 0, y: 0 });
  const [isReleasing, setIsReleasing] = useState(false);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragging.current) {
      if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) >= DRAG_THRESHOLD_PX) {
        draggedPastThreshold.current = true;
      }
      let dx = e.clientX - dragStart.current.x + accumulatedOffset.current.x;
      let dy = e.clientY - dragStart.current.y + accumulatedOffset.current.y;
      if (wrapRef.current && sectionRef.current) {
        const cR = wrapRef.current.getBoundingClientRect();
        const sR = sectionRef.current.getBoundingClientRect();
        const bL = cR.left - dragOffset.current.x;
        const bT = cR.top  - dragOffset.current.y;
        dx = Math.min(Math.max(dx, sR.left  - bL), sR.right  - bL - cR.width);
        dy = Math.min(Math.max(dy, sR.top   - bT), sR.bottom - bT - cR.height);
      }
      dragOffset.current = { x: dx, y: dy };
      setDragPos({ x: dx, y: dy });
      return;
    }
    if (!wrapRef.current || reducedMotion || e.pointerType !== "mouse") return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTilt({
      rx: ((e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2)) * -12,
      ry: ((e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2)) *  12,
    });
  }, [reducedMotion, sectionRef]);

  const handlePointerEnter = useCallback(() => setIsHover(true), []);
  const handlePointerLeave = useCallback(() => { setIsHover(false); setTilt({ rx: 0, ry: 0 }); }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    // Dragging and tilting are desktop affordances only. Claiming a touch
    // pointer here would mean owning the whole gesture — the card would have
    // to keep `touch-action: none`, and a swipe that happened to start on a
    // card could no longer scroll the page. On touch this element is purely a
    // tap target, which is also what makes its activation reliable.
    if (e.pointerType !== "mouse") return;
    dragging.current = true;
    draggedPastThreshold.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setIsReleasing(false);
    // Optional: jsdom and older engines ship no pointer capture. Losing it
    // costs only the drag, so it must never throw and take the tap with it.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  /**
   * Ends a drag. Deliberately does NOT open the modal.
   *
   * <p>Opening from `pointerup` is what made an edge tap unreliable: mobile
   * browsers dispatch the gesture's compatibility `click` afterwards, and by
   * then the modal's full-screen backdrop had already mounted. A tap near the
   * middle of a card sent that trailing click into the centred dialog and it
   * stayed open; a tap near an edge sent it to the backdrop, whose `onClick`
   * closed the dialog that had just opened. Activation lives in `handleClick`
   * for that reason — see the comment there.
   */
  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    setIsReleasing(true);
    accumulatedOffset.current = { x: dragOffset.current.x, y: dragOffset.current.y };
    if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => setIsReleasing(false), 500);
  }, []);

  // The release timer used to be "cleaned up" by returning a function from the
  // pointerup handler, which React never calls — so a card unmounted mid-spring
  // left a timer to fire into a dead component.
  useEffect(() => () => {
    if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current);
  }, []);

  /**
   * The single activation path for a card.
   *
   * <p>A `click` is the end of the gesture, not the middle of it: nothing
   * follows it that could reach the backdrop this handler is about to mount.
   * That is the whole fix — no delay, no debounce, no temporarily inert
   * backdrop, just the event that browsers already guarantee fires exactly
   * once per tap, on the element the user actually touched.
   */
  const handleClick = useCallback(() => {
    if (draggedPastThreshold.current) {
      // The click that terminates a mouse drag is not a tap on the card.
      draggedPastThreshold.current = false;
      return;
    }
    if (wrapRef.current) onOpen(wrapRef.current.getBoundingClientRect());
  }, [onOpen]);

  const floatAnim = !reducedMotion && !isHover && !isDragging
    ? `ck-float ${card.floatDelay === "0s" ? "3.6s" : "3.8s"} ease-in-out ${card.floatDelay} infinite`
    : "none";

  const perspective    = "perspective(700px)";
  const baseRot        = `rotate(${isDragging ? 0 : card.baseRotation}deg)`;
  const tiltRot        = isHover && !isDragging && !reducedMotion ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : "";
  const translateDrag  = `translate(${dragPos.x}px, ${dragPos.y}px)`;
  const transform      = [perspective, translateDrag, baseRot, tiltRot].filter(Boolean).join(" ");
  const transition     = isDragging
    ? "box-shadow 0.15s ease"
    : isReleasing
    ? "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease"
    : "transform 0.18s ease, box-shadow 0.18s ease";
  const shadow = isDragging
    ? "0 28px 56px rgba(0,0,0,0.38), 0 8px 16px rgba(0,0,0,0.22)"
    : isHover
    ? "0 18px 40px rgba(0,0,0,0.28), 0 4px 10px rgba(0,0,0,0.15)"
    : "0 6px 18px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)";

  return (
    <button
      type="button"
      ref={wrapRef}
      className="ck-magnet-card"
      // The accessible name is set explicitly rather than left to the poster's
      // own text, which would read out "COMING SOON … CauseKind" from the
      // stamp and the brand line on every card.
      aria-label={`${card.title} — coming soon`}
      aria-haspopup="dialog"
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        // Button reset. This element is the transformed card root, so it has
        // to lay out exactly as the div it replaced — the browser's default
        // padding, border, centred text and inherited-font opt-out would all
        // shift the poster inside it.
        appearance: "none", padding: 0, border: 0, background: "transparent",
        font: "inherit", color: "inherit", textAlign: "inherit", display: "block",
        // No grey flash on tap; the card has its own press feedback.
        WebkitTapHighlightColor: "transparent",
        position: "relative", width: "var(--ck-card-w, 220px)", height: "var(--ck-card-h, 280px)", flexShrink: 0,
        marginTop: `calc(var(--ck-card-mt, 20px) + ${card.stagger} * var(--ck-stagger, 26px))`,
        // Real overlap, which a flex `gap` cannot express — the smallest a gap
        // can be is 0, so only a negative margin puts one card ON another.
        marginLeft: idx === 0 ? 0 : "calc(-1 * var(--ck-magnet-overlap, 36px))",
        cursor: isDragging ? "grabbing" : "grab",
        // `manipulation`, not `none`: touch no longer starts a drag, so the
        // page must stay scrollable from a swipe that begins on a card. It
        // also drops the legacy double-tap delay before the click fires.
        userSelect: "none", touchAction: "manipulation",
        zIndex: isDragging ? 20 : 1,
        animation: floatAnim, transform, transition, boxShadow: shadow,
        borderRadius: "14px", willChange: "transform",
        ["--ck-base-transform" as string]: `${perspective} ${translateDrag} rotate(${card.baseRotation}deg)`,
      } as React.CSSProperties}
    >
      <TapeAccent color={card.tapeColor} />
      <div style={{ width: "100%", height: "100%", borderRadius: "14px", overflow: "hidden", border: "2px solid rgba(255,255,255,0.18)" }}>
        <PosterFace gradient={card.gradient} title={card.title} Illustration={CARD_DETAILS[idx].Illustration} />
      </div>
    </button>
  );
}

/* ─── Main section ───────────────────────────────────────────────────────── */
export function ComingSoonMagnets() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [modal, setModal] = useState<{ idx: number; rect: DOMRect } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="ck-magnets relative w-full bg-[#faf8f5] dark:bg-zinc-950 overflow-hidden"
      style={{ padding: "var(--ck-magnets-pad, 80px 24px 96px)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ck-float {
          0%   { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
          50%  { transform: var(--ck-base-transform, rotate(-3deg)) translateY(-10px) rotate(0.5deg); }
          100% { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
        }
        /* The card is a real button now, so it can be tabbed to and opened
           with Enter or Space. Offset outside the rotated poster rather than
           on it, where the card's own border swallows a 2px ring. */
        .ck-magnet-card:focus-visible {
          outline: 3px solid ${TERRACOTTA};
          outline-offset: 4px;
          border-radius: 16px;
        }
        @keyframes ck-bd-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ck-bd-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes ck-modal-in {
          from {
            opacity: 0;
            transform: translate(calc(-50% + var(--sx, 0px)), calc(-50% + var(--sy, 0px)))
                       perspective(1100px) rotateY(720deg) scale(0.1);
          }
          60% { opacity: 1; }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(1100px) rotateY(0deg) scale(1);
          }
        }
        @keyframes ck-modal-out {
          from { opacity: 1; transform: translate(-50%, -50%) perspective(1100px) rotateY(0deg) scale(1); }
          to   { opacity: 0; transform: translate(-50%, -50%) perspective(1100px) rotateY(-80deg) scale(0.75); }
        }
        /* Phone-first base: three cards overlapping in one row, hanging at
           staggered depths. This is the layout the mobile pass introduced, and
           it is the right one on a narrow screen — three cards cannot go two-up
           without orphaning the third, so they tuck into each other rather than
           stacking into three screens of scrolling. */
        .ck-magnet-row { align-items: flex-start; gap: 0; }

        /* Laptops and up get the original spread back.
           The overlap-and-stagger fan was collateral from a mobile fix: it
           replaced "sm:flex-row items-center" plus a clamp gap with an
           always-on negative margin, so a layout designed to save horizontal
           room on a 390px phone also applied at 1440px, where there is no room
           to save and the cards simply covered each other.
           Zeroing the two vars is enough to undo it — the cards' own inline
           styles already read overlap and stagger through them, so nothing here
           has to restate the geometry. 641px, not Tailwind's sm, so this
           exactly complements the max-width:640px tier below and no width
           matches both.
           (No backticks in this comment: the whole block is a JS template
           literal, and one would end the string.) */
        @media (min-width: 641px) {
          .ck-magnets { --ck-magnet-overlap: 0px; --ck-stagger: 0px; }
          .ck-magnet-row { align-items: center; gap: clamp(48px, 7vw, 110px); }
        }

        /* Every hardcoded px size in this section is expressed as a var so the
           mobile step is defined ONCE here instead of being threaded through a
           dozen inline styles. */
        @media (max-width: 640px) {
          .ck-magnets {
            --ck-magnets-pad: 40px 16px 48px;
            --ck-card-w: 132px;  --ck-card-h: 168px;  --ck-card-mt: 12px;
            --ck-stagger: 14px;
            /* 3x132 - 2x26 = 344px, inside a 390px phone's 358px content box. */
            --ck-magnet-overlap: 26px;
            --ck-poster-pad: 14px 8px 12px;  --ck-poster-gap: 5px;
            --ck-illo-w: 62px;   --ck-illo-h: 47px;
            --ck-poster-title: 11px;
          }
        }
        /* 3x132 + 2x10 = 416px, wider than a 390px phone's content box — so the
           smallest tier shrinks again rather than overflowing. */
        /* 380, not 400: a 390px phone now clears the tier above, so it gets the
           larger 132px cards instead of the cramped ones. The overlap is what
           buys that room back. */
        @media (max-width: 380px) {
          .ck-magnets {
            --ck-card-w: 108px;  --ck-card-h: 138px;
            --ck-stagger: 9px;
            /* 3x108 - 2x22 = 280px, inside a 320px phone's 288px content box. */
            --ck-magnet-overlap: 22px;
            --ck-illo-w: 50px;   --ck-illo-h: 38px;
            --ck-poster-title: 10px;
            --ck-poster-brand: none;
          }
        }
        /* Stacked on phones. The base 95vw/88vh leaves ~10px of backdrop either
           side and eats almost the whole viewport, so the sheet reads as glued
           to the screen rather than floating above it — pull both in and shrink
           the illustration panel, which is the tallest fixed cost once stacked. */
        @media (max-width: 580px) {
          .ck-modal-split {
            flex-direction: column !important;
            width: 88vw !important;
            max-width: 400px !important;
            max-height: 76vh !important;
            border-radius: 18px !important;
          }
          .ck-modal-left  { width: 100% !important; min-height: 0 !important; flex: none !important; padding: 16px 18px 14px !important; }
          .ck-modal-illo  { height: 84px !important; flex: none !important; padding: 8px 0 !important; }
          .ck-modal-right { padding: 22px 18px 24px !important; }
        }
        @media (max-width: 380px) {
          .ck-modal-split { width: 90vw !important; max-height: 72vh !important; }
          .ck-modal-left  { padding: 13px 14px 11px !important; }
          .ck-modal-illo  { height: 68px !important; }
          .ck-modal-right { padding: 18px 15px 20px !important; }
        }
        @keyframes ck-blob-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(70px, -45px) scale(1.18); }
        }
        @keyframes ck-blob-b {
          0%, 100% { transform: translate(0, 0) scale(1.1); }
          50%      { transform: translate(-60px, 50px) scale(0.92); }
        }
        @keyframes ck-blob-c {
          0%, 100% { transform: translate(0, 0) scale(0.95); }
          50%      { transform: translate(45px, 60px) scale(1.15); }
        }
        @keyframes ck-spark-rise {
          0%   { transform: translateY(0) scale(1);        opacity: 0;   }
          12%  { opacity: 0.55; }
          80%  { opacity: 0.35; }
          100% { transform: translateY(-560px) scale(0.6); opacity: 0;   }
        }
        @keyframes ck-hint-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ck-hint-bob {
          0%, 100% { transform: translateY(0);   }
          50%      { transform: translateY(-4px); }
        }
        @keyframes ck-hint-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1;    }
        }
      ` }} />

      {/* Ambient background — soft drifting glows + slow rising sparks */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-140px", left: "-100px", width: "440px", height: "440px",
          borderRadius: "50%", background: `radial-gradient(circle, ${COPPER}30 0%, transparent 70%)`,
          filter: "blur(48px)", willChange: "transform",
          animation: reducedMotion ? "none" : "ck-blob-a 22s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "-140px", width: "480px", height: "480px",
          borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}2e 0%, transparent 70%)`,
          filter: "blur(52px)", willChange: "transform",
          animation: reducedMotion ? "none" : "ck-blob-b 26s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "-160px", left: "30%", width: "420px", height: "420px",
          borderRadius: "50%", background: `radial-gradient(circle, ${INK}22 0%, transparent 70%)`,
          filter: "blur(48px)", willChange: "transform",
          animation: reducedMotion ? "none" : "ck-blob-c 24s ease-in-out infinite",
        }} />
        {!reducedMotion && [
          { left: "10%", size: 6, delay: "0s",  dur: "13s", color: GOLD },
          { left: "24%", size: 4, delay: "4s",  dur: "16s", color: TERRACOTTA },
          { left: "46%", size: 5, delay: "8s",  dur: "14s", color: COPPER },
          { left: "65%", size: 4, delay: "2s",  dur: "17s", color: GOLD },
          { left: "81%", size: 6, delay: "6s",  dur: "15s", color: TERRACOTTA },
          { left: "92%", size: 4, delay: "10s", dur: "18s", color: COPPER },
        ].map((s, i) => (
          <span key={i} style={{
            position: "absolute", bottom: "-10px", left: s.left,
            width: `${s.size}px`, height: `${s.size}px`, borderRadius: "50%",
            background: s.color, opacity: 0, willChange: "transform, opacity",
            animation: `ck-spark-rise ${s.dur} linear ${s.delay} infinite`,
          }} />
        ))}
      </div>

      <div className="text-center mb-12 relative z-[1]">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
          style={{ background: `${TERRACOTTA}18`, color: TERRACOTTA }}
        >
          On the way
        </span>
        <h2
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100"
          style={{ lineHeight: 1.2 }}
        >
          More ways to give —{" "}
          <span style={{ color: TERRACOTTA }}>coming soon</span>
        </h2>
        <p className="mt-3 text-stone-500 dark:text-stone-400 text-base max-w-md mx-auto leading-relaxed">
          CauseKind launches with verified in-kind giving. Monetary features
          arrive next — grab a card and hold on.
        </p>
      </div>

      {/* Alignment and gap live in the stylesheet above, so the phone and
          laptop cases sit next to each other and can be reasoned about
          together. A sm:items-center here would put half that decision in the
          markup and half in the stylesheet. */}
      <div className="ck-magnet-row flex flex-row justify-center">
        {CARDS.map((card, i) => (
          <MagnetCard
            key={card.title}
            card={card}
            idx={i}
            reducedMotion={reducedMotion}
            sectionRef={sectionRef}
            onOpen={(rect) => setModal({ idx: i, rect })}
          />
        ))}
      </div>

      {/* Click hint — always visible, gentle pulse */}
      <div
        className="flex items-center justify-center gap-2 mt-10 select-none pointer-events-none relative z-[1]"
        style={{ animation: "ck-hint-enter 0.6s ease 0.5s both" }}
      >
        <span
          style={{
            display: "inline-flex", alignItems: "center",
            animation: "ck-hint-bob 1.2s ease-in-out infinite",
          }}
        >
          <MousePointerClick style={{ width: 15, height: 15, color: TERRACOTTA }} />
        </span>
        <span
          style={{
            fontSize: "var(--text-2xs)", fontWeight: 700, color: "#a8a29e",
            letterSpacing: "0.14em", textTransform: "uppercase" as const,
            animation: "ck-hint-pulse 2.4s ease-in-out infinite 1s",
          }}
        >
          Tap any card to explore
        </span>
      </div>

      {modal && (
        <CardModal
          cardIdx={modal.idx}
          startRect={modal.rect}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}
