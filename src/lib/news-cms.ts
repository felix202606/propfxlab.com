import "server-only";

import { cache } from "react";
import { getAllNews, getNewsBySlug } from "@/lib/data";
import { newsFromCms } from "@/lib/sanity-mapping";
import { sanityQuery } from "@/lib/sanity-fetch";
import { newsLocaleKeys, type NewsArticle } from "@/lib/schema";

/** Index, adjacent links and the news sitemap shard. */
export const NEWS_LIST_TAG = "news";

export function newsArticleTag(slug: string): string {
  return `news:${slug}`;
}

/**
 * Listing projection only: the full bodies for 138+ articles exceed the
 * 2 MB per-entry data cache limit. Article pages fetch the body by slug.
 */
const LIST_QUERY = `*[_type == "newsArticle" && defined(slug)] | order(publishedAt desc) {
  slug, title, summary, sourceName, sourceUrl, publishedAt, scrapedAt,
  tags, relatedFirmSlugs, relevance,
  "translations": translations{
    ${newsLocaleKeys.map((locale) => `${locale}{title, summary}`).join(", ")}
  }
}`;

const ARTICLE_QUERY = `*[_type == "newsArticle" && slug == $slug][0]`;

type ListRow = {
  slug: string;
  title: string;
  summary: string;
  translations?: Record<string, { title?: string; summary?: string } | null>;
  [key: string]: unknown;
};

/** Content falls back to the summary; list pages never render the body. */
function listRowToArticle(row: ListRow): NewsArticle | null {
  const translations: Record<string, { title: string; summary: string; content: string }> = {};
  for (const [locale, copy] of Object.entries(row.translations ?? {})) {
    if (copy?.title && copy.summary) {
      translations[locale] = { title: copy.title, summary: copy.summary, content: copy.summary };
    }
  }
  try {
    return newsFromCms({ ...row, body: row.summary, translations });
  } catch {
    // Every article page reads the list; one line per slug per worker keeps build logs under Vercel's 4 MB cap.
    if (!skippedRows.has(row.slug)) {
      skippedRows.add(row.slug);
      console.warn("[news] skip invalid CMS row", row.slug);
    }
    return null;
  }
}

const skippedRows = new Set<string>();

/**
 * CMS first. Articles that only exist in data/news stay listed, so no
 * indexed URL disappears if the dataset is missing something.
 */
export const getPublishedNews = cache(async (): Promise<NewsArticle[]> => {
  const local = getAllNews();
  const rows = await sanityQuery<ListRow[]>(LIST_QUERY, {}, [NEWS_LIST_TAG]);
  if (!rows) return local;

  const bySlug = new Map<string, NewsArticle>();
  for (const article of local) bySlug.set(article.slug, article);
  for (const row of rows) {
    const article = listRowToArticle(row);
    if (article) bySlug.set(article.slug, article);
  }
  return [...bySlug.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
});

export async function resolveNewsArticle(slug: string): Promise<NewsArticle | undefined> {
  const doc = await sanityQuery<unknown>(ARTICLE_QUERY, { slug }, [newsArticleTag(slug)]);
  if (doc) {
    try {
      return newsFromCms(doc);
    } catch {
      console.warn("[news] invalid CMS article", slug);
    }
  }
  return getNewsBySlug(slug);
}

export async function getAdjacentPublished(slug: string): Promise<{
  previous: NewsArticle | undefined;
  next: NewsArticle | undefined;
}> {
  const articles = await getPublishedNews();
  const index = articles.findIndex((article) => article.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? articles[index - 1] : undefined,
    next: articles[index + 1],
  };
}

export async function getPublishedNewsSlugs(): Promise<string[]> {
  return (await getPublishedNews()).map((article) => article.slug);
}
