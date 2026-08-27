import { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blogData';

/**
 * Every URL here must be canonical and final — the same www host the canonical
 * tags use, and never one that redirects. Two rules follow from that:
 *
 * <p>1. Nothing that 3xx's belongs in this list. `/help` permanently redirects
 * to `/faq`, so `/faq` is listed and `/help` is not.
 *
 * <p>2. Auth-gated and utility routes (`/login`, `/register`, `/dashboard`,
 * `/profile`, `/thank-you`, the "new listing/request" wizards) are omitted. They render
 * nothing indexable for a signed-out crawler, and listing them burns crawl
 * budget that should go to the articles.
 *
 * <p>Blog posts are derived from blogData rather than listed by hand, so a new
 * article appears here automatically the moment it is added.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.causekind.com';

  // Root is '', not '/'. Next normalises the homepage's canonical tag to
  // https://www.causekind.com with no trailing slash, and the sitemap has to
  // name the identical string or the two disagree about the same page.
  const routes = [
    '',
    '/about',
    '/blog',
    '/campaigns',
    '/donate',
    '/privacy',
    '/terms',
    '/refund',
    '/faq',
    '/contact',
    '/items',
    '/offers',
    '/requests',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Add dynamic blog posts
  blogPosts.forEach((post) => {
    sitemapEntries.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedDate),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  return sitemapEntries;
}

