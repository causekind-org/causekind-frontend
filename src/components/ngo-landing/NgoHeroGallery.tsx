"use client";

import { useReducedMotion } from "framer-motion";
import { ContainerScroll, ContainerSticky, GalleryCol, GalleryContainer } from "@/components/ui/animated-gallery";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/**
 * Free-licence photos (Pexels licence), stored as WebP in public/images/ngo-hero.
 * Credits:
 *  - food-for-children: pexels.com/photo/5909876 (Plato Terentev)
 *  - classroom-school-bags: pexels.com/photo/18012456 (Swastik Arora)
 *  - serving-community-meal: pexels.com/photo/36739564 (Vijay Krishnawat)
 *  - temple-donation-box: pexels.com/photo/19167496 (Shantanu Kumar)
 *  - langar-volunteers: pexels.com/photo/12540563 (Malcolm Hill)
 *  - children-learning-slates: pexels.com/photo/35558791 (Harshad Pendse)
 *  - children-community-meal: pexels.com/photo/35247605 (TEGHRA DACCHIN TOLA)
 *  - rural-classroom: pexels.com/photo/15119089 (Pallav Suthar)
 *  - temple-kitchen-volunteers: pexels.com/photo/36773178 (pierre matile)
 *  - children-lesson: pexels.com/photo/1895114 (Balljinder Singh)
 *  - schoolgirls-in-class: pexels.com/photo/3231359 (Yogendra Singh)
 *  - temple-donation-box-steps: pexels.com/photo/19167492 (Shantanu Kumar)
 * Order: columns take 4 each (desktop) or 6 each (phones); the two donation boxes never
 * share a row at either width. pos = focal point so faces stay in frame.
 */
const PHOTOS = [
  { src: "food-for-children.webp", alt: "A woman serving food to children seated on the ground in India", pos: "50% 40%" },
  { src: "classroom-school-bags.webp", alt: "Indian schoolchildren in uniform at their desks with school bags", pos: "50% 30%" },
  { src: "serving-community-meal.webp", alt: "A volunteer in a sari serving plates at a community meal", pos: "50% 25%" },
  { src: "temple-donation-box.webp", alt: "Red donation box outside a temple entrance in India", pos: "50% 60%" },
  { src: "langar-volunteers.webp", alt: "Volunteers serving a free community meal at a gurdwara", pos: "50% 30%" },
  { src: "children-learning-slates.webp", alt: "Children in a rural Indian school writing on slates", pos: "50% 30%" },
  { src: "children-community-meal.webp", alt: "Children sharing a free meal at a community centre in India", pos: "center" },
  { src: "rural-classroom.webp", alt: "Children listening in a rural classroom in Gujarat", pos: "50% 70%" },
  { src: "temple-donation-box-steps.webp", alt: "Donation box on the ground outside a temple in India", pos: "50% 60%" },
  { src: "temple-kitchen-volunteers.webp", alt: "Women volunteers preparing food together at an Indian temple", pos: "50% 30%" },
  { src: "children-lesson.webp", alt: "Young children sitting together for a lesson at an Indian school", pos: "50% 90%" },
  { src: "schoolgirls-in-class.webp", alt: "Indian schoolgirls in uniform listening in class", pos: "50% 30%" },
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
