import "server-only";

import { cache } from "react";
import { getAllNews, getNewsBySlug } from "@/lib/data";
import { newsFromCms } from "@/lib/sanity-mapping";
import { sanityQuery } from "@/lib/sanity-fetch";
import {
  newsArticleSchema,
  newsLocaleKeys,
  type NewsArticle,
  type NewsLocale,
} from "@/lib/schema";

/** Index, adjacent links and the news sitemap shard. */
export const NEWS_LIST_TAG = "news";

export function newsArticleTag(slug: string): string {
  return `news:${slug}`;
}

/**
 * Every query result must stay under the 2 MB per-entry data cache limit,
 * otherwise each prerendered page refetches it. A list with all seven locales
 * passed that at ~300 articles, so article pages and the sitemap only read
 * the slug index, and /news reads English plus its own locale.
 */
const INDEX_QUERY = `*[_type == "newsArticle" && defined(slug)]{slug, publishedAt, scrapedAt}`;

function listQuery(locale: NewsLocale): string {
  const copies = locale === "en" ? "en{title, summary}" : `en{title, summary}, ${locale}{title, summary}`;
  return `*[_type == "newsArticle" && defined(slug)] {
  slug, title, summary, sourceName, sourceUrl, publishedAt, scrapedAt,
  tags, relatedFirmSlugs, relevance,
  "translations": translations{${copies}}
}`;
}

const ARTICLE_QUERY = `*[_type == "newsArticle" && slug == $slug][0]`;

export type NewsIndexEntry = { slug: string; publishedAt: string; scrapedAt?: string };

type ListRow = {
  slug: string;
  title: string;
  summary: string;
  translations?: Record<string, { title?: string; summary?: string } | null>;
  [key: string]: unknown;
};

const skippedRows = new Set<string>();

function warnSkipped(slug: string): void {
  // Every article page reads the index; one line per slug per worker keeps build logs under Vercel's 4 MB cap.
  if (skippedRows.has(slug)) return;
  skippedRows.add(slug);
  console.warn("[news] skip invalid CMS row", slug);
}

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
    warnSkipped(row.slug);
    return null;
  }
}

function isValidIndexRow(row: NewsIndexEntry): boolean {
  const valid =
    newsArticleSchema.shape.slug.safeParse(row.slug).success &&
    newsArticleSchema.shape.publishedAt.safeParse(row.publishedAt).success;
  if (!valid) warnSkipped(String(row.slug));
  return valid;
}

function byNewestFirst(a: { publishedAt: string }, b: { publishedAt: string }): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

/**
 * CMS first. Articles that only exist in data/news stay listed, so no
 * indexed URL disappears if the dataset is missing something.
 */
export const getPublishedNewsIndex = cache(async (): Promise<NewsIndexEntry[]> => {
  const local = getAllNews();
  const rows = await sanityQuery<NewsIndexEntry[]>(INDEX_QUERY, {}, [NEWS_LIST_TAG]);
  const bySlug = new Map<string, NewsIndexEntry>();
  for (const { slug, publishedAt, scrapedAt } of local) bySlug.set(slug, { slug, publishedAt, scrapedAt });
  for (const row of rows ?? []) {
    if (isValidIndexRow(row)) bySlug.set(row.slug, row);
  }
  return [...bySlug.values()].sort(byNewestFirst);
});

/** Listing fields with English and `locale` copy only. */
export const getPublishedNews = cache(async (locale: string): Promise<NewsArticle[]> => {
  const local = getAllNews();
  const listLocale = (newsLocaleKeys as readonly string[]).includes(locale) ? (locale as NewsLocale) : "en";
  const rows = await sanityQuery<ListRow[]>(listQuery(listLocale), {}, [NEWS_LIST_TAG]);
  if (!rows) return local;

  const bySlug = new Map<string, NewsArticle>();
  for (const article of local) bySlug.set(article.slug, article);
  for (const row of rows) {
    const article = listRowToArticle(row);
    if (article) bySlug.set(article.slug, article);
  }
  return [...bySlug.values()].sort(byNewestFirst);
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
  const index = await getPublishedNewsIndex();
  const position = index.findIndex((entry) => entry.slug === slug);
  if (position < 0) return { previous: undefined, next: undefined };
  const previousSlug = position > 0 ? index[position - 1].slug : undefined;
  const nextSlug = index[position + 1]?.slug;
  const [previous, next] = await Promise.all([
    previousSlug ? resolveNewsArticle(previousSlug) : undefined,
    nextSlug ? resolveNewsArticle(nextSlug) : undefined,
  ]);
  return { previous, next };
}
