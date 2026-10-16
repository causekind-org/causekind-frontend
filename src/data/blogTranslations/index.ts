"use client";

import { blogPosts, insiderTips } from "@/data/blogData";
import { locales, type Locale } from "@/i18n/config";
import { translateTextStrict } from "@/lib/translation/client";
import { translateHtmlStrict } from "@/hooks/useDynamicTranslation";

export type BlogTranslation = { title: string; description: string; category: string; content: string };
export type InsiderTipTranslation = { title: string; description: string };

const posts = new Map<string, BlogTranslation>();
const tips = new Map<string, InsiderTipTranslation>();
const pendingPosts = new Map<string, Promise<BlogTranslation | null>>();
const pendingTips = new Map<string, Promise<InsiderTipTranslation | null>>();
const articles = new Map<string, BlogTranslation>();
const pendingArticles = new Map<string, Promise<BlogTranslation | null>>();
const supported = (locale: string) => locale !== "en" && locales.includes(locale as Locale);
const postKey = (locale: string, post: (typeof blogPosts)[number]) =>
  JSON.stringify([locale, post.slug, post.title, post.description, post.category]);
const tipKey = (locale: string, tip: (typeof insiderTips)[number]) =>
  JSON.stringify([locale, tip.slug, tip.title, tip.description]);

// Pre-translated files in public/blog-translations/<locale>.json come first:
// free, and already reviewed in production. Google only covers posts/tips
// missing from them (e.g. articles added after the last file generation).
type StaticBlogFile = Record<string, BlogTranslation | Record<string, InsiderTipTranslation>>;
const TIPS_KEY = "__insider_tips__";
const staticFiles = new Map<string, Promise<StaticBlogFile>>();

function loadStaticFile(locale: string): Promise<StaticBlogFile> {
  let file = staticFiles.get(locale);
  if (!file) {
    file = fetch(`/blog-translations/${locale}.json`)
      .then((response) => response.ok ? response.json() as Promise<StaticBlogFile> : {})
      .catch(() => ({}));
    staticFiles.set(locale, file);
  }
  return file;
}

async function staticPost(locale: string, slug: string): Promise<BlogTranslation | null> {
  const entry = (await loadStaticFile(locale))[slug] as BlogTranslation | undefined;
  return entry && typeof entry.title === "string" && typeof entry.content === "string" ? entry : null;
}

async function staticTip(locale: string, slug: string): Promise<InsiderTipTranslation | null> {
  const entry = ((await loadStaticFile(locale))[TIPS_KEY] as Record<string, InsiderTipTranslation> | undefined)?.[slug];
  return entry && typeof entry.title === "string" ? entry : null;
}

async function loadPost(locale: string, post: (typeof blogPosts)[number]): Promise<BlogTranslation | null> {
  if (!supported(locale)) return null;
  const key = postKey(locale, post);
  const cached = posts.get(key);
  if (cached) return cached;
  const existing = pendingPosts.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const fromFile = await staticPost(locale, post.slug);
      if (fromFile) {
        const result = { title: fromFile.title, description: fromFile.description, category: fromFile.category, content: "" };
        posts.set(key, result);
        return result;
      }
      const [title, description, category] = await Promise.all(
        [post.title, post.description, post.category].map((text) => translateTextStrict(text, locale)),
      );
      const result = { title, description, category, content: "" };
      posts.set(key, result);
      return result;
    } catch { return null; }
  })();
  pendingPosts.set(key, promise);
  try { return await promise; }
  finally { pendingPosts.delete(key); }
}

async function loadTip(locale: string, tip: (typeof insiderTips)[number]): Promise<InsiderTipTranslation | null> {
  if (!supported(locale)) return null;
  const key = tipKey(locale, tip);
  const cached = tips.get(key);
  if (cached) return cached;
  const existing = pendingTips.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const fromFile = await staticTip(locale, tip.slug);
      if (fromFile) { tips.set(key, fromFile); return fromFile; }
      const [title, description] = await Promise.all(
        [tip.title, tip.description].map((text) => translateTextStrict(text, locale)),
      );
      const result = { title, description };
      tips.set(key, result);
      return result;
    } catch { return null; }
  })();
  pendingTips.set(key, promise);
  try { return await promise; }
  finally { pendingTips.delete(key); }
}

/** Warm card metadata only. Article HTML never loads on the listing page. */
export async function preloadBlogTranslations(locale: string): Promise<void> {
  if (!supported(locale)) return;
  await Promise.all([
    ...blogPosts.map((post) => loadPost(locale, post)),
    ...insiderTips.map((tip) => loadTip(locale, tip)),
  ]);
}

/** The reader passes only the current article's already-loaded English HTML. */
export async function fetchBlogTranslation(locale: string, slug: string, content?: string): Promise<BlogTranslation | null> {
  const post = blogPosts.find((candidate) => candidate.slug === slug);
  if (!post || !supported(locale)) return null;
  if (!content) return loadPost(locale, post);
  const key = JSON.stringify([postKey(locale, post), content]);
  const cached = articles.get(key);
  if (cached) return cached;
  const existing = pendingArticles.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const fromFile = await staticPost(locale, slug);
      if (fromFile) {
        if (articles.size >= 8) articles.delete(articles.keys().next().value!);
        articles.set(key, fromFile);
        return fromFile;
      }
      const [metadata, html] = await Promise.all([loadPost(locale, post), translateHtmlStrict(content, locale)]);
      if (!metadata) return null;
      const result = { ...metadata, content: html };
      if (articles.size >= 8) articles.delete(articles.keys().next().value!);
      articles.set(key, result);
      return result;
    } catch { return null; } // Never keep fallback HTML as a successful translation.
  })();
  pendingArticles.set(key, promise);
  try { return await promise; }
  finally { pendingArticles.delete(key); }
}

export async function fetchInsiderTipTranslation(locale: string, slug: string): Promise<InsiderTipTranslation | null> {
  const tip = insiderTips.find((candidate) => candidate.slug === slug);
  return tip ? loadTip(locale, tip) : null;
}

export function getBlogTranslation(locale: string, slug: string): BlogTranslation | null {
  const post = blogPosts.find((candidate) => candidate.slug === slug);
  return post ? posts.get(postKey(locale, post)) ?? null : null;
}

export function getInsiderTipTranslation(locale: string, slug: string): InsiderTipTranslation | null {
  const tip = insiderTips.find((candidate) => candidate.slug === slug);
  return tip ? tips.get(tipKey(locale, tip)) ?? null : null;
}
