"use client";

/**
 * About CauseKind — phone (< 768px) illustration of the section's line,
 * "Good things shouldn't sit unused."
 *
 * A shelf at home holds four useful things, faded and gathering dust. One at a
 * time, each wakes, leaves the shelf (a dashed outline marks the freed space),
 * goes into CauseKind, is matched, and travels on to a verified person or an
 * NGO on the "nearby" map, whose bubble shows the thing they need and turns
 * into a tick when it arrives. Then the shelf fills again and it repeats.
 *
 * Cost: one rAF loop that runs only while the picture is on screen and the tab
 * is visible, writing one transform per frame (the travelling item). Every
 * other change is a state flip (a handful per item) animated by CSS
 * transitions. Reduced motion: one still frame, mid-journey.
 */

import React, { useEffect, useRef, useState } from "react";
import styles from "./WhoAreWeSection.module.css";

type IconC = React.FC<{ size?: number }>;
type Dest = "person" | "ngo";
type Phase = "idle" | "wake" | "toHub" | "match" | "toDest" | "arrive" | "done" | "reset";
type Pt = readonly [number, number];
type Cubic = readonly [Pt, Pt, Pt, Pt];

export interface JourneyItem {
  id: string;
  Icon: IconC;
  name: string;
  to: Dest;
}

/* ── Geometry (viewBox 360 × 440) ───────────────────────────────────────── */
const SLOT_X = [80, 146, 214, 280] as const;
const ITEM_Y = 88;
const HUB: Pt = [180, 206];
const DEST: Record<Dest, Pt> = { person: [112, 356], ngo: [248, 356] };

const toHubCurve = (x: number): Cubic => [[x, ITEM_Y], [x, 150], [HUB[0], 140], HUB];
const toDestCurve = (d: Dest): Cubic => [HUB, [HUB[0], 280], [DEST[d][0], 270], DEST[d]];
const d = (c: Cubic) =>
  `M ${c[0][0]} ${c[0][1]} C ${c[1][0]} ${c[1][1]}, ${c[2][0]} ${c[2][1]}, ${c[3][0]} ${c[3][1]}`;
const at = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, e = 3 * u * t * t, f = t * t * t;
  return [
    a * c[0][0] + b * c[1][0] + e * c[2][0] + f * c[3][0],
    a * c[0][1] + b * c[1][1] + e * c[2][1] + f * c[3][1],
  ];
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ── Timing (ms) ────────────────────────────────────────────────────────── */
const STEPS: [Phase, number][] = [
  ["wake", 550],
  ["toHub", 1100],
  ["match", 750],
  ["toDest", 1150],
  ["arrive", 750],
];
const PER_ITEM = STEPS.reduce((s, [, ms]) => s + ms, 0);
const DONE_MS = 1700;
const RESET_MS = 900;

const HEART =
  "M0 7.5 C -9 1.5 -12 -3.5 -12 -7 C -12 -10.5 -9.3 -13 -6.2 -13 C -3.6 -13 -1.4 -11.6 0 -9.4 C 1.4 -11.6 3.6 -13 6.2 -13 C 9.3 -13 12 -10.5 12 -7 C 12 -3.5 9 1.5 0 7.5 Z";

function Badge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={styles.jBadge}>
        <circle r="7.5" fill="#1F6B3F" stroke="#fff" strokeWidth="1.5" />
        <path d="M-3.2 0.2 L-1 2.4 L3.3 -2.2" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

export function AboutJourneyMobile({
  items,
  Person,
  Ngo,
}: {
  items: JourneyItem[];
  Person: IconC;
  Ngo: IconC;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const travelerRef = useRef<SVGGElement>(null);
  const [{ k, phase }, setStep] = useState<{ k: number; phase: Phase }>({ k: 0, phase: "idle" });
  const [playing, setPlaying] = useState(false);
  const loop = items.length * PER_ITEM + DONE_MS + RESET_MS;

  useEffect(() => {
    const root = rootRef.current;
    const trav = travelerRef.current;
    if (!root || !trav) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // A still frame: the second thing matched in CauseKind, on its way.
      setStep({ k: 1, phase: "match" });
      return;
    }

    let raf = 0;
    let visible = false;
    let elapsed = 0;
    let last = 0;
    let cur = "0:idle";

    const place = (p: Pt, s: number, o: number) => {
      trav.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) scale(${s.toFixed(3)})`);
      trav.style.opacity = o.toFixed(3);
    };

    const render = (time: number) => {
      let nk = 0;
      let ph: Phase;
      let local = 0;
      let dur = 1;
      const itemsMs = items.length * PER_ITEM;
      if (time < itemsMs) {
        nk = Math.floor(time / PER_ITEM);
        let rest = time - nk * PER_ITEM;
        ph = "wake";
        for (const [name, ms] of STEPS) {
          if (rest < ms) {
            ph = name;
            local = rest;
            dur = ms;
            break;
          }
          rest -= ms;
        }
      } else {
        nk = items.length - 1;
        ph = time < itemsMs + DONE_MS ? "done" : "reset";
      }
      const key = `${nk}:${ph}`;
      if (key !== cur) {
        cur = key;
        setStep({ k: nk, phase: ph });
      }

      const t = Math.min(1, local / dur);
      const item = items[nk];
      if (ph === "toHub") {
        const p = at(toHubCurve(SLOT_X[nk % SLOT_X.length]), ease(t));
        place(p, 1.12 - 0.3 * t, 1);
      } else if (ph === "match") {
        place(HUB, 0.82, 0); // inside CauseKind (the hub is drawn over it)
      } else if (ph === "toDest") {
        const p = at(toDestCurve(item.to), ease(t));
        place(p, 0.82 + 0.2 * Math.min(1, t * 2), 1);
      } else if (ph === "arrive") {
        const k2 = Math.min(1, t / 0.45);
        place(DEST[item.to], 1.02 - 0.62 * k2, 1 - k2);
      } else {
        trav.style.opacity = "0";
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      elapsed = (elapsed + Math.min(64, now - last)) % loop;
      last = now;
      render(elapsed);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        setPlaying(visible);
        start();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [items, loop]);

  /* ── Derived state ────────────────────────────────────────────────────── */
  const delivered = (i: number) =>
    phase === "done" || (phase !== "idle" && phase !== "reset" && (i < k || (i === k && phase === "arrive")));
  const slotState = (i: number): "rest" | "wake" | "gone" => {
    if (phase === "idle" || phase === "reset") return "rest";
    if (phase === "done" || i < k) return "gone";
    if (i === k) return phase === "wake" ? "wake" : "gone";
    return "rest";
  };
  const current = items[k];
  const travelling = phase === "toHub" || phase === "match" || phase === "toDest" || phase === "arrive";
  const bubble = (dest: Dest) => {
    const mine = items.map((it, i) => ({ it, i })).filter(({ it }) => it.to === dest);
    if (mine.some(({ i }) => i === k && phase === "arrive")) return null; // just received: tick
    return mine.find(({ i }) => !delivered(i))?.it ?? null;
  };
  const hot = (dest: Dest) => travelling && phase !== "toHub" && current.to === dest;
  const got = (dest: Dest) => phase === "arrive" && current.to === dest;

  const Traveler = current.Icon;
  const caption = travelling
    ? `${current.name} — from a shelf at home to ${current.to === "person" ? "a verified person" : "an NGO"} nearby`
    : phase === "done"
      ? "Four good things, now in use nearby."
      : "Useful things, sitting unused at home.";

  const destNode = (dest: Dest, Avatar: IconC, label: string) => {
    const [x, y] = DEST[dest];
    const need = bubble(dest);
    const bx = dest === "person" ? 48 : 312;
    const NeedIcon = need?.Icon;
    return (
      <g className={styles.jDest} data-hot={hot(dest)} data-got={got(dest)} data-dest={dest}>
        <circle className={styles.jDestHalo} cx={x} cy={y} r="36" />
        <g transform={`translate(${x} ${y})`}>
          <g className={styles.jDestAvatar}>
            <circle r="24" className={dest === "person" ? styles.jAvatarPerson : styles.jAvatarNgo} />
            <g transform="translate(-20 -21)">
              <Avatar size={40} />
            </g>
          </g>
        </g>
        <Badge x={x + 18} y={y - 18} />
        <text x={x} y={y + 42} textAnchor="middle" className={styles.jLabel}>
          {label}
        </text>
        {/* What they need — becomes a tick when it arrives. */}
        <g transform={`translate(${bx} 336)`}>
          <path
            className={styles.jBubble}
            d={
              dest === "person"
                ? "M -21 -17 H 21 Q 25 -17 25 -13 V -3 L 31 2 L 25 3 V 13 Q 25 17 21 17 H -21 Q -25 17 -25 13 V -13 Q -25 -17 -21 -17 Z"
                : "M 21 -17 H -21 Q -25 -17 -25 -13 V -3 L -31 2 L -25 3 V 13 Q -25 17 -21 17 H 21 Q 25 17 25 13 V -13 Q 25 -17 21 -17 Z"
            }
          />
          <text y="-6" textAnchor="middle" className={styles.jBubbleLabel}>
            {NeedIcon ? "NEEDS" : "GOT IT"}
          </text>
          <g key={need ? need.id : "tick"} className={styles.jBubbleIcon}>
            {NeedIcon ? (
              <g transform="translate(-9 -3) ">
                <NeedIcon size={18} />
              </g>
            ) : (
              <path d="M -6 5 L -2 9 L 6 1" stroke="#1F6B3F" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        </g>
      </g>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.journey} md:hidden select-none mt-6`}
      data-playing={playing}
      data-phase={phase}
      aria-hidden
    >
      <svg className={styles.jSvg} viewBox="0 0 360 440" fill="none">
        <defs>
          <radialGradient id="j-hub" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#E0741F" />
            <stop offset="1" stopColor="#B5480F" />
          </radialGradient>
          <radialGradient id="j-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#F4A25B" stopOpacity="0.55" />
            <stop offset="1" stopColor="#F4A25B" stopOpacity="0" />
          </radialGradient>
          <clipPath id="j-map-clip">
            <rect x="14" y="292" width="332" height="140" rx="20" />
          </clipPath>
        </defs>

        {/* ── Nearby map ─────────────────────────────────────────────── */}
        <rect className={styles.jMap} x="14" y="292" width="332" height="140" rx="20" />
        <g clipPath="url(#j-map-clip)">
          <path className={styles.jStreet} d="M 14 330 C 90 318, 150 344, 346 322" />
          <path className={styles.jStreet} d="M 60 292 C 70 340, 40 390, 58 432" />
          <path className={styles.jStreet} d="M 300 292 C 290 350, 320 390, 306 432" />
          <path className={styles.jStreet} d="M 14 410 C 120 396, 240 420, 346 404" />
          <circle className={styles.jRing} cx="180" cy="356" r="70" />
          <circle className={styles.jRing} cx="180" cy="356" r="128" />
        </g>
        <text x="180" y="424" textAnchor="middle" className={styles.jLabel}>
          Nearby · within 10 km
        </text>

        {/* ── Home shelf ─────────────────────────────────────────────── */}
        <rect className={styles.jPanel} x="14" y="24" width="332" height="100" rx="20" />
        <text x="30" y="44" className={styles.jLabel}>
          At home · unused
        </text>
        <rect className={styles.jPlank} x="26" y="106" width="308" height="7" rx="3.5" />
        <rect className={styles.jPlankEdge} x="26" y="111" width="308" height="3" rx="1.5" />
        <g className={styles.jDust}>
          {[
            [70, 64, 0, 6],
            [118, 72, 1.2, -5],
            [182, 60, 2.4, 4],
            [238, 70, 0.6, -6],
            [300, 62, 1.8, 5],
            [150, 52, 3.1, -3],
          ].map(([x, y, delay, dx], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.6"
              style={{ ["--d" as string]: `${delay}s`, ["--dx" as string]: `${dx}px` } as React.CSSProperties}
            />
          ))}
        </g>

        {/* ── Routes ─────────────────────────────────────────────────── */}
        {items.map((it, i) => (
          <path
            key={`up-${it.id}`}
            className={styles.jGuide}
            d={d(toHubCurve(SLOT_X[i % SLOT_X.length]))}
            data-live={phase === "toHub" && k === i}
          />
        ))}
        {(["person", "ngo"] as Dest[]).map((dest) => (
          <path
            key={`down-${dest}`}
            className={styles.jGuide}
            data-dest={dest}
            d={d(toDestCurve(dest))}
            data-live={(phase === "match" || phase === "toDest") && current.to === dest}
          />
        ))}

        {/* ── Things on the shelf ────────────────────────────────────── */}
        {items.map((it, i) => {
          const Ic = it.Icon;
          const x = SLOT_X[i % SLOT_X.length];
          return (
            <g key={it.id} className={styles.jSlot} data-s={slotState(i)} transform={`translate(${x} ${ITEM_Y})`}>
              <circle className={styles.jSlotGlow} r="26" fill="url(#j-glow)" />
              <rect className={styles.jSlotGhost} x="-17" y="-17" width="34" height="34" rx="9" />
              <g className={styles.jSlotIcon}>
                <g transform="translate(-18 -18)">
                  <Ic size={36} />
                </g>
              </g>
            </g>
          );
        })}

        {/* ── The thing on its way (under the hub, so it passes through) ── */}
        <g ref={travelerRef} className={styles.jTraveler}>
          <g key={current.id} transform="translate(-16 -16)">
            <Traveler size={32} />
          </g>
        </g>

        {/* ── CauseKind ──────────────────────────────────────────────── */}
        <g transform={`translate(${HUB[0]} ${HUB[1]})`}>
          <circle className={styles.jHubPulse} r="27" />
          <circle r="33" className={styles.jHubHalo} />
          <circle r="27" fill="url(#j-hub)" />
          <path d={HEART} transform="translate(0 3)" fill="#fff" />
        </g>
        <text x={HUB[0]} y={HUB[1] + 50} textAnchor="middle" className={`${styles.jLabel} ${styles.jHubLabel}`}>
          {phase === "match" ? "Matched" : "CauseKind"}
        </text>

        {/* ── Who needs them ─────────────────────────────────────────── */}
        {destNode("person", Person, "Verified person")}
        {destNode("ngo", Ngo, "NGO")}
      </svg>
      <p key={caption} className={styles.jCaption}>
        {caption}
      </p>
    </div>
  );
}
