/**
 * The two four-step journeys shown by {@link HowCauseKindWorks}.
 *
 * <p><b>Every step describes something the product actually does.</b> Checked
 * against the backend and the handover feature before being written here: the
 * proximity match, the admin verification queue, the one-time code at handover
 * and the delivery certificate are all real. Nothing in this file is aspirational
 * copy — if a step stops being true the section has to change with it, which is
 * why the data is separated from the component that animates it.
 *
 * <p>Kept as plain data, with no JSX, so it can be imported by a test or a
 * future CMS-backed variant without dragging the animation code along.
 */

/** Which animated glyph a step draws. See `StepMotif` in the section. */
export type StepMotif = "box" | "pin" | "handshake" | "certificate";

export type JourneyStep = {
  /** Stable key — used for React keys and for the SVG node ids. */
  key: string;
  title: string;
  /** One line. The card is a signpost, not documentation. */
  body: string;
  motif: StepMotif;
};

export type Audience = "donor" | "donee";

export const JOURNEYS: Record<
  Audience,
  { toggleLabel: string; srLabel: string; steps: JourneyStep[] }
> = {
  donor: {
    toggleLabel: "I want to give",
    srLabel: "Steps for someone giving an item",
    steps: [
      {
        key: "list",
        title: "List your item",
        body: "Photograph the thing you already own and say what condition it's in.",
        motif: "box",
      },
      {
        key: "match",
        title: "We find someone within 10 km",
        body: "A verified person nearby who asked for exactly this.",
        motif: "pin",
      },
      {
        key: "handover",
        title: "Hand it over in person",
        body: "You meet, and a one-time code confirms it actually changed hands.",
        motif: "handshake",
      },
      {
        key: "certificate",
        title: "Get your impact certificate",
        body: "Issued on completion, with a number anyone can check.",
        motif: "certificate",
      },
    ],
  },
  donee: {
    toggleLabel: "I need something",
    srLabel: "Steps for someone receiving an item",
    steps: [
      {
        key: "verify",
        title: "Get verified",
        body: "ID and address are checked before you can post anything.",
        motif: "certificate",
      },
      {
        key: "post",
        title: "Post exactly what you need",
        body: "The specific item and how many — not a fundraising target.",
        motif: "box",
      },
      {
        key: "offer",
        title: "A nearby donor offers it",
        body: "Matched on proximity, so the handover stays local.",
        motif: "pin",
      },
      {
        key: "receive",
        title: "Receive it in person",
        body: "You confirm the quantity and condition you actually got.",
        motif: "handshake",
      },
    ],
  },
};

/**
 * Where each step sits inside the desktop stage.
 *
 * <p>Expressed in the SVG's own user units so the connecting path and the cards
 * cannot drift apart: both read from this one table, and the path's control
 * points are derived from it. A zig-zag rather than a straight row because a
 * straight row of four cards is the single most generic shape a "how it works"
 * section can take, and because the rise and fall gives the drawn line
 * somewhere to travel.
 */
export const STAGE_VIEWBOX = { width: 1200, height: 460 } as const;

export const NODES: { x: number; y: number }[] = [
  { x: 150, y: 330 },
  { x: 450, y: 140 },
  { x: 750, y: 330 },
  { x: 1050, y: 140 },
];

/** The snaking path through {@link NODES}, as an SVG `d` string. */
export const STAGE_PATH = [
  `M ${NODES[0].x} ${NODES[0].y}`,
  `C ${NODES[0].x + 110} ${NODES[0].y}, ${NODES[1].x - 150} ${NODES[1].y}, ${NODES[1].x} ${NODES[1].y}`,
  `S ${NODES[2].x - 110} ${NODES[2].y}, ${NODES[2].x} ${NODES[2].y}`,
  `S ${NODES[3].x - 110} ${NODES[3].y}, ${NODES[3].x} ${NODES[3].y}`,
].join(" ");

/**
 * Fraction of the drawn path at which each step is considered "reached".
 *
 * <p>Hand-tuned rather than evenly spaced: the curve's arc length is not
 * uniform between nodes, so even quarters would light the third card noticeably
 * before the line got there. The first is above zero so nothing is already lit
 * when the section pins.
 */
export const STEP_THRESHOLDS = [0.06, 0.34, 0.62, 0.9];
