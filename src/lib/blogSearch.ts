import type { BlogPost } from "@/data/blogData";

// Relevance-based search scoring shared by the blog listing page and the
// blog reading page's search box, so ranking behaves identically everywhere.
export function getBlogSearchScore(post: BlogPost, query: string): number {
  const cleanQuery = query.toLowerCase().trim();
  if (cleanQuery === "") return 0;

  let score = 0;
  const title = post.title.toLowerCase();
  const desc = post.description.toLowerCase();
  const cat = post.category.toLowerCase();
  const content = (post.content || "").toLowerCase();

  if (title === cleanQuery) score += 1000;
  if (title.includes(cleanQuery)) score += 500;
  if (desc.includes(cleanQuery)) score += 250;

  const words = cleanQuery.split(/\s+/).filter(Boolean);
  words.forEach((word) => {
    const wordRegex = new RegExp(`\\b${word}\\b`, "i");
    if (wordRegex.test(title)) {
      score += 150;
    } else if (title.includes(word)) {
      score += 80;
    }

    if (wordRegex.test(desc)) {
      score += 60;
    } else if (desc.includes(word)) {
      score += 30;
    }

    if (cat.includes(word)) score += 100;
    if (content.includes(word)) score += 20;
  });

  return score;
}

export function searchBlogPosts(posts: BlogPost[], query: string, limit?: number): BlogPost[] {
  if (query.trim() === "") return [];
  const ranked = posts
    .map((post) => ({ post, score: getBlogSearchScore(post, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.post);
  return limit ? ranked.slice(0, limit) : ranked;
}
