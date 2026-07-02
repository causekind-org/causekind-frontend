import { MockListingsCarousel } from "causekind-next";

// imageUrl intentionally null: next/image crashes when given a real image
// URL in this bundle (see tsup.config.ts + NOTES.md "next/image previews").
// The no-image fallback below is a real, legitimate state of the component.
const LISTINGS = [
  {
    id: 1,
    title: "Winter jackets (size M-L)",
    category: "Clothing",
    city: "Bengaluru",
    donorName: "Aarav S.",
    imageUrl: null,
  },
  {
    id: 2,
    title: "Children's story books",
    category: "Books",
    city: "Pune",
    donorName: "Meera K.",
    imageUrl: null,
  },
  {
    id: 3,
    title: "Study desk and chair",
    category: "Furniture",
    city: "Chennai",
    donorName: "Rohan D.",
    imageUrl: null,
  },
];

export function Default() {
  return <MockListingsCarousel listings={LISTINGS} />;
}
