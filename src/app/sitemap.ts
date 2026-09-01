import { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blogData';
import { IN_KIND_CATEGORIES } from '@/lib/inKindCategories';

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
    '/give-safely',
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

  // The nine category pages.
  //
  // They were missing while every other indexable route was listed, which was
  // the odd one out rather than a deliberate exclusion: each is statically
  // generated, carries its own generateMetadata and declares
  // `/requests/category/<slug>` as its canonical. A canonical page absent from
  // the sitemap is a page asking to be indexed and never being offered.
  //
  // Derived from IN_KIND_CATEGORIES — the same registry generateStaticParams
  // uses — so adding a category cannot leave its page unlisted, and the URL here
  // cannot drift from the canonical the page emits.
  IN_KIND_CATEGORIES.forEach((category) => {
    sitemapEntries.push({
      url: `${baseUrl}/requests/category/${category.slug}`,
      lastModified: new Date(),
      // Editorial copy, not the request list beneath it — the page's own content
      // changes rarely even though what it links to changes constantly.
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

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

