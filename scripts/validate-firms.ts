import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { propFirmSchema } from "../src/lib/schema";

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");

function loadJson(filePath: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(readFileSync(filePath, "utf8")) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
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

  if (failed > 0) {
    console.error(`\n校验失败：${failed}/${files.length} 个文件不符合 src/lib/schema.ts`);
    process.exit(1);
  }

  console.log(`\n全部通过：${files.length} 个 Prop Firm JSON 符合 Schema`);
}

main();
