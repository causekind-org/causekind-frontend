"use client";

import { useEffect, useRef } from "react";

import "./diwaliMobile.css";

const SPARKS = [14, 33, 49, 67, 84];

/**
 * The string lights, swinging lanterns and sparks over the phone hero, decorative. The
 * layer is display:none from 768px and its images are only named inside a
 * max-width rule, so desktop requests nothing. Loops pause once it is off screen.
 */
export function DiwaliMobileLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      layer.toggleAttribute("data-paused", !entry.isIntersecting);
    });
    io.observe(layer);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="ck-dw-layer" aria-hidden>
      <span className="ck-dw-lights" />
      <span className="ck-dw-lantern ck-dw-lantern-left" />
      <span className="ck-dw-lantern ck-dw-lantern-right" />
      {SPARKS.map((left, index) => (
        <span
          key={left}
          className="ck-dw-spark"
          style={{ left: `${left}%`, top: `${12 + (index * 13) % 42}%`, animationDelay: `${-index * 0.9}s` }}
        />
      ))}
    </div>
  );
}

type SeamTone = "film" | "cream" | "butter" | "crimson" | "night";

/**
 * The join between two phone sections, decorative. No two kinds repeat in a row:
 * `line` a thin gold scallop, `edge` a scalloped change of colour, `diya` one lamp,
 * and three arches used once each. `from` and `to` name the grounds either side.
 */
export function DiwaliSeam({
  kind,
  from = "cream",
  to = "cream",
  lanterns,
  diyas = 1,
}: {
  kind: "line" | "edge" | "diya" | "arch-bulbs" | "arch-step" | "arch-swell";
  from?: SeamTone;
  to?: SeamTone;
  /** Lanterns hung from this join into the empty corners of the next section. */
  lanterns?: "left" | "right" | "both";
  /** Lamps in a `diya` seam. */
  diyas?: 1 | 3 | 5;
}) {
  return (
    <div className={`ck-dw-seam ck-dw-seam-${kind}`} data-from={from} data-to={to} aria-hidden>
      {kind === "diya" && Array.from({ length: diyas }, (_, index) => <span key={index} className="ck-dw-diya" />)}
      {kind === "arch-swell" && <span className="ck-dw-diya" />}
      {lanterns && lanterns !== "right" && <span className="ck-dw-hang ck-dw-hang-left" />}
      {lanterns && lanterns !== "left" && <span className="ck-dw-hang ck-dw-hang-right" />}
    </div>
  );
}
