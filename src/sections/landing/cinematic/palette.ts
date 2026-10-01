/**
 * One palette for every illustration in the cinematic chapters.
 *
 * <p>The room, the map and the student are hand-built SVG drawn from this one
 * list. The giver and the bag are illustrated cutouts (see `cutouts.ts`), and
 * the room's colours are tuned around them rather than the other way round.
 *
 * <p>The grade is teal-and-orange: the big furniture is cool (teal sofa,
 * indigo curtains) so the two warm things the story is about — the giver in
 * her terracotta kurta and the orange bag — are what the eye lands on.
 */
export const P = {
  // Room shell
  wall: "#f2dfbf",
  wallWarm: "#f7e7c9",
  wallShade: "#e3c79c",
  skirting: "#9a5a33",
  floor: "#c07a45",
  floorDeep: "#9f5f35",
  floorLine: "#a8683c",
  floorShine: "#d8975f",

  // Wood
  wood: "#8a4a28",
  woodDark: "#66341b",
  woodLight: "#a9653a",

  // Line / ink
  ink: "#2a1810",
  inkSoft: "#4a2c1c",

  // Textiles
  mustard: "#dc9a2c",
  mustardDark: "#b67a1b",
  mustardLight: "#f0b64d",
  terracotta: "#c4532a",
  terracottaDark: "#98391b",
  rani: "#c23a6b",
  raniDark: "#962a52",
  teal: "#2f6f6b",
  tealDark: "#22514e",
  cream: "#fbf1dd",
  creamShade: "#eadbbd",

  // Cool furnishings
  sofa: "#2f6b68",
  sofaDark: "#23504e",
  sofaLight: "#3f827e",
  curtain: "#3b4f7d",
  curtainDark: "#2a3a60",

  // Nature
  leaf: "#4f7d3a",
  leafDark: "#3a6128",
  leafLight: "#74a24f",
  marigold: "#f39a1e",
  marigoldDeep: "#df731a",
  marigoldYellow: "#f7c131",

  // People
  skin: "#b9785a",
  skinShade: "#9b5e44",
  skinLight: "#c98b6c",
  hair: "#211411",
  hairShine: "#3b2620",

  // Dusk sky through the window
  sky1: "#ffd7a3",
  sky2: "#ffae78",
  sky3: "#f3875f",
  city1: "#e4a07f",
  city2: "#cf7f62",
  city3: "#b8654e",

  // Film
  night: "#0f0a07",
  nightLift: "#1b120c",
  glow: "#ff7a2f",
  glowHot: "#ffb36b",
  glowCore: "#ffe6cc",
} as const;
