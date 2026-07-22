"use client";

/* CardGlow — a NON-DESTRUCTIVE adaptation of React Bits' BorderGlow.
   The original BorderGlow is a whole dark card (imposes its own background,
   border, shadow). Here we keep ONLY the cursor-directional outer edge glow and
   leave the wrapped card's own background/border/radius untouched — so it's a
   true "addon" over existing cards. Tuned to CauseKind's brand orange. */

import { useRef, useCallback } from 'react';
import './CardGlow.css';

function parseHSL(hslStr) {
  const m = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!m) return { h: 22, s: 85, l: 55 };
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const CardGlow = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '22 85 55', // brand orange (#e07b3a-ish) as "H S L"
  borderRadius = 16,
  glowRadius = 34,
  glowIntensity = 1.0,
  style,
}) => {
  const ref = useRef(null);

  const handlePointerMove = useCallback(e => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;

    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

    let angle = 0;
    if (dx !== 0 || dy !== 0) {
      angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
    }

    card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={`card-glow-fx ${className}`}
      style={{
        '--edge-sensitivity': edgeSensitivity,
        '--cg-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        ...buildGlowVars(glowColor, glowIntensity),
        ...style,
      }}
    >
      <span className="cg-edge" aria-hidden="true" />
      {children}
    </div>
  );
};

export default CardGlow;
