export interface ProofPhoto {
  src: string;
  alt: string;
  date: string;
  time: string;
  area: string;
}

export interface ProofTimelineStep {
  step: string;
  title: string;
  date: string;
}

export interface ProofNgo {
  name: string;
  verified: boolean;
  impactScore: number;
}

export interface ProofDonors {
  count: number;
  initials: string[];
  remainingCount: number;
}

export interface ProofDetail {
  photos: ProofPhoto[];
  requestedItem: string;
  requestedQuantity: number;
  deliveredQuantity: number;
  timeline: ProofTimelineStep[];
  helped: string;
  ngo: ProofNgo;
  donors: ProofDonors;
  ngoNote: string;
}

export interface ProofCard {
  id: number;
  requested: string;
  category: string;
  deliveredImage: string;
  donorCount: number;
  location: string;
  detail: ProofDetail;
}

export const PROOF_CARDS: ProofCard[] = [
  {
    id: 1,
    requested: "50 Thermal Blankets for elderly shelter before peak winter",
    category: "Winter Relief",
    deliveredImage: "/images/hero-1.webp",
    donorCount: 14,
    location: "Kandivali West, Mumbai",
    detail: {
      photos: [
        {
          src: "/images/hero-1.webp",
          alt: "Handover of thermal blankets to shelter staff",
          date: "14 Nov",
          time: "6:42 PM",
          area: "Kandivali West",
        },
        {
          src: "/images/journey/item-proof-blankets.webp",
          alt: "Thermal blankets packaged and verified at receipt",
          date: "14 Nov",
          time: "6:15 PM",
          area: "Kandivali West",
        },
        {
          src: "/images/hero-3.webp",
          alt: "Shelter team arranging blankets in living quarters",
          date: "14 Nov",
          time: "5:50 PM",
          area: "Kandivali West",
        },
        {
          src: "/images/causekind-hero-handoff.webp",
          alt: "Direct handover confirmation with donor coordinator",
          date: "14 Nov",
          time: "6:45 PM",
          area: "Kandivali West",
        },
      ],
      requestedItem: "50 thermal blankets",
      requestedQuantity: 50,
      deliveredQuantity: 50,
      timeline: [
        { step: "Posted", title: "You start a drive", date: "2 Nov" },
        { step: "Fully pledged", title: "Donors nearby pledge them", date: "9 Nov" },
        { step: "Items received", title: "They drop off, and you confirm receipt", date: "12 Nov" },
        { step: "Handed over", title: "You upload a handover photo", date: "14 Nov" },
        { step: "Proof uploaded", title: "Every donor gets the photo and their certificate", date: "15 Nov" },
      ],
      helped: "Handed to 50 residents of Kandivali Elder Shelter",
      ngo: {
        name: "Asha Foundation",
        verified: true,
        impactScore: 4.8,
      },
      donors: {
        count: 14,
        initials: ["R.K.", "S.P.", "M.I.", "F.S.", "A.M.", "P.R."],
        remainingCount: 8,
      },
      ngoNote:
        "Our residents slept warm the night the blankets arrived. Thank you for making it happen.",
    },
  },
  {
    id: 2,
    requested: "100 Grade 8 Science & Mathematics curriculum textbooks",
    category: "Education",
    deliveredImage: "/images/hero-7.webp",
    donorCount: 8,
    location: "Shivaji Nagar, Pune",
    detail: {
      photos: [
        {
          src: "/images/hero-7.webp",
          alt: "Textbooks distributed in the community classroom",
          date: "20 Oct",
          time: "11:30 AM",
          area: "Shivaji Nagar",
        },
        {
          src: "/images/hero-4.webp",
          alt: "Curriculum textbooks organized by subject",
          date: "20 Oct",
          time: "11:10 AM",
          area: "Shivaji Nagar",
        },
        {
          src: "/images/hero-2.webp",
          alt: "Students receiving study materials at learning centre",
          date: "20 Oct",
          time: "11:45 AM",
          area: "Shivaji Nagar",
        },
      ],
      requestedItem: "100 curriculum textbooks",
      requestedQuantity: 100,
      deliveredQuantity: 100,
      timeline: [
        { step: "Posted", title: "You start a drive", date: "5 Oct" },
        { step: "Fully pledged", title: "Donors nearby pledge them", date: "12 Oct" },
        { step: "Items received", title: "They drop off, and you confirm receipt", date: "18 Oct" },
        { step: "Handed over", title: "You upload a handover photo", date: "20 Oct" },
        { step: "Proof uploaded", title: "Every donor gets the photo and their certificate", date: "21 Oct" },
      ],
      helped: "Handed to 100 students of Shivaji Nagar Community Learning Centre",
      ngo: {
        name: "Pratham Shiksha Trust",
        verified: true,
        impactScore: 4.9,
      },
      donors: {
        count: 8,
        initials: ["V.N.", "A.D.", "T.K.", "S.M.", "K.B.", "N.G."],
        remainingCount: 2,
      },
      ngoNote:
        "Every student now has their own textbook for the semester board prep. Direct giving changes everything.",
    },
  },
  {
    id: 3,
    requested: "3 Pediatric Mobility Wheelchairs for community outreach clinic",
    category: "Medical Aid",
    deliveredImage: "/images/medical-1.webp",
    donorCount: 6,
    location: "Andheri East, Mumbai",
    detail: {
      photos: [
        {
          src: "/images/medical-1.webp",
          alt: "Pediatric wheelchairs received at clinic reception",
          date: "5 Sep",
          time: "3:15 PM",
          area: "Andheri East",
        },
        {
          src: "/images/hero-5.webp",
          alt: "Clinical team fitting the mobility support equipment",
          date: "5 Sep",
          time: "2:45 PM",
          area: "Andheri East",
        },
        {
          src: "/images/hero-6.webp",
          alt: "Outreach health staff with delivered clinic supplies",
          date: "5 Sep",
          time: "3:20 PM",
          area: "Andheri East",
        },
      ],
      requestedItem: "3 pediatric mobility wheelchairs",
      requestedQuantity: 3,
      deliveredQuantity: 3,
      timeline: [
        { step: "Posted", title: "You start a drive", date: "22 Aug" },
        { step: "Fully pledged", title: "Donors nearby pledge them", date: "28 Aug" },
        { step: "Items received", title: "They drop off, and you confirm receipt", date: "3 Sep" },
        { step: "Handed over", title: "You upload a handover photo", date: "5 Sep" },
        { step: "Proof uploaded", title: "Every donor gets the photo and their certificate", date: "6 Sep" },
      ],
      helped: "Handed to 3 pediatric patients at Andheri Community Health Centre",
      ngo: {
        name: "Samvedna Health Initiative",
        verified: true,
        impactScore: 4.9,
      },
      donors: {
        count: 6,
        initials: ["D.P.", "M.K.", "A.S.", "R.V.", "S.J.", "P.M."],
        remainingCount: 0,
      },
      ngoNote:
        "Mobility gives these children their independence and dignity back. Our deepest gratitude to every donor.",
    },
  },
  {
    id: 4,
    requested: "5 Heavy-Duty Sewing Machines for women's livelihood centre",
    category: "Livelihood",
    deliveredImage: "/images/hero-3.webp",
    donorCount: 11,
    location: "Thane West",
    detail: {
      photos: [
        {
          src: "/images/hero-3.webp",
          alt: "Sewing machines set up in women empowerment workshop",
          date: "18 Aug",
          time: "4:10 PM",
          area: "Thane West",
        },
        {
          src: "/images/hero-1.webp",
          alt: "Equipment inspection and verification by instructor",
          date: "18 Aug",
          time: "3:40 PM",
          area: "Thane West",
        },
        {
          src: "/images/hero-7.webp",
          alt: "Trainees starting their first vocational batch",
          date: "18 Aug",
          time: "4:25 PM",
          area: "Thane West",
        },
        {
          src: "/images/causekind-hero-handoff.webp",
          alt: "Handover certificate signing with center supervisor",
          date: "18 Aug",
          time: "4:30 PM",
          area: "Thane West",
        },
      ],
      requestedItem: "5 heavy-duty sewing machines",
      requestedQuantity: 5,
      deliveredQuantity: 5,
      timeline: [
        { step: "Posted", title: "You start a drive", date: "1 Aug" },
        { step: "Fully pledged", title: "Donors nearby pledge them", date: "10 Aug" },
        { step: "Items received", title: "They drop off, and you confirm receipt", date: "16 Aug" },
        { step: "Handed over", title: "You upload a handover photo", date: "18 Aug" },
        { step: "Proof uploaded", title: "Every donor gets the photo and their certificate", date: "19 Aug" },
      ],
      helped: "Handed to 5 vocational trainees of Thane Women's Empowerment Batch",
      ngo: {
        name: "Swavalamban Mahila Sangh",
        verified: true,
        impactScore: 4.7,
      },
      donors: {
        count: 11,
        initials: ["J.R.", "H.M.", "S.C.", "T.P.", "V.L.", "A.N."],
        remainingCount: 5,
      },
      ngoNote:
        "These machines enable 5 mothers to earn sustainable livelihood from home starting this week.",
    },
  },
];
