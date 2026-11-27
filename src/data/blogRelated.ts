/**
 * "Related guides" under a blog post: the request category the guide leads to
 * and up to three sibling posts. Hand-picked so posts that share a topic link
 * to each other and to their /requests/category page (internal links help
 * Google find and rank them). Posts not listed here show no block.
 */
export const BLOG_RELATED: Record<string, { category?: string; posts: string[] }> = {
  "how-to-donate-furniture-india": { category: "furniture", posts: ["what-to-do-with-old-items-india", "how-to-organise-item-donation-drive-india", "how-to-verify-ngo-before-donating-india"] },
  "how-to-donate-wheelchairs-india": { category: "medical-aid", posts: ["how-to-donate-loved-ones-belongings-india", "what-to-do-with-old-items-india", "how-to-verify-ngo-before-donating-india"] },
  "what-to-do-with-old-items-india": { category: "household", posts: ["how-to-donate-furniture-india", "how-to-donate-kitchen-utensils-india", "complete-guide-donating-clothes-india"] },
  "how-to-help-ngo-without-money-india": { posts: ["how-to-organise-item-donation-drive-india", "the-ripple-effect-of-opportunity", "how-to-verify-ngo-before-donating-india"] },
  "what-to-donate-each-month-india": { category: "relief", posts: ["how-to-donate-blankets-india", "monsoon-giving-most-neglected-season", "what-students-need-in-january-and-february"] },
  "how-to-donate-books-india": { category: "education", posts: ["what-students-need-in-january-and-february", "donating-laptops-to-students-india", "the-ripple-effect-of-opportunity"] },
  "how-to-donate-loved-ones-belongings-india": { category: "clothing", posts: ["how-to-donate-wheelchairs-india", "how-to-donate-furniture-india", "complete-guide-donating-clothes-india"] },
  "how-to-donate-sports-equipment-india": { category: "sports", posts: ["how-to-donate-books-india", "how-to-organise-item-donation-drive-india", "what-to-do-with-old-items-india"] },
  "how-to-donate-kitchen-utensils-india": { category: "household", posts: ["what-to-do-with-old-items-india", "how-to-donate-furniture-india", "how-to-donate-blankets-india"] },
  "how-to-organise-item-donation-drive-india": { category: "relief", posts: ["how-to-help-ngo-without-money-india", "how-to-donate-blankets-india", "what-to-donate-each-month-india"] },
  "safely-wipe-and-donate-smartphones-laptops": { category: "electronics", posts: ["how-to-erase-personal-data-before-donation-india", "donating-laptops-to-students-india", "acceptable-condition-donated-devices-india"] },
  "how-to-erase-personal-data-before-donation-india": { category: "electronics", posts: ["how-to-donate-laptops-electronics-india", "donating-laptops-to-students-india", "acceptable-condition-donated-devices-india"] },
  "the-ripple-effect-of-opportunity": { category: "education", posts: ["how-to-donate-books-india", "donating-laptops-to-students-india", "how-to-help-ngo-without-money-india"] },
  "how-to-donate-blankets-india": { category: "relief", posts: ["what-to-donate-each-month-india", "monsoon-giving-most-neglected-season", "how-to-organise-item-donation-drive-india"] },
};
