/**
 * Builds an NDJSON import for Sanity from the JSON in data/ and offers.ts.
 * Document ids are stable (firm.{slug}, news.{slug}), so re-importing with
 * --replace overwrites instead of duplicating.
 *
 *   npx tsx --conditions=react-server scripts/sanity-export.ts /tmp/propfxlab.ndjson
 *   (cd studio && npx sanity dataset import /tmp/propfxlab.ndjson production --replace)
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FIRM_OFFERS } from "../src/lib/offers";
import { POPULAR_COMPARISONS } from "../src/lib/popular-comparisons";

const ROOT = path.resolve(__dirname, "..");
const FIRMS_DIR = path.join(ROOT, "data", "firms");
const NEWS_DIR = path.join(ROOT, "data", "news");

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function keyFor(value: Json, index: number): string {
  const hash = createHash("sha1").update(JSON.stringify(value)).digest("hex");
  return `${hash.slice(0, 10)}${index}`;
}

/** Sanity ids are limited to [a-zA-Z0-9._-]; must match sync_news_to_sanity.py. */
function newsDocId(slug: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(slug)) return `news.${slug}`;
  return `news.h${createHash("sha1").update(slug, "utf8").digest("hex").slice(0, 24)}`;
}

/** Member type names from studio/schemaTypes/firm.ts. */
const ARRAY_MEMBER_TYPES: Record<string, string> = {
  channels: "withdrawalChannel",
  profitSplitTiers: "profitSplitTier",
  faqs: "firmFaq",
};

/** Sanity stores objects in arrays with _key/_type and drops nulls. */
function toSanity(value: Json, memberType?: string): Json | undefined {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    const items: Json[] = [];
    value.forEach((item, index) => {
      const converted = toSanity(item);
      if (converted === undefined) return;
      if (converted && typeof converted === "object" && !Array.isArray(converted)) {
        const member: { [key: string]: Json } = { _key: keyFor(item, index) };
        if (memberType) member._type = memberType;
        items.push({ ...member, ...converted });
        return;
      }
      items.push(converted);
    });
    return items;
  }
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) {
      const converted = toSanity(item, ARRAY_MEMBER_TYPES[key]);
      if (converted !== undefined) out[key] = converted;
    }
    return out;
  }
  return value;
}

function readJsonDir(dir: string): Record<string, Json>[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && name !== "manifest.json")
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")));
}

const docs: Record<string, Json>[] = [];

const firms = readJsonDir(FIRMS_DIR);
const firmSlugs = new Set(firms.map((firm) => String(firm.slug)));
for (const firm of firms) {
  const slug = String(firm.slug);
  const offer = FIRM_OFFERS[slug];
  docs.push({
    _id: `firm.${slug}`,
    _type: "firm",
    ...(toSanity(firm) as Record<string, Json>),
    offer: offer
      ? {
          partner: true,
          href: offer.href,
          ...(offer.code ? { code: offer.code } : {}),
          ...(offer.discountLabel ? { discountLabel: offer.discountLabel } : {}),
        }
      : { partner: false },
  });
}

for (const slug of Object.keys(FIRM_OFFERS)) {
  if (!firmSlugs.has(slug)) console.warn(`offer without firm file: ${slug}`);
}

for (const article of readJsonDir(NEWS_DIR)) {
  docs.push({
    _id: newsDocId(String(article.slug)),
    _type: "newsArticle",
    ...(toSanity(article) as Record<string, Json>),
  });
}

docs.push({
  _id: "homepagePlacements",
  _type: "homepagePlacements",
  top3: [],
  banner: { enabled: false },
  popularComparisons: POPULAR_COMPARISONS.map(([left, right], index) => ({
    _key: `pair${index}`,
    _type: "comparisonPair",
    left: { _type: "reference", _ref: `firm.${left}` },
    right: { _type: "reference", _ref: `firm.${right}` },
  })),
});

const out = process.argv[2] ?? "/tmp/propfxlab.ndjson";
writeFileSync(out, docs.map((doc) => JSON.stringify(doc)).join("\n") + "\n");
const counts = docs.reduce<Record<string, number>>((acc, doc) => {
  const type = String(doc._type);
  acc[type] = (acc[type] ?? 0) + 1;
  return acc;
}, {});
console.log(out, counts);
