export type SampleDriveItem = {
  name: string;
  needed: number;
  pledged: number;
  received: number;
};

export type SampleNgoDrive = {
  id: string | number;
  title: string;
  status: string; // e.g. "OPEN", "ACTIVE", "AWAITING_MATCH_APPROVAL", "DRAFT", "FULFILLED"
  tag?: string; // "Live", "Awaiting approval", "Draft", "Fulfilled"
  urgent?: boolean;
  imageUrl?: string;
  category: string;
  items: SampleDriveItem[];
  endDate?: string; // e.g. "ends in 6 days", or actual string
  dropOffArea?: string;
  dropOffTimings?: string;
  beneficiary?: string;
  condition?: string;
  donorsPledged?: number;
  fulfilledDate?: string;
  proofStatus?: string;
  proofDueInHours?: number;
  donorsThanked?: number;
  proofLink?: string;
  createdAt: string; // for sorting
};

export const sampleLiveDrives: SampleNgoDrive[] = [
  {
    id: "sample_l1",
    title: "Winter blankets for Kandivali Elder Shelter",
    status: "OPEN",
    tag: "Live",
    urgent: true,
    imageUrl: "/images/ngo-hero/col-a-1-blankets-pune.webp",
    category: "Clothing",
    items: [
      { name: "Blankets", needed: 40, pledged: 28, received: 12 },
      { name: "Sweaters", needed: 20, pledged: 15, received: 6 },
    ],
    endDate: "ends in 6 days",
    dropOffArea: "Kandivali West",
    dropOffTimings: "10 AM – 6 PM",
    beneficiary: "50 residents",
    condition: "new or gently used",
    donorsPledged: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "sample_l2",
    title: "School kits for Grade 5, Virar",
    status: "OPEN",
    tag: "Live",
    category: "Education",
    imageUrl: "/images/ngo-hero/col-b-1-school-supplies.webp",
    items: [
      { name: "Notebooks", needed: 60, pledged: 60, received: 40 },
      { name: "Geometry boxes", needed: 30, pledged: 12, received: 0 },
    ],
    endDate: "ends in 12 days",
    dropOffArea: "Virar East",
    dropOffTimings: "11 AM – 5 PM",
    beneficiary: "30 students",
    condition: "new only",
    donorsPledged: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "sample_l3",
    title: "Monsoon ration kits for Nalasopara families",
    status: "AWAITING_MATCH_APPROVAL",
    tag: "Awaiting approval",
    category: "Relief",
    imageUrl: "/images/journey/money-proof-ration.webp",
    items: [
      { name: "Ration kits", needed: 25, pledged: 0, received: 0 },
    ],
    endDate: "ends in 20 days",
    beneficiary: "25 families",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "sample_l4",
    title: "Books for the community library",
    status: "DRAFT",
    tag: "Draft",
    category: "Education",
    imageUrl: "/images/stories/education.webp",
    items: [
      { name: "Storybooks", needed: 100, pledged: 0, received: 0 },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

export const sampleFulfilledDrives: SampleNgoDrive[] = [
  {
    id: "sample_f1",
    title: "Thermal blankets for the night shelter, Thane",
    status: "FULFILLED",
    tag: "Fulfilled",
    category: "Clothing",
    imageUrl: "/images/journey/item-proof-blankets.webp",
    items: [
      { name: "Blankets", needed: 50, pledged: 50, received: 50 },
    ],
    fulfilledDate: "14 Nov",
    proofStatus: "uploaded",
    donorsThanked: 14,
    proofLink: "/proof/sample_f1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "sample_f2",
    title: "Sewing machines for a women's livelihood centre",
    status: "FULFILLED",
    tag: "Fulfilled",
    category: "Livelihood",
    imageUrl: "/images/ngo-hero/col-b-2-community-aid.webp",
    items: [
      { name: "Sewing machines", needed: 5, pledged: 5, received: 5 },
    ],
    fulfilledDate: "26 Sep",
    proofStatus: "due",
    proofDueInHours: 36,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
];
