import type { CSSProperties } from "react";

import { LANTERN_ATLAS, LANTERN_SPAN, LANTERN_SPRITE_HEIGHT, LANTERN_SPRITES } from "./diwaliLanternsAtlas";

const percent = (part: number, whole: number) => `${((part / whole) * 100).toFixed(4)}%`;

function spriteStyle(sprite: (typeof LANTERN_SPRITES)[number], index: number) {
  return {
    left: percent(sprite.x, LANTERN_SPAN),
    width: percent(sprite.w, LANTERN_SPAN),
    height: percent(sprite.h, LANTERN_SPRITE_HEIGHT),
    transformOrigin: `${percent(sprite.anchor, sprite.w)} 0`,
    backgroundSize: `${percent(LANTERN_ATLAS.width, sprite.w)} ${percent(LANTERN_ATLAS.height, sprite.h)}`,
    backgroundPosition: `${percent(sprite.ax, LANTERN_ATLAS.width - sprite.w)} ${percent(sprite.ay, LANTERN_ATLAS.height - sprite.h)}`,
    // Stepped by primes, so no two neighbours keep time.
    "--ck-lantern-sway": `${(4 + ((index * 7) % 30) / 10).toFixed(1)}s`,
    "--ck-lantern-sway-delay": `${(-((index * 13) % 70) / 10).toFixed(1)}s`,
    "--ck-lantern-flicker": `${(2 + ((index * 11) % 15) / 10).toFixed(1)}s`,
    "--ck-lantern-flicker-delay": `${(-((index * 17) % 35) / 10).toFixed(1)}s`,
  } as CSSProperties;
}

/**
 * The hanging lanterns across the cream, decorative and desktop only. The layer is
 * display:none below lg and the atlas is only named inside a min-width rule, so a
 * phone requests nothing (styles.css, "The hanging lanterns").
 */
export function DiwaliHangingLanterns() {
  return (
    <div className="ck-diwali-hanging" aria-hidden>
      {LANTERN_SPRITES.map((sprite, index) => (
        <span key={sprite.x} className="ck-diwali-hanging-sprite" style={spriteStyle(sprite, index)} />
      ))}
    </div>
  );
}
