import { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blogData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://causekind.com';
  
  const routes = [
    '',
    '/about',
    '/blog',
    '/campaigns',
    '/donate',
    '/help',
    '/privacy',
    '/terms',
    '/refund',
    '/faq',
    '/contact',
    '/login',
    '/register',
    '/thank-you',
    '/items',
    '/offers',
    '/requests',
    '/campaigns/new',
    '/items/new',
    '/requests/new',
    '/forgot-password',
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

