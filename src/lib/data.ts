import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  parseDefunctFirm,
  parseNewsArticle,
  parsePropFirm,
  parseSiteFaq,
  type DefunctFirm,
  type NewsArticle,
  type PropFirm,
  type SiteFaq,
} from "@/lib/schema";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const NEWS_DIR = path.join(process.cwd(), "data", "news");
const CLOSED_FIRMS_FILE = path.join(process.cwd(), "data", "closed_firms.json");
const SITE_FAQS_FILE = path.join(process.cwd(), "data", "faqs.json");

function readFirmFile(fileName: string): PropFirm {
  const filePath = path.join(FIRMS_DIR, fileName);
  const raw = readFileSync(filePath, "utf8");
  return parsePropFirm(JSON.parse(raw));
}

/**
 * 读取 data/firms/ 下全部 JSON，并用 Zod 校验。仅可在服务端调用。
 * 用 React cache() 做请求级去重：同一次渲染里 layout / page 都会调用，
 * 避免重复读盘和重复校验。
 *
 * 任意一步失败都返回已成功的数据（或空数组），绝不抛到页面层，
 * 避免 Vercel SSR / ISR 重校验时因缺文件变成 500。
 */
export const getAllFirms = cache((): PropFirm[] => {
  try {
    let fileNames: string[];
    try {
      fileNames = readdirSync(FIRMS_DIR).filter((name) => name.endsWith(".json"));
    } catch (err) {
      console.error("[data] Cannot read firms directory:", FIRMS_DIR, err);
      return [];
    }

    const results: PropFirm[] = [];
    for (const fileName of fileNames) {
      try {
        results.push(readFirmFile(fileName));
      } catch (err) {
        console.error("[data] Skipping invalid firm file:", fileName, err);
      }
    }

    return results.sort((a, b) => a.basic.name.localeCompare(b.basic.name, "en"));
  } catch (err) {
    console.error("[data] Unexpected getAllFirms failure:", err);
    return [];
  }
});

export function getFirmBySlug(slug: string): PropFirm | undefined {
  return getAllFirms().find((firm) => firm.slug === slug);
}

export function getFirmSlugs(): string[] {
  return getAllFirms().map((firm) => firm.slug);
}

function readNewsFile(fileName: string): NewsArticle {
  const filePath = path.join(NEWS_DIR, fileName);
  const raw = readFileSync(filePath, "utf8");
  return parseNewsArticle(JSON.parse(raw));
}

export const getAllNews = cache((): NewsArticle[] => {
  try {
    let fileNames: string[];
    try {
      fileNames = readdirSync(NEWS_DIR).filter((name) => name.endsWith(".json"));
    } catch (err) {
      console.error("[data] Cannot read news directory:", NEWS_DIR, err);
      return [];
    }

    const results: NewsArticle[] = [];
    for (const fileName of fileNames) {
      try {
        results.push(readNewsFile(fileName));
      } catch (err) {
        console.error("[data] Skipping invalid news file:", fileName, err);
      }
    }

    return results.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } catch (err) {
    console.error("[data] Unexpected getAllNews failure:", err);
    return [];
  }
});

export function getNewsBySlug(slug: string): NewsArticle | undefined {
  return getAllNews().find((article) => article.slug === slug);
}

export function getNewsSlugs(): string[] {
  return getAllNews().map((article) => article.slug);
}

/**
 * 读取 data/closed_firms.json（Boneyard 黑名单，单文件、非逐平台目录）。
 * 同样逐条容错：坏条目跳过，不让整页 500。
 */
export const getAllDefunctFirms = cache((): DefunctFirm[] => {
  try {
    const raw = readFileSync(CLOSED_FIRMS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("[data] closed_firms.json is not an array");
      return [];
    }

    const results: DefunctFirm[] = [];
    for (const entry of parsed) {
      try {
        results.push(parseDefunctFirm(entry));
      } catch (err) {
        console.error("[data] Skipping invalid closed-firm entry:", err);
      }
    }

    return results.sort((a, b) => b.closedDate.localeCompare(a.closedDate));
  } catch (err) {
    console.error("[data] Cannot read closed firms file:", CLOSED_FIRMS_FILE, err);
    return [];
  }
});

export const getAllSiteFaqs = cache((): SiteFaq[] => {
  try {
    const raw = readFileSync(SITE_FAQS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("[data] faqs.json is not an array");
      return [];
    }

    const results: SiteFaq[] = [];
    for (const entry of parsed) {
      try {
        results.push(parseSiteFaq(entry));
      } catch (err) {
        console.error("[data] Skipping invalid site FAQ entry:", err);
      }
    }

    return results;
  } catch (err) {
    console.error("[data] Cannot read site FAQs file:", SITE_FAQS_FILE, err);
    return [];
  }
});
