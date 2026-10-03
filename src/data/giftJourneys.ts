export interface JourneyStep {
  id: number;
  iconName: string;
  title: string;
  description: string;
  timestamp: string;
  statusBadge?: string;
  proofBadge?: string;
  image?: string;
}

export interface GiftJourney {
  type: "item";
  tabLabel: string;
  headlineSummary: string;
  trackingId: string;
  ngoName: string;
  campaignName: string;
  location: string;
  steps: JourneyStep[];
}

export const GIFT_JOURNEY: GiftJourney = {
  type: "item",
  tabLabel: "📦 I gave an item",
  headlineSummary: "Sneha gave 12 blankets → Winter Relief Drive, Thane",
  trackingId: "CK-THN-8821",
  ngoName: "Asha Foundation",
  campaignName: "Winter Relief Drive",
  location: "Kopri Night Shelter, Thane",
  steps: [
    {
      id: 1,
      iconName: "Handshake",
      title: "Gift pledged",
      description: "You chose 12 blankets for Winter Relief Drive.",
      timestamp: "Mon, 10:14 AM",
      statusBadge: "Pledged & Logged",
    },
    {
      id: 2,
      iconName: "CheckCircle2",
      title: "NGO confirmed",
      description: "Asha Foundation accepted your pledge and shared a drop-off point 3.2 km away.",
      timestamp: "Mon, 11:02 AM",
      statusBadge: "Drop-off Matched",
    },
    {
      id: 3,
      iconName: "Truck",
      title: "Handed over",
      description: "You dropped the blankets off. The NGO scanned and logged them.",
      timestamp: "Tue, 6:30 PM",
      statusBadge: "In NGO Custody",
    },
    {
      id: 4,
      iconName: "MapPin",
      title: "On the ground",
      description: "Distributed at the Kopri night shelter to 12 families.",
      timestamp: "Thu, 9:45 PM",
      statusBadge: "Field Distributed",
    },
    {
      id: 5,
      iconName: "Camera",
      title: "Proof delivered",
      description: "Here's the photo, sent to you and everyone who gave to this drive.",
      timestamp: "Fri, 8:00 AM",
      statusBadge: "Loop Closed · 100% Proof",
      proofBadge: "📸 Sent to 48 donors",
      image: "/images/journey/item-proof-blankets.webp",
    },
  ],
};

export const GIFT_JOURNEYS = {
  item: GIFT_JOURNEY,
};

