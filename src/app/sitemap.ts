import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import {
  COMPARE_EXCLUDED_SLUGS,
  compareableSlugs,
  listCanonicalCompareSlugs,
} from "@/lib/compare";
import { localeMeta, routing } from "@/i18n/routing";

const BASE_URL = "https://www.propfxlab.com";
const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const NEWS_DIR = path.join(process.cwd(), "data", "news");

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

type FirmEntry = { slug: string; lastModified: Date };

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

function readFirmEntries(): FirmEntry[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(FIRMS_DIR).filter((name) => name.endsWith(".json"));
  } catch (error) {
    console.error(`[sitemap] 读取 ${FIRMS_DIR} 失败，本次只输出静态页面：`, error);
    return [];
  }

  const entries: FirmEntry[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(FIRMS_DIR, fileName);
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
      const raw =
        typeof parsed === "object" && parsed !== null
          ? (parsed as { slug?: unknown }).slug
          : undefined;
      const slug =
        typeof raw === "string" && raw.trim()
          ? raw.trim()
          : path.basename(fileName, ".json");

      entries.push({ slug, lastModified: statSync(filePath).mtime });
    } catch (error) {
      console.error(`[sitemap] 跳过无法解析的 ${filePath}：`, error);
    }
  }

  return entries.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
}

function readNewsEntries(): FirmEntry[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(NEWS_DIR).filter((name) => name.endsWith(".json"));
  } catch (error) {
    console.error(`[sitemap] 读取 ${NEWS_DIR} 失败，本次跳过新闻页：`, error);
    return [];
  }

  const entries: FirmEntry[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(NEWS_DIR, fileName);
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
      const raw =
        typeof parsed === "object" && parsed !== null
          ? (parsed as { slug?: unknown }).slug
          : undefined;
      const slug =
        typeof raw === "string" && raw.trim()
          ? raw.trim()
          : path.basename(fileName, ".json");

      entries.push({ slug, lastModified: statSync(filePath).mtime });
    } catch (error) {
      console.error(`[sitemap] 跳过无法解析的 ${filePath}：`, error);
    }
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
  lastModified: Date,
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
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export async function generateSitemaps() {
  return SITEMAP_SHARDS.map((shard) => ({ id: shard.id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const now = new Date();

  if (id === "static") {
    return STATIC_PATHS.flatMap((pathname) =>
      localizedEntries(
        pathname,
        now,
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
    const firms = readFirmEntries().filter(
      (firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug),
    );
    return firms.flatMap((firm) =>
      localizedEntries(`/firm/${firm.slug}`, firm.lastModified, 0.7),
    );
  }

  if (id === "compare") {
    const firms = readFirmEntries().filter(
      (firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug),
    );
    const compareSlugs = listCanonicalCompareSlugs(
      compareableSlugs(firms.map((firm) => firm.slug)),
    );
    return compareSlugs.flatMap((slug) =>
      localizedEntries(`/compare/${slug}`, now, 0.65),
    );
  }

  if (id === "news") {
    const news = readNewsEntries();
    return news.flatMap((article) =>
      localizedEntries(`/news/${article.slug}`, article.lastModified, 0.6, "daily"),
    );
  }

  console.error(`[sitemap] unknown shard id: ${id}`);
  return [];
}
