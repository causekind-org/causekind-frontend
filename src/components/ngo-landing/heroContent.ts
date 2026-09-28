export interface HeroChip {
  text: string;
}

export interface HeroImageCard {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  aspectClass: string;
  chip?: HeroChip;
  isReal: boolean;
}

export interface TrustStripItem {
  icon: "ShieldCheck" | "Lock" | "Camera" | "MapPin" | "Handshake";
  title: string;
}

export interface HeroContentConfig {
  liveBadge: {
    itemsDeliveredDisplay: string;
    itemsTarget: number;
    text: string;
  };
  trustStrip: TrustStripItem[];
  columnA: HeroImageCard[];
  columnB: HeroImageCard[];
}

export const HERO_CONTENT: HeroContentConfig = {
  liveBadge: {
    itemsDeliveredDisplay: "3,180",
    itemsTarget: 3180,
    text: "3,180 items delivered this month",
  },
  trustStrip: [
    {
      icon: "ShieldCheck",
      title: "Legally Verified NGOs",
    },
    {
      icon: "Handshake",
      title: "Verified Drop-off Points",
    },
    {
      icon: "Camera",
      title: "Photo Proof on Every Delivery",
    },
    {
      icon: "MapPin",
      title: "Matched Near You",
    },
  ],
  columnA: [
    {
      id: "col-a-1",
      src: "/images/ngo-hero/col-a-1-blankets-pune.webp",
      alt: "Volunteers distributing warm blankets in Pune",
      width: 480,
      height: 640,
      aspectClass: "h-[240px] sm:h-[270px]",
      chip: { text: "📦 40 blankets · Delivered, Pune" },
      isReal: true,
    },
    {
      id: "col-a-2",
      src: "/images/ngo-hero/col-a-2-classroom-nashik.webp",
      alt: "Students receiving textbooks and learning kits in Nashik",
      width: 480,
      height: 360,
      aspectClass: "h-[180px] sm:h-[200px]",
      chip: { text: "📚 100 books · Classroom, Nashik" },
      isReal: true,
    },
    {
      id: "col-a-3",
      src: "/images/ngo-hero/col-a-3-ration-drive.webp",
      alt: "Ration drive packaging and community meal distribution",
      width: 480,
      height: 600,
      aspectClass: "h-[230px] sm:h-[260px]",
      chip: { text: "🍚 Ration drive · 62 families" },
      isReal: true,
    },
    {
      id: "col-a-4",
      src: "/images/ngo-hero/col-a-4-medical-kit.webp",
      alt: "Medical aid and health camp essential equipment",
      width: 480,
      height: 360,
      aspectClass: "h-[170px] sm:h-[195px]",
      isReal: true,
    },
    {
      id: "col-a-5",
      src: "/images/ngo-hero/col-a-5-elderly-warmth.webp",
      alt: "Elderly shelter community receiving warm clothing packages",
      width: 480,
      height: 600,
      aspectClass: "h-[220px] sm:h-[250px]",
      isReal: true,
    },
    {
      id: "col-a-6",
      src: "/images/ngo-hero/col-a-6-volunteer-team.webp",
      alt: "Dedicated NGO volunteer team coordinating relief drop-off",
      width: 480,
      height: 360,
      aspectClass: "h-[180px] sm:h-[200px]",
      isReal: true,
    },
  ],
  columnB: [
    {
      id: "col-b-1",
      src: "/images/ngo-hero/col-b-1-school-supplies.webp",
      alt: "Children in classroom with fresh educational kits",
      width: 480,
      height: 360,
      aspectClass: "h-[180px] sm:h-[200px]",
      isReal: true,
    },
    {
      id: "col-b-2",
      src: "/images/ngo-hero/col-b-2-community-aid.webp",
      alt: "Medical relief distribution by verified NGO partners",
      width: 480,
      height: 640,
      aspectClass: "h-[240px] sm:h-[270px]",
      chip: { text: "💊 Medicine kit · Verified NGO" },
      isReal: true,
    },
    {
      id: "col-b-3",
      src: "/images/ngo-hero/col-b-3-shelter-support.webp",
      alt: "Shelter home support and hygiene supply handoff",
      width: 480,
      height: 360,
      aspectClass: "h-[170px] sm:h-[190px]",
      isReal: true,
    },
    {
      id: "col-b-4",
      src: "/images/ngo-hero/col-b-4-health-camp.webp",
      alt: "Free health camp diagnostics and direct community support",
      width: 480,
      height: 600,
      aspectClass: "h-[230px] sm:h-[260px]",
      isReal: true,
    },
    {
      id: "col-b-5",
      src: "/images/ngo-hero/col-b-5-food-distribution.webp",
      alt: "Nutritious meal kits prepared for flood relief drive",
      width: 480,
      height: 360,
      aspectClass: "h-[180px] sm:h-[205px]",
      isReal: true,
    },
    {
      id: "col-b-6",
      src: "/images/ngo-hero/col-b-6-education-kits.webp",
      alt: "Young students receiving notebooks and art supplies",
      width: 480,
      height: 600,
      aspectClass: "h-[220px] sm:h-[245px]",
      isReal: true,
    },
  ],
};
