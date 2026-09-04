import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { localeMeta, routing } from "@/i18n/routing";

const BASE_URL = "https://www.propfxlab.com";
const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const NEWS_DIR = path.join(process.cwd(), "data", "news");

/** 与语言无关的固定路径，会在每种语言前缀下各生成一条 URL。 */
const STATIC_PATHS = ["", "/calculator", "/news"] as const;

type FirmEntry = { slug: string; lastModified: Date };

/**
 * 直接读原始 JSON 而不复用 lib/data.ts 的 getAllFirms()：
 * 那边会跑 Zod 校验，任何一个字段不合法都会抛错并让整个 /sitemap.xml 变成 500。
 * sitemap 只需要 slug，所以这里逐文件容错——坏文件跳过，好文件照常收录。
 */
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
      // slug 缺失时退回文件名：文件名和路由 slug 在本仓库里始终一致
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

/**
 * 所有真实页面都在 /[locale] 之下，裸路径（如 /firm/ftmo）会被 proxy.ts 307 跳转，
 * 因此这里输出带语言前缀的 URL，并让同一页面的各语言版本互相声明 hreflang。
 */
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
    changeFrequency: "weekly",
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const firms = readFirmEntries();
  const news = readNewsEntries();
  const now = new Date();

  return [
    ...STATIC_PATHS.flatMap((pathname) =>
      localizedEntries(
        pathname,
        now,
        pathname === "" ? 1 : pathname === "/news" ? 0.7 : 0.8,
      ),
    ),
    ...firms.flatMap((firm) =>
      localizedEntries(`/firm/${firm.slug}`, firm.lastModified, 0.7),
    ),
    ...news.flatMap((article) =>
      localizedEntries(`/news/${article.slug}`, article.lastModified, 0.6),
    ),
  ];
}
