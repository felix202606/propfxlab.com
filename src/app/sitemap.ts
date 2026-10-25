import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import {
  buildCompareSlug,
  COMPARE_EXCLUDED_SLUGS,
  compareableSlugs,
} from "@/lib/compare";
import { getPublishedNewsIndex } from "@/lib/news-cms";
import { localeMeta, routing } from "@/i18n/routing";

const BASE_URL = "https://www.propfxlab.com";
const FIRMS_DIR = path.join(process.cwd(), "data", "firms");

/**
 * Shard ids for generateSitemaps. Splitting keeps each XML response smaller
 * so cold starts / crawlers are less likely to hit timeouts (single-file 5MB+).
 * All seven locales remain covered — HARD LOCK.
 */
const SITEMAP_SHARDS = [
  { id: "static" },
  { id: "firms" },
  { id: "compare" },
  { id: "news" },
] as const;

type SitemapEntry = { slug: string; lastModified?: Date };

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

function readJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.error(`[sitemap] 跳过无法解析的 ${filePath}：`, error);
  }
  return null;
}

function readFirmEntries(): SitemapEntry[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(FIRMS_DIR).filter((name) => name.endsWith(".json"));
  } catch (error) {
    console.error(`[sitemap] 读取 ${FIRMS_DIR} 失败，本次只输出静态页面：`, error);
    return [];
  }

  const entries: SitemapEntry[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(FIRMS_DIR, fileName);
    const parsed = readJsonObject(filePath);
    if (!parsed) continue;
    const raw = parsed.slug;
    const slug =
      typeof raw === "string" && raw.trim()
        ? raw.trim()
        : path.basename(fileName, ".json");
    // Do not use fs mtime: on Vercel every deploy retouches files, so lastmod
    // becomes "today" and crawlers refill the whole compare ISR cache.
    entries.push({ slug });
  }

  return entries.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
}

function localeUrl(locale: string, pathname: string): string {
  const suffix = pathname === "" ? "" : pathname;
  if (locale === routing.defaultLocale) {
    return `${BASE_URL}${suffix || "/"}`;
  }
  return `${BASE_URL}/${locale}${suffix}`;
}

function localizedEntries(
  pathname: string,
  lastModified: Date | undefined,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {
    "x-default": localeUrl(routing.defaultLocale, pathname),
  };
  for (const locale of routing.locales) {
    languages[localeMeta[locale].bcp47] = localeUrl(locale, pathname);
  }

  return routing.locales.map((locale) => ({
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
  const firms = readFirmEntries().filter(
    (firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug),
  );

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
        entries.push(
          ...localizedEntries(
            `/compare/${buildCompareSlug(slugs[i], slugs[j])}`,
            undefined,
            0.65,
          ),
        );
      }
    }
    return entries;
  }

  if (id === "news") {
    const news = await getPublishedNewsIndex();
    return news.flatMap((article) =>
      localizedEntries(
        `/news/${article.slug}`,
        parseIsoDate(article.publishedAt) ?? parseIsoDate(article.scrapedAt),
        0.6,
        "daily",
      ),
    );
  }

  console.error(`[sitemap] unknown shard id: ${id}`);
  return [];
}
