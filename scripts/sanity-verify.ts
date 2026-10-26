/**
 * Checks that what Sanity returns parses to exactly the repo JSON.
 *
 *   (cd studio && npx sanity documents query '*[_type in ["firm","newsArticle"]]' > /tmp/cms.json)
 *   npx tsx --conditions=react-server scripts/sanity-verify.ts /tmp/cms.json
 */
import { isDeepStrictEqual } from "node:util";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FIRM_OFFERS } from "../src/lib/offers";
import { firmFromCms, newsFromCms } from "../src/lib/sanity-mapping";
import { parseNewsArticle, parsePropFirm } from "../src/lib/schema";

const ROOT = path.resolve(__dirname, "..");
const docs = JSON.parse(readFileSync(process.argv[2] ?? "/tmp/cms.json", "utf8")) as Array<
  Record<string, unknown>
>;

const skippedLocal = new Set<string>();
let skippedCms = 0;

function local<T>(dir: string, parse: (raw: unknown) => T): Map<string, T> {
  const out = new Map<string, T>();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json") || name === "manifest.json") continue;
    let parsed: T & { slug: string };
    try {
      parsed = parse(JSON.parse(readFileSync(path.join(dir, name), "utf8"))) as T & { slug: string };
    } catch {
      // The site skips files that fail the schema, so the CMS copy must fail too.
      skippedLocal.add(name);
      continue;
    }
    out.set(parsed.slug, parsed);
  }
  return out;
}

const localFirms = local(path.join(ROOT, "data", "firms"), parsePropFirm);
const localNews = local(path.join(ROOT, "data", "news"), parseNewsArticle);
let failures = 0;
const seenFirms = new Set<string>();
const seenNews = new Set<string>();

for (const doc of docs) {
  try {
    if (doc._type === "firm") {
      const { firm, offer } = firmFromCms(doc);
      seenFirms.add(firm.slug);
      if (!isDeepStrictEqual(firm, localFirms.get(firm.slug))) {
        failures += 1;
        console.error(`firm differs: ${firm.slug}`);
      }
      const expected = FIRM_OFFERS[firm.slug];
      const sameOffer = expected
        ? offer.partner === true &&
          offer.href === expected.href &&
          offer.code === expected.code &&
          offer.discountLabel === expected.discountLabel
        : offer.partner !== true;
      if (!sameOffer) {
        failures += 1;
        console.error(`offer differs: ${firm.slug}`);
      }
    } else if (doc._type === "newsArticle") {
      let article;
      try {
        article = newsFromCms(doc);
      } catch {
        skippedCms += 1;
        continue;
      }
      seenNews.add(article.slug);
      if (!isDeepStrictEqual(article, localNews.get(article.slug))) {
        failures += 1;
        console.error(`news differs: ${article.slug}`);
      }
    }
  } catch (error) {
    failures += 1;
    console.error(`parse failed: ${String(doc._id)}`, error);
  }
}

for (const slug of localFirms.keys()) {
  if (seenFirms.has(slug)) continue;
  failures += 1;
  console.error(`missing firm ${slug}`);
}
for (const slug of localNews.keys()) {
  if (seenNews.has(slug)) continue;
  failures += 1;
  console.error(`missing news ${slug}`);
}

if (skippedCms !== skippedLocal.size) {
  failures += 1;
  console.error(`invalid news: ${skippedCms} in CMS vs ${skippedLocal.size} local`);
}

console.log(`invalid news skipped ${skippedCms}/${skippedLocal.size}`);
console.log(`firms ${seenFirms.size}/${localFirms.size}, news ${seenNews.size}/${localNews.size}, failures ${failures}`);
process.exit(failures ? 1 : 0);
