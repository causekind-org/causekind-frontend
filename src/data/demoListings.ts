export interface DemoListing {
  title: string;
  category: string;
  quantity: number;
  condition: string;
  pincode: string;
  description: string;
  maximumDeliveryRadius: number;
  transportPayerPreference: string;
  /** ISO codes for location cascade */
  countryIso: string;
  stateIso: string;
  cityValue: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    title: "Class 10 NCERT Textbook Set",
    category: "Education",
    quantity: 3,
    condition: "Good",
    pincode: "411001",
    description:
      "Complete set of Class 10 NCERT books (Science, Maths, English, Hindi, Social Studies). Books are in good condition — minor pencil marks, no torn pages. Ideal for students who cannot afford new books.",
    maximumDeliveryRadius: 15,
    transportPayerPreference: "DONOR_PAYS",
    countryIso: "IN",
    stateIso: "IN-MH",
    cityValue: "Pune",
  },
  {
    title: "Men's Cotton Shirts (Size M)",
    category: "Clothing",
    quantity: 5,
    condition: "Like new",
    pincode: "560001",
    description:
      "5 lightly used formal cotton shirts, size medium. Worn only a few times. Washed and ironed. Suitable for someone looking for office-wear at no cost.",
    maximumDeliveryRadius: 10,
    transportPayerPreference: "TO_BE_DISCUSSED",
    countryIso: "IN",
    stateIso: "IN-KA",
    cityValue: "Bengaluru",
  },
  {
    title: "Wooden Study Table & Chair",
    category: "Furniture",
    quantity: 1,
    condition: "Fair",
    pincode: "110092",
    description:
      "Solid wood study table (120×60 cm) with a matching chair. Minor scratches on the surface but structurally very sturdy. Perfect for a student's room. Requires pickup — cannot deliver.",
    maximumDeliveryRadius: 5,
    transportPayerPreference: "DONEE_PAYS",
    countryIso: "IN",
    stateIso: "IN-DL",
    cityValue: "New Delhi",
  },
];

/** Returns a random demo listing from the list */
export function getRandomDemoListing(): DemoListing {
  return DEMO_LISTINGS[Math.floor(Math.random() * DEMO_LISTINGS.length)];
}
