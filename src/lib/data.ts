import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parsePropFirm, type PropFirm } from "@/lib/schema";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");

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
