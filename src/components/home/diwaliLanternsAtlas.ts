/**
 * Where each of the 20 lanterns sits in diwali-lanterns-atlas.webp. x is measured
 * from the first lantern, in pixels of the source composition; ax/ay locate the
 * sprite in the atlas; anchor is where its chain meets the top, from its left.
 */
export const LANTERN_ATLAS = { width: 971, height: 628 };
export const LANTERN_SPAN = 1195;
export const LANTERN_SPRITE_HEIGHT = 308;

export const LANTERN_SPRITES = [
  { x: -20, w: 79, h: 162, ax: 4, ay: 4, anchor: 38.3 },
  { x: 26, w: 90, h: 308, ax: 87, ay: 4, anchor: 45 },
  { x: 106, w: 77, h: 163, ax: 181, ay: 4, anchor: 38 },
  { x: 151, w: 92, h: 308, ax: 262, ay: 4, anchor: 45.4 },
  { x: 235, w: 78, h: 162, ax: 358, ay: 4, anchor: 39.2 },
  { x: 282, w: 90, h: 308, ax: 440, ay: 4, anchor: 44.7 },
  { x: 365, w: 78, h: 162, ax: 534, ay: 4, anchor: 39.3 },
  { x: 411, w: 92, h: 308, ax: 616, ay: 4, anchor: 46.2 },
  { x: 471, w: 78, h: 162, ax: 712, ay: 4, anchor: 39.2 },
  { x: 517, w: 92, h: 308, ax: 794, ay: 4, anchor: 46.1 },
  { x: 588, w: 77, h: 163, ax: 890, ay: 4, anchor: 38.5 },
  { x: 634, w: 90, h: 308, ax: 4, ay: 316, anchor: 45.4 },
  { x: 727, w: 77, h: 163, ax: 98, ay: 316, anchor: 38.5 },
  { x: 773, w: 91, h: 308, ax: 179, ay: 316, anchor: 45.4 },
  { x: 844, w: 78, h: 162, ax: 274, ay: 316, anchor: 38.4 },
  { x: 890, w: 90, h: 308, ax: 356, ay: 316, anchor: 45.4 },
  { x: 961, w: 78, h: 162, ax: 450, ay: 316, anchor: 38.5 },
  { x: 1007, w: 91, h: 308, ax: 532, ay: 316, anchor: 44.9 },
  { x: 1078, w: 77, h: 162, ax: 627, ay: 316, anchor: 38.5 },
  { x: 1123, w: 92, h: 308, ax: 708, ay: 316, anchor: 46.5 },
] as const;
