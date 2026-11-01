import type { MetadataRoute } from "next";
import {
  buildCompareSlug,
  COMPARE_EXCLUDED_SLUGS,
  compareableSlugs,
} from "@/lib/compare";
import { getFirmRoster } from "@/lib/firms";
import { getPublishedNewsIndex } from "@/lib/news-cms";
import { localeMeta, routing } from "@/i18n/routing";
import sitemapKeepSlugs from "../../data/sitemap-keep-slugs.json";

const BASE_URL = "https://www.propfxlab.com";

/**
 * Sitemap prune (Option A, slug-level). Exception to the HARD LOCK "full
 * C(n,2) compare matrix in the sitemap" rule, requested via SEO review and
 * pending felix's approval in PR review (see AGENTS.md /
 * .cursor/rules/traffic-i18n-seo.mdc).
 *
 * Only the XML sitemap is filtered. Every page stays live, indexable, keeps
 * its canonical/hreflang and stays internally linked.
 *  - en URLs, static pages and /firm/* are always emitted (all 7 locales).
 *  - Non-en /compare/* and /news/* are emitted only when the slug is in
 *    data/sitemap-keep-slugs.json; news is also emitted when publishedAt is
 *    within the last NEWS_GRACE_DAYS.
 */
const KEEP_COMPARE_SLUGS = new Set<string>(sitemapKeepSlugs.compare);
const KEEP_NEWS_SLUGS = new Set<string>(sitemapKeepSlugs.news);
const NEWS_GRACE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shard ids for generateSitemaps. Splitting keeps each XML response smaller
 * so cold starts / crawlers are less likely to hit timeouts (single-file 5MB+).
 * Static and firm shards cover all seven locales — HARD LOCK. Compare and
 * news shards filter non-en entries through the keep list above.
 */
const SITEMAP_SHARDS = [
  { id: "static" },
  { id: "firms" },
  { id: "compare" },
  { id: "news" },
] as const;

const STATIC_PATHS = [
  "",
  "/calculator",
  "/compare",
  "/news",
  "/defunct",
  "/faq",
  "/about",
  "/data-audit-log",
] as const;

function parseIsoDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function localeUrl(locale: string, pathname: string): string {
  const suffix = pathname === "" ? "" : pathname;
  if (locale === routing.defaultLocale) {
    return `${BASE_URL}${suffix || "/"}`;
  }
  return `${BASE_URL}/${locale}${suffix}`;
}

function isDefaultLocale(locale: string): boolean {
  return locale === routing.defaultLocale;
}

function localizedEntries(
  pathname: string,
  lastModified: Date | undefined,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  includeLocale: (locale: string) => boolean = () => true,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {
    "x-default": localeUrl(routing.defaultLocale, pathname),
  };
  for (const locale of routing.locales) {
    languages[localeMeta[locale].bcp47] = localeUrl(locale, pathname);
  }

  // hreflang alternates keep listing every locale: they point at live pages.
  return routing.locales.filter(includeLocale).map((locale) => ({
    url: localeUrl(locale, pathname),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export async function generateSitemaps() {
  return SITEMAP_SHARDS.map((shard) => ({ id: shard.id }));
}

/**
 * lastmod must be a content date, never fs.stat mtime or Date.now().
 * Compare and firm URLs omit lastModified so a sitemap refresh does not
 * mark the whole matrix as updated. News comes from Sanity: a publish
 * revalidates the `news` tag, and 21600 is the fallback if a webhook is
 * missed. Unchanged shard output is not an ISR write.
 */
export const revalidate = 21600;

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  // Do not add lastmod from fs mtime: every deploy retouches files and crawlers
  // would refill the whole compare ISR cache.
  const firms = (await getFirmRoster())
    .filter((firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug, "en"));

  if (id === "static") {
    return STATIC_PATHS.flatMap((pathname) =>
      localizedEntries(
        pathname,
        undefined,
        pathname === ""
          ? 1
          : pathname === "/compare" ||
              pathname === "/news" ||
              pathname === "/faq"
            ? 0.7
            : pathname === "/defunct"
              ? 0.6
              : 0.8,
        pathname === "/news" ? "daily" : "weekly",
      ),
    );
  }

  if (id === "firms") {
    return firms.flatMap((firm) =>
      localizedEntries(`/firm/${firm.slug}`, undefined, 0.7),
    );
  }

  if (id === "compare") {
    const slugs = compareableSlugs(firms.map((firm) => firm.slug));
    const entries: MetadataRoute.Sitemap = [];
    for (let i = 0; i < slugs.length; i += 1) {
      for (let j = i + 1; j < slugs.length; j += 1) {
        const compareSlug = buildCompareSlug(slugs[i], slugs[j]);
        const keepAllLocales = KEEP_COMPARE_SLUGS.has(compareSlug);
        entries.push(
          ...localizedEntries(
            `/compare/${compareSlug}`,
            undefined,
            0.65,
            "weekly",
            keepAllLocales ? undefined : isDefaultLocale,
          ),
        );
      }
    }
    return entries;
  }

  if (id === "news") {
    const news = await getPublishedNewsIndex();
    const graceStart = Date.now() - NEWS_GRACE_DAYS * DAY_MS;
    return news.flatMap((article) => {
      const published = parseIsoDate(article.publishedAt);
      const keepAllLocales =
        KEEP_NEWS_SLUGS.has(article.slug) ||
        (published !== undefined && published.getTime() >= graceStart);
      return localizedEntries(
        `/news/${article.slug}`,
        published ?? parseIsoDate(article.scrapedAt),
        0.6,
        "daily",
        keepAllLocales ? undefined : isDefaultLocale,
      );
    });
  }

  console.error(`[sitemap] unknown shard id: ${id}`);
  return [];
}
