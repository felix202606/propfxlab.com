import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parsePropFirm, type PropFirm } from "@/lib/schema";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");

function readFirmFile(fileName: string): PropFirm {
  const filePath = path.join(FIRMS_DIR, fileName);
  const raw = readFileSync(filePath, "utf8");

  try {
    return parsePropFirm(JSON.parse(raw));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`无法解析 ${filePath}：${reason}`);
  }
}

/**
 * 读取 data/firms/ 下全部 JSON，并用 Zod 校验。仅可在服务端调用。
 * 用 React cache() 做请求级去重：同一次渲染里 layout / page 都会调用，
 * 避免重复读盘和重复校验。
 */
export const getAllFirms = cache((): PropFirm[] => {
  const files = readdirSync(FIRMS_DIR).filter((name) => name.endsWith(".json"));

  return files
    .map(readFirmFile)
    .sort((a, b) => a.basic.name.localeCompare(b.basic.name, "en"));
});

export function getFirmBySlug(slug: string): PropFirm | undefined {
  return getAllFirms().find((firm) => firm.slug === slug);
}

export function getFirmSlugs(): string[] {
  return getAllFirms().map((firm) => firm.slug);
}
