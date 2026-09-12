// Central feature flags.
//
// Monetary CAMPAIGNS and online money DONATIONS are postponed per the In-Kind
// Donation Blueprint (the MVP focuses on verified in-kind item matching).
// All campaign/donation code is kept intact behind this flag — flip `money`
// back to `true` to re-enable those features everywhere at once.
//
// `bottomBlur` is the site-wide bottom fade band (SiteBottomBlur → GradualBlur).
// Back on as of 2026-09-12. It was switched off inside a broad "glass surface
// UI" commit with no reason recorded for the band itself, and the component and
// GradualBlur stayed mounted in layout.tsx throughout — so this is the flag
// coming back, not the feature being rebuilt.
//
// One band serves every width: SiteBottomBlur passes mobile / tablet / desktop /
// wide heights and GradualBlur picks between them at <=480 / <=768 / <=1024.
// It stays suppressed on the admin and super-admin panels, which have their own
// dark chrome.
export const FEATURES: { money: boolean; bottomBlur: boolean } = {
  money: false,
  bottomBlur: true,
};
