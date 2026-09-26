/**
 * The photographs on the "Where does my support go?" table.
 *
 * Real photos from CauseKind drives (public/images). Captions say only what
 * the picture shows — no counts, outcomes or impact claims. To add a photo,
 * add an entry here: the desktop table has seven slots (SLOTS below) and the
 * phone pile takes any number.
 *
 * `public/images/sdnkasnd.webp` is a byte-identical copy of the "4.54.05 PM"
 * photo and is deliberately not listed.
 */

export type Frame = "print" | "tape" | "bare" | "corners";
export type Depth = "back" | "mid" | "front";

export type Photo = {
  id: string;
  src: string;
  /** Intrinsic pixel size, for the aspect ratio. */
  w: number;
  h: number;
  alt: string;
  category: string;
  caption: string;
  detail?: string;
  /** Handwritten margin note. */
  note?: string;
  frame: Frame;
};

export const PHOTOS: Photo[] = [
  {
    id: "notebooks",
    src: "/images/WhatsApp Image 2026-09-25 at 4.41.50 PM.webp",
    w: 1600,
    h: 1200,
    alt: "Children at a CauseKind drive holding new notebooks and pens, under the CauseKind banner.",
    category: "Education",
    caption: "Notebooks and pens, handed over in person.",
    detail: "Straight into the hands they were meant for — no warehouse in between.",
    note: "education",
    frame: "print",
  },
  {
    id: "rations-hand",
    src: "/images/dajsldkasldkaskd.webp",
    w: 720,
    h: 1280,
    alt: "A volunteer hands ration packets to a woman at an outdoor CauseKind drive.",
    category: "Relief",
    caption: "Rations, passed from one pair of hands to another.",
    detail: "The handover is the moment the giver can see exactly where it went.",
    note: "hand to hand",
    frame: "tape",
  },
  {
    id: "family",
    src: "/images/WhatsApp Image 2026-09-25 at 4.54.05 PM.webp",
    w: 960,
    h: 1280,
    alt: "A woman holding her young child and ration packets at a CauseKind drive, volunteers behind her.",
    category: "Relief",
    caption: "Everyday essentials, for a family nearby.",
    note: "everyday needs",
    frame: "bare",
  },
  {
    id: "bench",
    src: "/images/WhatsApp Image 2026-09-25 at 4.41.47 PM.webp",
    w: 1600,
    h: 1200,
    alt: "Volunteers sitting on a bench with a young boy beneath the CauseKind banner.",
    category: "Volunteers",
    caption: "The people who turn up for a drive.",
    note: "the people",
    frame: "corners",
  },
  {
    id: "community",
    src: "/images/WhatsApp Image 2026-09-25 at 4.41.46 PM.webp",
    w: 1600,
    h: 1200,
    alt: "A large group of volunteers and neighbourhood children together under the CauseKind banner.",
    category: "Community",
    caption: "Volunteers and the neighbourhood they came to.",
    detail: "CauseKind is an initiative by Sahas Charitable Trust.",
    note: "community",
    frame: "tape",
  },
  {
    id: "local",
    src: "/images/WhatsApp Image 2026-09-25 at 4.56.04 PM.webp",
    w: 1080,
    h: 810,
    alt: "A team of CauseKind volunteers standing in front of the banner at an outdoor drive.",
    category: "Local",
    caption: "Set up where people live — not somewhere they have to travel to.",
    note: "local",
    frame: "print",
  },
];

/**
 * Desktop placement, in percent of the 16:10 stage (x, w of its width; y of
 * its height). `over` puts a photo in front of the headline; otherwise it sits
 * behind it. Hand-composed around the title block, which spans roughly x 6–62,
 * y 27–67: slot 3 covers the end of "SUPPORT", slot 4 sits behind "GO?".
 */
export type Slot = {
  x: number;
  y: number;
  w: number;
  rot: number;
  depth: Depth;
  over: boolean;
  /** Where the handwritten note sits, relative to the photo. */
  note: "above-left" | "below-left" | "below-right" | "above-right" | "left";
  /** How it arrives: see `.enter` in the stylesheet. */
  enter: "rise" | "side" | "drop" | "forward" | "under" | "turn" | "last";
};

export const SLOTS: Slot[] = [
  { x: 63, y: 4, w: 24, rot: 4, depth: "front", over: true, note: "above-left", enter: "rise" },
  { x: 44, y: -4, w: 12.5, rot: -4, depth: "mid", over: false, note: "left", enter: "side" },
  { x: 53, y: 39, w: 15, rot: 6, depth: "front", over: true, note: "below-left", enter: "drop" },
  { x: 16, y: 61, w: 20, rot: -5, depth: "back", over: false, note: "below-left", enter: "forward" },
  { x: 79, y: 35, w: 23, rot: -3, depth: "mid", over: false, note: "above-right", enter: "under" },
  { x: 63, y: 72, w: 21, rot: 3, depth: "front", over: true, note: "below-right", enter: "turn" },
  { x: 38, y: 73, w: 17, rot: 7, depth: "back", over: false, note: "below-left", enter: "last" },
];
