"use client";

import { useRef, useState, useEffect, useCallback } from "react";

/* ─── Brand colours ────────────────────────────────────────────────────── */
const TERRACOTTA = "#b04a15";
const COPPER = "#e07b3a";
const INK = "#1e3a60";
const GOLD = "#f0b97a";
const CREAM = "#faf8f5";

/* ─── CauseKind heart+sprout SVG motif ─────────────────────────────────── */
function HeartSprout({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 18V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Tape accent ───────────────────────────────────────────────────────── */
function TapeAccent({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-14px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "48px",
        height: "22px",
        background: color,
        opacity: 0.55,
        borderRadius: "3px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        zIndex: 10,
      }}
    />
  );
}

/* ─── COMING SOON stamp ─────────────────────────────────────────────────── */
function Stamp() {
  return (
    <div
      aria-label="Coming Soon"
      style={{
        position: "absolute",
        top: "18px",
        right: "14px",
        border: `2.5px solid ${GOLD}`,
        borderRadius: "6px",
        padding: "3px 8px",
        transform: "rotate(12deg)",
        color: GOLD,
        fontFamily: "monospace",
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        lineHeight: 1.2,
        userSelect: "none",
        opacity: 0.9,
        whiteSpace: "nowrap",
        boxShadow: `0 0 0 1px ${GOLD}44 inset`,
      }}
    >
      COMING
      <br />
      SOON
    </div>
  );
}

/* ─── Poster face (CSS-only) ─────────────────────────────────────────────
   swap this CSS poster for an AI <Image> when available              */
function PosterFace({
  gradient,
  title,
}: {
  gradient: string;
  title: string;
}) {
  return (
    /* swap this CSS poster for an AI <Image> when available */
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: gradient,
        borderRadius: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "28px 20px 20px",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <Stamp />

      {/* Motif icon */}
      <HeartSprout
        className="w-10 h-10"
        style={{ color: GOLD, opacity: 0.85 }}
      />

      {/* Feature name */}
      <p
        style={{
          margin: 0,
          color: CREAM,
          fontWeight: 800,
          fontSize: "clamp(15px, 4vw, 18px)",
          textAlign: "center",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          textShadow: "0 1px 4px rgba(0,0,0,0.35)",
          zIndex: 1,
        }}
      >
        {title}
      </p>

      {/* Fine print */}
      <p
        style={{
          margin: 0,
          color: GOLD,
          fontWeight: 700,
          fontSize: "9px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          zIndex: 1,
        }}
      >
        CauseKind
      </p>
    </div>
  );
}

/* ─── Card data ─────────────────────────────────────────────────────────── */
interface CardDef {
  title: string;
  gradient: string;
  tapeColor: string;
  baseRotation: number; // deg
  floatDelay: string;   // CSS animation-delay
}

const CARDS: CardDef[] = [
  {
    title: "Fundraising Campaigns",
    gradient: `linear-gradient(145deg, ${TERRACOTTA} 0%, ${COPPER} 100%)`,
    tapeColor: CREAM,
    baseRotation: -3,
    floatDelay: "0s",
  },
  {
    title: "Online Donations",
    gradient: `linear-gradient(145deg, ${INK} 0%, ${TERRACOTTA} 100%)`,
    tapeColor: GOLD,
    baseRotation: 2,
    floatDelay: "1.4s",
  },
];

/* ─── Individual magnet card ─────────────────────────────────────────────── */
function MagnetCard({
  card,
  reducedMotion,
}: {
  card: CardDef;
  reducedMotion: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  // 3D tilt state (hover)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [isHover, setIsHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isReleasing, setIsReleasing] = useState(false);

  /* Pointer move — 3D tilt when hovering (not dragging) */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        dragOffset.current = { x: dx, y: dy };
        setDragPos({ x: dx, y: dy });
        return;
      }
      if (!wrapRef.current || reducedMotion) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientY - cy) / (rect.height / 2)) * -12;
      const ry = ((e.clientX - cx) / (rect.width / 2)) * 12;
      setTilt({ rx, ry });
    },
    [reducedMotion]
  );

  const handlePointerEnter = useCallback(() => {
    setIsHover(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHover(false);
    setTilt({ rx: 0, ry: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      dragOffset.current = { x: 0, y: 0 };
      setIsDragging(true);
      setIsReleasing(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    setIsReleasing(true);
    setDragPos({ x: 0, y: 0 });
    // Remove releasing flag after spring transition completes
    const t = window.setTimeout(() => setIsReleasing(false), 500);
    return () => window.clearTimeout(t);
  }, []);

  /* Build the composed transform */
  const floatAnim =
    !reducedMotion && !isHover && !isDragging
      ? `ck-float ${card.floatDelay === "0s" ? "3.6s" : "3.8s"} ease-in-out ${card.floatDelay} infinite`
      : "none";

  const perspective = "perspective(700px)";
  const baseRot = `rotate(${isDragging ? 0 : card.baseRotation}deg)`;
  const tiltRot =
    isHover && !isDragging && !reducedMotion
      ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
      : "";
  const translateDrag =
    isDragging || isReleasing
      ? `translate(${dragPos.x}px, ${dragPos.y}px)`
      : "";

  const transform = [perspective, translateDrag, baseRot, tiltRot]
    .filter(Boolean)
    .join(" ");

  const transition = isDragging
    ? "box-shadow 0.15s ease"
    : isReleasing
    ? "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease"
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
        position: "relative",
        width: "220px",
        height: "280px",
        flexShrink: 0,
        marginTop: "20px", // space for tape
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        zIndex: isDragging ? 20 : 1,
        /* float animation applied here when not interacting */
        animation: floatAnim,
        transform,
        transition,
        boxShadow: shadow,
        borderRadius: "14px",
        willChange: "transform",
      }}
    >
      {/* Tape accent */}
      <TapeAccent color={card.tapeColor} />

      {/* Poster face */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "14px",
          overflow: "hidden",
          border: `2px solid rgba(255,255,255,0.18)`,
        }}
      >
        <PosterFace gradient={card.gradient} title={card.title} />
      </div>
    </div>
  );
}

/* ─── Main exported section ─────────────────────────────────────────────── */
export function ComingSoonMagnets() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <section
      className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 overflow-hidden"
      style={{ padding: "80px 24px 96px" }}
    >
      {/* Keyframe definitions — injected once, no external CSS file touched */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ck-float {
              0%   { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
              50%  { transform: var(--ck-base-transform, rotate(-3deg)) translateY(-10px) rotate(0.5deg); }
              100% { transform: var(--ck-base-transform, rotate(-3deg)) translateY(0px); }
            }
          `,
        }}
      />

      {/* Section heading */}
      <div className="text-center mb-12">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
          style={{
            background: `${TERRACOTTA}18`,
            color: TERRACOTTA,
          }}
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

      {/* Magnet cards */}
      <div
        className="flex flex-col sm:flex-row items-center justify-center"
        style={{ gap: "40px" }}
      >
        {CARDS.map((card) => (
          <MagnetCard
            key={card.title}
            card={card}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </section>
  );
}
