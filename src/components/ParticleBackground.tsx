"use client";

import { useEffect, useRef } from "react";

interface Props { className?: string }

/* ─── Tier thresholds ───────────────────────────────────────────────────────
   big   (8%):  r 7–13 px  → slow, glowing hub nodes
   mid  (22%):  r 3.5–7 px → medium connectors
   small(70%):  r 1–3 px   → fine-grain drift cloud
──────────────────────────────────────────────────────────────────────────── */
function pickRadius(): number {
  const t = Math.random();
  if (t < 0.08)  return Math.random() * 6  + 7;    // 7–13
  if (t < 0.30)  return Math.random() * 3.5 + 3.5; // 3.5–7
  return          Math.random() * 2  + 1;           // 1–3
}

// terracotta · copper · amber  (all warm orange family)
const COLS: [number, number, number][] = [
  [176,  74, 21],   // #b04a15  deep terracotta
  [224, 123, 58],   // #e07b3a  copper
  [245, 158, 11],   // #f59e0b  amber-gold
];

export function ParticleBackground({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse     = useRef({ x: -3000, y: -3000 });
  const raf       = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N       = 68;     // total nodes
    const LINK    = 132;    // max edge draw distance
    const REPEL_R = 150;    // cursor repulsion radius

    type Pt = { x:number; y:number; vx:number; vy:number; r:number; ci:number };
    let pts: Pt[] = [];
    let W = 0, H = 0;

    /* ── init ──────────────────────────────────────────────── */
    const init = () => {
      W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
      H = canvas.height = canvas.offsetHeight || window.innerHeight;
      const base = 0.30;
      pts = Array.from({ length: N }, () => {
        const r = pickRadius();
        // big nodes drift slower
        const spd = r > 6 ? base * 0.4 : r > 3 ? base * 0.72 : base;
        return {
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - 0.5) * spd * 2,
          vy: (Math.random() - 0.5) * spd * 2,
          r,
          ci: Math.floor(Math.random() * COLS.length),
        };
      });
    };

    /* ── draw glow aura around big nodes ───────────────────── */
    const drawGlow = (p: Pt) => {
      const [r, g, b] = COLS[p.ci];
      const aura = p.r * 3.2;
      const grd  = ctx.createRadialGradient(p.x, p.y, p.r * 0.4, p.x, p.y, aura);
      grd.addColorStop(0, `rgba(${r},${g},${b},0.13)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, aura, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    };

    /* ── main loop ─────────────────────────────────────────── */
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.current.x;
      const my = mouse.current.y;

      /* update positions */
      for (const p of pts) {
        const dx   = p.x - mx;
        const dy   = p.y - my;
        const dist = Math.hypot(dx, dy);

        // cursor repulsion (big nodes repel harder)
        if (dist < REPEL_R && dist > 0) {
          const sizeBoost = p.r > 6 ? 1.6 : p.r > 3 ? 1.2 : 1.0;
          const f = ((REPEL_R - dist) / REPEL_R) ** 2 * 2.1 * sizeBoost;
          p.vx += (dx / dist) * f;
          p.vy += (dy / dist) * f;
        }

        // dampen (big = more inertia)
        const damp = p.r > 6 ? 0.968 : p.r > 3 ? 0.972 : 0.975;
        p.vx *= damp;
        p.vy *= damp;

        // keep drifting
        const spd     = Math.hypot(p.vx, p.vy);
        const minSpd  = p.r > 6 ? 0.06 : p.r > 3 ? 0.10 : 0.14;
        const maxSpd  = p.r > 6 ? 1.8  : p.r > 3 ? 2.6  : 3.4;
        if (spd < minSpd) { p.vx += (Math.random() - 0.5) * 0.06; p.vy += (Math.random() - 0.5) * 0.06; }
        if (spd > maxSpd) { p.vx *= maxSpd / spd; p.vy *= maxSpd / spd; }

        p.x += p.vx; p.y += p.vy;
        // wrap edges
        if (p.x < -p.r)     p.x += W + p.r;
        else if (p.x > W + p.r) p.x -= W + p.r;
        if (p.y < -p.r)     p.y += H + p.r;
        else if (p.y > H + p.r) p.y -= H + p.r;
      }

      /* draw edges */
      for (let i = 0; i < N - 1; i++) {
        for (let j = i + 1; j < N; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < LINK) {
            // thicker edge when both nodes are bigger
            const maxR  = Math.max(pts[i].r, pts[j].r);
            const thick = maxR > 6 ? 1.1 : maxR > 3 ? 0.8 : 0.55;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(176,74,21,${(1 - d / LINK) * 0.11})`;
            ctx.lineWidth   = thick;
            ctx.stroke();
          }
        }
      }

      /* draw nodes (back to front: small → big) */
      const sorted = [...pts].sort((a, b) => a.r - b.r);
      for (const p of sorted) {
        const [r, g, b] = COLS[p.ci];
        // glow aura for large nodes
        if (p.r > 5) drawGlow(p);
        // node body
        const alpha = p.r > 6 ? 0.42 : p.r > 3 ? 0.32 : 0.24;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      raf.current = requestAnimationFrame(tick);
    };

    /* ── mouse (window listener → canvas-relative coords) ── */
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouse.current = { x: -3000, y: -3000 }; };
    const onResize = () => init();

    init();
    tick();
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize",     onResize);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize",     onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
}
