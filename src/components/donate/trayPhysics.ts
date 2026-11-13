/**
 * Physics for the donate sheet's cards (DonateChoice). Each card is a shallow
 * tray; its icon, title, description and button are loose bodies lying in it.
 * The tray is rigid with the sheet, so the only thing that ever pushes a body
 * is the sheet's own acceleration: nothing here is a preset bounce.
 *
 * Per body, each small time step adds up:
 *   - the tray's acceleration, felt in reverse (it speeds up, the body lags);
 *   - drag;
 *   - a pull toward its home position (its normal place in the layout), weak
 *     while the sheet is still being thrown about and full once it is calm;
 *   - soft walls at the card's inner edges, sized for the body's own box;
 *   - a soft push apart from the body above or below it, so text and the
 *     button never ride over each other.
 *
 * Pure numbers, no DOM: the hook in DonateChoice measures, steps and paints.
 * Units are px, seconds and degrees. Down and right are positive.
 */

export type BodyKind = "icon" | "title" | "desc" | "cta";

type BodySpec = {
  /** Heavier bodies answer the spring and drag more slowly. */
  mass: number;
  /** How loosely it sits in the tray: 1 slides freely, 0 is glued down. */
  loose: number;
  /** Pull toward home. */
  spring: number;
  /** Resistance to moving. */
  drag: number;
  /** Bounce kept after touching a wall: 0 dead, 1 lossless. */
  restitution: number;
  /** Sideways drift as a share of the vertical push. */
  drift: number;
  /** Share of the spin push it takes; text stays near zero to stay readable. */
  spin: number;
};

export const BODY: Record<BodyKind, BodySpec> = {
  icon: { mass: 0.6, loose: 1, spring: 96, drag: 7.2, restitution: 0.45, drift: 0.4, spin: 1 },
  title: { mass: 1.4, loose: 0.42, spring: 400, drag: 36, restitution: 0.15, drift: 0.05, spin: 0.05 },
  desc: { mass: 1, loose: 0.7, spring: 170, drag: 15, restitution: 0.25, drift: 0.09, spin: 0.08 },
  cta: { mass: 1.8, loose: 0.58, spring: 420, drag: 30, restitution: 0.3, drift: 0.04, spin: 0.07 },
};

export const TUNING = {
  /** Converts sheet acceleration (px/s^2) into push on a fully loose body. */
  gain: 0.055,
  /** Spin push, degrees per px/s^2 of sheet acceleration. */
  spinGain: 0.021,
  spinSpring: 150,
  spinDrag: 13,
  /** Share of the home pull that applies while the sheet is being thrown. */
  homeWhileThrown: 0.3,
  /** Sheet acceleration above this counts as "being thrown" (px/s^2). */
  activeAccel: 500,
  /** Time for the home pull to return to full once the sheet is calm (s). */
  calmTime: 0.28,
  /** Wall stiffness and the gap kept from the card edge (px). */
  wallSpring: 1400,
  wallInset: 4,
  /** Stiffness of the push between stacked bodies, and the gap they keep (px). */
  pairSpring: 900,
  pairGap: 2,
  /** A focused or pressed card holds its button: push is cut, pull is raised. */
  heldPush: 0.2,
  heldSpring: 2.5,
  /** Below these the tray counts as at rest (px, px/s, deg, deg/s). */
  restOffset: 0.08,
  restSpeed: 1.5,
  restAngle: 0.03,
  restSpin: 0.6,
} as const;

export type Box = { left: number; top: number; right: number; bottom: number };

export type Body = {
  kind: BodyKind;
  /** Home box, relative to the tray's top-left corner. */
  home: Box;
  x: number; y: number; r: number;
  vx: number; vy: number; vr: number;
  minX: number; maxX: number; minY: number; maxY: number;
  /** Small per-open variation: sideways lean, spin direction, push strength. */
  lean: number; twist: number; push: number;
  held: boolean;
};

/** `rand` returns 0..1; pass a seeded one to make a run repeatable. */
export function createBody(kind: BodyKind, home: Box, tray: { width: number; height: number }, rand: () => number): Body {
  const inset = TUNING.wallInset;
  const span = (lo: number, hi: number) => lo + (hi - lo) * rand();
  return {
    kind, home,
    x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0,
    // Home itself is always inside the allowed range.
    minX: Math.min(0, inset - home.left),
    maxX: Math.max(0, tray.width - inset - home.right),
    minY: Math.min(0, inset - home.top),
    maxY: Math.max(0, tray.height - inset - home.bottom),
    lean: span(-1, 1),
    twist: span(0.55, 1) * (rand() < 0.5 ? -1 : 1),
    push: span(0.92, 1.08),
    held: false,
  };
}

/** Pairs [upper, lower] of bodies stacked in the same column. */
export function stackedPairs(bodies: Body[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const a = bodies[i].home, b = bodies[j].home;
      const sameColumn = a.left < b.right && b.left < a.right;
      if (sameColumn && a.bottom <= b.top + 0.5) pairs.push([i, j]);
    }
  }
  return pairs;
}

/** 0 while the sheet is being thrown, easing to 1 once it has been calm for calmTime. */
export function calmness(secondsSinceActive: number): number {
  const t = Math.min(Math.max(secondsSinceActive / TUNING.calmTime, 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * Advances one tray by `h` seconds. `accel` is the sheet's vertical
 * acceleration in px/s^2 (negative while it speeds up the screen).
 */
export function stepTray(bodies: Body[], pairs: [number, number][], accel: number, calm: number, h: number) {
  const T = TUNING;
  const home = T.homeWhileThrown + (1 - T.homeWhileThrown) * calm;
  const fy = new Array<number>(bodies.length).fill(0);

  for (const [i, j] of pairs) {
    const a = bodies[i], b = bodies[j];
    const rest = b.home.top - a.home.bottom;
    const keep = Math.min(T.pairGap, rest);
    const gap = rest + b.y - a.y;
    if (gap < keep) {
      const f = T.pairSpring * (keep - gap);
      fy[i] -= f;
      fy[j] += f;
    }
  }

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const s = BODY[b.kind];
    const grip = b.held ? T.heldPush : 1;
    const k = (s.spring / s.mass) * home * (b.held ? T.heldSpring : 1);
    const c = s.drag / s.mass;
    const shove = -accel * T.gain * s.loose * b.push * grip;

    let ax = shove * s.drift * b.lean - k * b.x - c * b.vx;
    let ay = shove - k * b.y - c * b.vy + fy[i] / s.mass;
    // Soft walls: a stiff spring past the edge, losing (1 - restitution) of the bounce.
    const wallDrag = 2 * (1 - s.restitution) * Math.sqrt(T.wallSpring);
    if (b.x < b.minX) ax += T.wallSpring * (b.minX - b.x) - wallDrag * b.vx;
    else if (b.x > b.maxX) ax += T.wallSpring * (b.maxX - b.x) - wallDrag * b.vx;
    if (b.y < b.minY) ay += T.wallSpring * (b.minY - b.y) - wallDrag * b.vy;
    else if (b.y > b.maxY) ay += T.wallSpring * (b.maxY - b.y) - wallDrag * b.vy;

    b.vx += ax * h; b.x += b.vx * h;
    b.vy += ay * h; b.y += b.vy * h;

    const ar = -accel * T.spinGain * s.spin * b.twist * grip - T.spinSpring * home * b.r - T.spinDrag * b.vr;
    b.vr += ar * h; b.r += b.vr * h;
  }
}

export function isAtRest(bodies: Body[]): boolean {
  const T = TUNING;
  return bodies.every((b) =>
    Math.abs(b.x) < T.restOffset && Math.abs(b.y) < T.restOffset && Math.abs(b.r) < T.restAngle &&
    Math.abs(b.vx) < T.restSpeed && Math.abs(b.vy) < T.restSpeed && Math.abs(b.vr) < T.restSpin);
}
