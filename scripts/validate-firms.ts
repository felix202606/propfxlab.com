import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { defunctFirmSchema, propFirmSchema, siteFaqSchema } from "../src/lib/schema";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const CLOSED_FIRMS_FILE = path.join(process.cwd(), "data", "closed_firms.json");
const SITE_FAQS_FILE = path.join(process.cwd(), "data", "faqs.json");

function loadJson(filePath: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(readFileSync(filePath, "utf8")) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

function validateClosedFirms(): number {
  const relativePath = path.relative(process.cwd(), CLOSED_FIRMS_FILE);
  const parsed = loadJson(CLOSED_FIRMS_FILE);

  if (!parsed.ok) {
    console.error(`\n✖ ${relativePath}`);
    console.error(`  JSON 无法解析: ${parsed.error}`);
    return 1;
  }

  if (!Array.isArray(parsed.data)) {
    console.error(`\n✖ ${relativePath}`);
    console.error(`  顶层必须是数组`);
    return 1;
  }

  let failed = 0;
  const seenSlugs = new Set<string>();

  parsed.data.forEach((entry, index) => {
    const result = defunctFirmSchema.safeParse(entry);
    if (!result.success) {
      failed += 1;
      console.error(`\n✖ ${relativePath} [${index}]`);
      console.error(z.prettifyError(result.error));
      return;
    }
    if (seenSlugs.has(result.data.slug)) {
      failed += 1;
      console.error(`\n✖ ${relativePath} [${index}]`);
      console.error(`  slug "${result.data.slug}" 重复`);
      return;
    }
    seenSlugs.add(result.data.slug);
  });

  if (failed === 0) {
    console.log(`✓ ${relativePath} (${parsed.data.length} 条记录)`);
  }

  return failed;
}

function validateSiteFaqs(): number {
  const relativePath = path.relative(process.cwd(), SITE_FAQS_FILE);
  const parsed = loadJson(SITE_FAQS_FILE);

  if (!parsed.ok) {
    console.error(`\n✖ ${relativePath}`);
    console.error(`  JSON 无法解析: ${parsed.error}`);
    return 1;
  }

  if (!Array.isArray(parsed.data)) {
    console.error(`\n✖ ${relativePath}`);
    console.error(`  顶层必须是数组`);
    return 1;
  }

  let failed = 0;
  const seenIds = new Set<string>();

  parsed.data.forEach((entry, index) => {
    const result = siteFaqSchema.safeParse(entry);
    if (!result.success) {
      failed += 1;
      console.error(`\n✖ ${relativePath} [${index}]`);
      console.error(z.prettifyError(result.error));
      return;
    }
    if (seenIds.has(result.data.id)) {
      failed += 1;
      console.error(`\n✖ ${relativePath} [${index}]`);
      console.error(`  id "${result.data.id}" 重复`);
      return;
    }
    seenIds.add(result.data.id);
  });

  if (failed === 0) {
    console.log(`✓ ${relativePath} (${parsed.data.length} 条记录)`);
  }

  return failed;
}

function main(): void {
  let files: string[];
  try {
    files = readdirSync(FIRMS_DIR).filter((name) => name.endsWith(".json"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`无法读取目录 ${FIRMS_DIR}: ${message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`data/firms/ 下没有任何 .json 文件`);
    process.exit(1);
  }

  let failed = 0;

  for (const fileName of files.sort()) {
    const filePath = path.join(FIRMS_DIR, fileName);
    const relativePath = path.relative(process.cwd(), filePath);
    const parsed = loadJson(filePath);

    if (!parsed.ok) {
      failed += 1;
      console.error(`\n✖ ${relativePath}`);
      console.error(`  JSON 无法解析: ${parsed.error}`);
      continue;
    }

    const result = propFirmSchema.safeParse(parsed.data);
    if (!result.success) {
      failed += 1;
      console.error(`\n✖ ${relativePath}`);
      console.error(z.prettifyError(result.error));
      continue;
    }

    const expectedSlug = fileName.replace(/\.json$/i, "");
    if (result.data.slug !== expectedSlug) {
      failed += 1;
      console.error(`\n✖ ${relativePath}`);
      console.error(
        `  slug "${result.data.slug}" 必须与文件名一致（期望 "${expectedSlug}"）`,
      );
      continue;
    }

    console.log(`✓ ${relativePath}`);
  }

  failed += validateClosedFirms();
  failed += validateSiteFaqs();

  if (failed > 0) {
    console.error(`\n校验失败：共 ${failed} 处不符合 src/lib/schema.ts`);
    process.exit(1);
  }

  console.log(
    `\n全部通过：${files.length} 个 Prop Firm JSON + closed_firms.json + faqs.json 符合 Schema`,
  );
}

main();
