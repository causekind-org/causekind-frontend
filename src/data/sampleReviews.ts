export interface Review {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
}

export const SAMPLE_REVIEWS: Review[] = [
  {
    id: "rev-1",
    name: "Ramesh K.",
    role: "Donor · Mumbai",
    rating: 5,
    text: "I gave 5 books to a campaign I saw was 2 books short. A week later I got a photo of all 100 books in a classroom. That photo is why I gave again.",
  },
  {
    id: "rev-2",
    name: "Anjali T.",
    role: "NGO Coordinator · Pune",
    rating: 5,
    text: "We used to post our needs on WhatsApp groups and hope. Now donors find us directly, and they trust us because the platform verified us first.",
  },
  {
    id: "rev-3",
    name: "Sneha P.",
    role: "Donor · Thane",
    rating: 5,
    text: "I had a pile of winter clothes and no idea who actually needed them. CauseKind matched me with a shelter 4 km away. Dropped them off the same evening.",
  },
  {
    id: "rev-4",
    name: "Farhan S.",
    role: "Volunteer · Nagpur",
    rating: 5,
    text: "The delivery photo feature is brilliant. Our volunteers upload proof once, and every donor who helped gets it. No more chasing people for updates.",
  },
  {
    id: "rev-5",
    name: "Meera I.",
    role: "Donor · Bengaluru",
    rating: 5,
    text: "I liked seeing exactly what the school needed. I dropped off 10 notebooks and saw them being handed out a week later.",
  },
  {
    id: "rev-6",
    name: "Rohit D.",
    role: "Donor · Virar",
    rating: 5,
    text: "Simple, fast, and honest. I gave a box of groceries and a bag of school clothes, and both reached the same family.",
  },
  {
    id: "rev-7",
    name: "Kavita N.",
    role: "Trustee, Asha Foundation · Nashik",
    rating: 5,
    text: "Verification took one afternoon. Our first campaign got every item it needed in 9 days, and donors thanked us after seeing the photos.",
  },
  {
    id: "rev-8",
    name: "Arjun M.",
    role: "Donor · Delhi",
    rating: 5,
    text: "Finally a giving platform that doesn't go silent after you give. I knew exactly where my blankets went.",
  },
  {
    id: "rev-9",
    name: "Pooja R.",
    role: "Donor · Hyderabad",
    rating: 5,
    text: "Found a medicine drive near my office within a minute. The whole experience felt trustworthy from start to finish.",
  },
  {
    id: "rev-10",
    name: "Sunil V.",
    role: "Program Lead, Hope Kitchen · Chennai",
    rating: 5,
    text: "The Verified Impact Score gave us credibility social media never could. First-time donors now give with confidence.",
  },
];
