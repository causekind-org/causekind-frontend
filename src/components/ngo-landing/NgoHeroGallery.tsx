"use client";

import { useReducedMotion } from "framer-motion";
import { ContainerScroll, ContainerSticky, GalleryCol, GalleryContainer } from "@/components/ui/animated-gallery";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/** Free-licence photos from Pexels, stored as WebP in public/images/ngo-hero. */
// Order: columns take 4 each (desktop) or 6 each (phones); similar photos (the two
// donation boxes, the two clothes boxes) sit far apart. pos = focal point so faces stay in frame.
const PHOTOS = [
  { src: "temple-donation-box.webp", alt: "Red donation box outside a temple entrance in India", pos: "50% 60%" },
  { src: "volunteers-sorting-aid.webp", alt: "Volunteers sorting food and aid boxes for a donation drive", pos: "center top" },
  { src: "woman-clothes-donation.webp", alt: "Smiling volunteer holding a box of donated clothes", pos: "50% 20%" },
  { src: "volunteer-carrying-box.webp", alt: "Volunteer carrying a box of donated items", pos: "50% 20%" },
  { src: "rural-aid-package.webp", alt: "Elderly women and a child receiving an aid package in a village", pos: "50% 25%" },
  { src: "volunteers-collecting-clothes.webp", alt: "Two young volunteers collecting clothes for donation", pos: "50% 15%" },
  { src: "volunteers-outdoor-boxes.webp", alt: "Volunteers organising donation boxes outdoors", pos: "center top" },
  { src: "volunteers-handing-box.webp", alt: "Volunteers handing over a box of clothes and toys", pos: "50% 20%" },
  { src: "volunteers-checking-goods.webp", alt: "Volunteers checking donated goods in a box", pos: "50% 20%" },
  { src: "clothes-donation-box.webp", alt: "Donation box filled with colourful clothes", pos: "center" },
  { src: "volunteers-sorting-donations.webp", alt: "Group of volunteers sorting donations indoors", pos: "center top" },
  { src: "temple-donation-box-ground.webp", alt: "Donation box on the ground outside a temple in India", pos: "50% 60%" },
];

function Photo({ src, alt, pos }: { src: string; alt: string; pos: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static local WebP, lazy-loaded
    <img
      src={`/images/ngo-hero/${src}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: pos }}
      className="aspect-[4/3] block h-auto max-h-full w-full rounded-md object-cover shadow ring-1 ring-black/5 dark:ring-white/10 dark:brightness-90"
    />
  );
}

/**
 * The NGO hero's photo gallery (animated scroll gallery). Visual only. Reduced motion:
 * a still grid. Phones: two columns and a shorter scroll.
 */
export function NgoHeroGallery() {
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const cols = desktop ? [PHOTOS.slice(0, 4), PHOTOS.slice(4, 8), PHOTOS.slice(8, 12)] : [PHOTOS.slice(0, 6), PHOTOS.slice(6, 12)];

  if (reduced) {
    return (
      <div aria-label="NGOs and volunteers donating items" role="group"
        className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-10">
        {PHOTOS.map((p) => <Photo key={p.src} {...p} />)}
      </div>
    );
  }

  return (
    <div role="group" aria-label="NGOs and volunteers donating items" className="relative">
      <ContainerScroll className={desktop ? "h-[300vh]" : "h-[180vh]"}>
        <ContainerSticky className="h-svh px-2 sm:px-4">
          <GalleryContainer className={desktop ? "" : "grid-cols-2"}>
            {cols.map((photos, i) => (
              <GalleryCol
                key={i}
                yRange={i % 2 === 1 ? ["15%", "5%"] : ["-10%", "2%"]}
                className={i % 2 === 1 ? "mt-[-50%]" : "-mt-2"}
              >
                {photos.map((p) => <Photo key={p.src} {...p} />)}
              </GalleryCol>
            ))}
          </GalleryContainer>
        </ContainerSticky>
      </ContainerScroll>
    </div>
  );
}
