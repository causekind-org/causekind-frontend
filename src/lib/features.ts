// Central feature flags.
//
// Monetary CAMPAIGNS and online money DONATIONS are postponed per the In-Kind
// Donation Blueprint (the MVP focuses on verified in-kind item matching).
// All campaign/donation code is kept intact behind this flag — flip `money`
// back to `true` to re-enable those features everywhere at once.
export const FEATURES: { money: boolean } = {
  money: false,
};
