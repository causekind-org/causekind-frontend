// Central feature flags.
//
// Monetary CAMPAIGNS and online money DONATIONS are postponed per the In-Kind
// Donation Blueprint (the MVP focuses on verified in-kind item matching).
// All campaign/donation code is kept intact behind this flag — flip `money`
// back to `true` to re-enable those features everywhere at once.
//
// `bottomBlur` is the site-wide bottom fade band (SiteBottomBlur → GradualBlur).
// Temporarily switched off; the component and GradualBlur are untouched and
// still mounted in layout.tsx, so flipping this back to `true` restores the band
// exactly as it was.
// `ngoRegistration`: NGO self-signup. Off unless NEXT_PUBLIC_NGO_ENABLED="true"
// (owner, 2026-10-10): production shows every NGO sign-up button as "Coming soon"
// and the backend refuses NGO signup (app.ngo.signup-enabled); staging turns both on.
//
// `cinematicLanding` is the scroll-driven film hidden under the home hero ("One
// small thing can become a big thing" → "It finds its person"; see
// src/sections/landing/cinematic/README.md). On scroll the hero slides off it
// and the film plays (src/components/cinematic/HeroFilm.tsx). While false, its
// code is not even downloaded — HeroFilm loads it with next/dynamic.
export const FEATURES: {
  money: boolean;
  bottomBlur: boolean;
  ngoRegistration: boolean;
  cinematicLanding: boolean;
} = {
  money: false,
  bottomBlur: false,
  ngoRegistration: process.env.NEXT_PUBLIC_NGO_ENABLED === "true",
  cinematicLanding: true,
};
