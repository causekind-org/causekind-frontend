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
      fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em",
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
      alignItems: "center", justifyContent: "center", gap: "8px",
      padding: "24px 16px 20px", overflow: "hidden",
    }}>
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <Stamp />
      {/* Same bespoke line-art scene shown inside the modal — a real illustration
          rather than a stock heart glyph floating in a colored square. */}
      <div style={{ width: "104px", height: "78px", opacity: 0.95 }}>
        <Illustration />
      </div>
      <p style={{
        margin: 0, color: CREAM, fontWeight: 800,
        fontSize: "clamp(15px, 4vw, 18px)", textAlign: "center" as const,
        lineHeight: 1.25, letterSpacing: "-0.01em",
        textShadow: "0 1px 4px rgba(0,0,0,0.35)", zIndex: 1,
      }}>{title}</p>
      <p style={{
        margin: 0, color: GOLD, fontWeight: 700, fontSize: "9px",
        letterSpacing: "0.2em", textTransform: "uppercase" as const, zIndex: 1,
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
  floatDelay: string;
}

const CARDS: CardDef[] = [
  { title: "Fundraising Campaigns", gradient: `linear-gradient(145deg, ${TERRACOTTA} 0%, ${COPPER} 100%)`,          tapeColor: CREAM, baseRotation: -3,   floatDelay: "0s"   },
  { title: "Online Donations",      gradient: `linear-gradient(145deg, ${INK} 0%, ${TERRACOTTA} 100%)`,             tapeColor: GOLD,  baseRotation:  2,   floatDelay: "1.4s" },
  { title: "CSR Partnerships",      gradient: `linear-gradient(145deg, #14532d 0%, #166534 45%, #15803d 100%)`,     tapeColor: GOLD,  baseRotation: -1.5, floatDelay: "2.6s" },
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
      {/* Backdrop */}
      <div
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
            color: GOLD, fontSize: "9px", fontWeight: 900,
            letterSpacing: "0.22em", textTransform: "uppercase" as const,
          }}>Coming Soon</div>

          {/* Illustration */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", zIndex: 1, padding: "12px 0" }}>
            <Illustration />
          </div>

          {/* Card title */}
          <p style={{
            zIndex: 1, margin: 0,
            color: "rgba(255,255,255,0.92)", fontSize: "18px",
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
          {/* Close button */}
          <button
            onClick={close}
            aria-label="Close"
            style={{
              position: "absolute", top: "16px", right: "16px",
              width: "30px", height: "30px", borderRadius: "50%",
              background: "rgba(0,0,0,0.07)", border: "none",
              cursor: "pointer", color: "#78716c", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >×</button>

          {/* Tag */}
          <p style={{
            margin: "0 0 6px", fontSize: "10px", fontWeight: 900,
            letterSpacing: "0.16em", textTransform: "uppercase" as const,
            color: detail.accent,
          }}>{detail.tagline}</p>

          {/* Heading */}
          <h3 style={{
            margin: "0 0 10px", fontSize: "23px", fontWeight: 800,
            color: "#1c1917", letterSpacing: "-0.025em", lineHeight: 1.2,
          }}>{card.title}</h3>

          {/* Divider */}
          <div style={{ height: "1px", background: `${detail.accent}20`, margin: "0 0 14px" }} />

          {/* Description */}
          <p style={{
            margin: "0 0 18px", fontSize: "13.5px", color: "#57534e", lineHeight: 1.7,
          }}>{detail.description}</p>

          {/* Bullets */}
          <ul style={{ margin: "0 0 auto", padding: 0, listStyle: "none", display: "flex", flexDirection: "column" as const, gap: "9px" }}>
            {detail.bullets.map((b) => (
              <li key={b} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                fontSize: "13px", color: "#44403c", lineHeight: 1.5,
              }}>
                <span style={{
                  flexShrink: 0, marginTop: "2px",
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: `${detail.accent}18`, color: detail.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: 900,
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
            <span style={{ fontSize: "14px" }}>🔔</span>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: detail.accent, lineHeight: 1.4 }}>
              We're building this now — follow CauseKind for early access.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ─── MagnetCard ─────────────────────────────────────────────────────────── */
function MagnetCard({ card, idx, reducedMotion, sectionRef, onOpen }: {
  card: CardDef;
  idx: number;
  reducedMotion: boolean;
  sectionRef: React.RefObject<HTMLElement | null>;
  onOpen: (rect: DOMRect) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const dragging          = useRef(false);
  const dragStart         = useRef({ x: 0, y: 0 });
  const dragOffset        = useRef({ x: 0, y: 0 });
  const accumulatedOffset = useRef({ x: 0, y: 0 });

  const [tilt,        setTilt]        = useState({ rx: 0, ry: 0 });
  const [isHover,     setIsHover]     = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const [dragPos,     setDragPos]     = useState({ x: 0, y: 0 });
  const [isReleasing, setIsReleasing] = useState(false);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
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
    if (!wrapRef.current || reducedMotion) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTilt({
      rx: ((e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2)) * -12,
      ry: ((e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2)) *  12,
    });
  }, [reducedMotion, sectionRef]);

  const handlePointerEnter = useCallback(() => setIsHover(true), []);
  const handlePointerLeave = useCallback(() => { setIsHover(false); setTilt({ rx: 0, ry: 0 }); }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setIsReleasing(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const moved = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    dragging.current = false;
    setIsDragging(false);
    setIsReleasing(true);
    accumulatedOffset.current = { x: dragOffset.current.x, y: dragOffset.current.y };
    const t = window.setTimeout(() => setIsReleasing(false), 500);
    if (moved < 6 && wrapRef.current) onOpen(wrapRef.current.getBoundingClientRect());
    return () => window.clearTimeout(t);
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
    <div
      ref={wrapRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative", width: "220px", height: "280px", flexShrink: 0, marginTop: "20px",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none", touchAction: "none",
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
      {/* Ripple rings — two staggered rings per card for a continuous, smooth pulse */}
      {!reducedMotion && [0, 1].map((n) => (
        <div
          key={n}
          aria-hidden
          style={{
            position: "absolute", inset: "-5px", borderRadius: "19px",
            border: `2px solid ${CARD_DETAILS[idx].accent}`,
            animation: `ck-ripple 2.8s cubic-bezier(0.25,0.55,0.4,1) ${0.6 + idx * 0.45 + n * 1.4}s infinite`,
            pointerEvents: "none", zIndex: 5, opacity: 0,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
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
      className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 overflow-hidden"
      style={{ padding: "80px 24px 96px" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ck-float {
          0%   { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
          50%  { transform: var(--ck-base-transform, rotate(-3deg)) translateY(-10px) rotate(0.5deg); }
          100% { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
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
        @media (max-width: 580px) {
          .ck-modal-split { flex-direction: column !important; }
          .ck-modal-left  { width: 100% !important; min-height: 200px !important; flex: none !important; }
          .ck-modal-right { padding: 24px 20px 28px !important; }
        }
        @keyframes ck-ripple {
          0%   { opacity: 0;    transform: scale(0.98); }
          18%  { opacity: 0.55; }
          100% { opacity: 0;    transform: scale(1.22); }
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

      <div className="flex flex-col sm:flex-row items-center justify-center" style={{ gap: "clamp(48px, 7vw, 110px)" }}>
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
            fontSize: "11px", fontWeight: 700, color: "#a8a29e",
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
