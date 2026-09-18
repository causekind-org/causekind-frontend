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
export const FEATURES: { money: boolean; bottomBlur: boolean } = {
  money: false,
  bottomBlur: false,
};
