/**
 * Count compare SEO copy issues across all canonical pairs and locales.
 *
 *   npx tsx scripts/count-compare-seo.ts
 *
 * Reports:
 *   - FundingPips pairs with an amount or an amount-verdict
 *   - FundingPips pairs with a FundingPips split figure
 *   - figure-order mismatches (every "A vs B" figure pair vs first-named firm)
 *   - split verdicts that contradict take-home
 *   - "X vs X" duplicates, descriptions over 155 chars, mixed-currency
 *     copy, and 1-day gaps framed as "sooner"
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "use-intl/core";
import {
  COMPARE_ACCOUNT_SIZE,
  COMPARE_EXAMPLE_PROFIT,
  COMPARE_EXCLUDED_SLUGS,
  examplePayoutForFirm,
  listCanonicalCompareSlugs,
  maxTraderSharePercent,
  parseCompareSlug,
} from "@/lib/compare";
import { formatMoney } from "@/lib/payout";
import { parsePropFirm, type PropFirm } from "@/lib/schema";
import {
  COMPARE_DESCRIPTION_MAX_CHARS,
  compactMoney,
  compareSeoDescription,
  compareSeoTitle,
  duplicateVsPhrases,
  excludeUnreliableSeoStats,
  hasExcludedSplitFigure,
  figureOrderMismatchesInCopy,
  hasContradictorySplitVerdict,
  hasMixedCurrencyCopy,
  hasNearTieSoonerCopy,
  hasSeoAmountOrAmountVerdict,
  pickCompareSeoTitleHook,
  titleText,
} from "@/lib/seo-copy";

const LOCALES = ["en", "es", "cn", "tw", "th", "vi", "pt"] as const;

const FEATURED = [
  "breakout-vs-tradeify",
  "apex-trader-funding-vs-breakout",
  "for-traders-vs-fundingpips",
  "breakout-vs-topstep",
  "breakout-vs-e8-markets",
  "breakout-vs-fundednext",
  "hyrotrader-vs-tradeify",
  "fundingpips-vs-the-trading-pit",
  "for-traders-vs-thinkcapital",
];

function loadFirms(): PropFirm[] {
  const dir = path.join(process.cwd(), "data", "firms");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => parsePropFirm(JSON.parse(readFileSync(path.join(dir, name), "utf8"))))
    .filter((firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug))
    .sort((a, b) => a.basic.name.localeCompare(b.basic.name, "en"));
}

function translator(locale: string) {
  const messages = JSON.parse(
    readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  );
  return createTranslator({ locale, messages, namespace: "ComparePage" });
}

function firstPayoutShort(
  t: (key: string, values?: Record<string, string | number>) => string,
  firm: PropFirm,
): string {
  const days = firm.withdrawal.payoutCycle.firstPayoutMinDays;
  return days === 0 ? t("firstPayoutShortDayOne") : t("firstPayoutShortDays", { days });
}

function splitRange(exampleSplit: number | undefined, maxSplit: number): string {
  return exampleSplit != null && exampleSplit < maxSplit
    ? `${exampleSplit}–${maxSplit}%`
    : `${maxSplit}%`;
}

function seoInput(
  t: (key: string, values?: Record<string, string | number>) => string,
  left: PropFirm,
  right: PropFirm,
  locale: string,
) {
  const leftExample = examplePayoutForFirm(left);
  const rightExample = examplePayoutForFirm(right);
  const leftNet = leftExample?.netPayout;
  const rightNet = rightExample?.netPayout;
  const hasTakeHome = leftNet != null && rightNet != null;
  return {
    left,
    right,
    leftSplitRange: splitRange(leftExample?.tier.traderSharePercent, maxTraderSharePercent(left)),
    rightSplitRange: splitRange(rightExample?.tier.traderSharePercent, maxTraderSharePercent(right)),
    leftFirst: firstPayoutShort(t, left),
    rightFirst: firstPayoutShort(t, right),
    leftFirstDays: left.withdrawal.payoutCycle.firstPayoutMinDays,
    rightFirstDays: right.withdrawal.payoutCycle.firstPayoutMinDays,
    leftTakeHome: hasTakeHome
      ? formatMoney(Math.round(leftNet), left.calculator.currency).replace(/\.00$/, "")
      : "",
    rightTakeHome: hasTakeHome
      ? formatMoney(Math.round(rightNet), right.calculator.currency).replace(/\.00$/, "")
      : "",
    leftNet: leftNet == null ? null : Math.round(leftNet),
    rightNet: rightNet == null ? null : Math.round(rightNet),
    account: compactMoney(COMPARE_ACCOUNT_SIZE, "USD"),
    profit: compactMoney(COMPARE_EXAMPLE_PROFIT, "USD"),
    locale,
  };
}

const firms = loadFirms();
const bySlug = new Map(firms.map((firm) => [firm.slug, firm]));
const known = firms.map((firm) => firm.slug);
const slugs = listCanonicalCompareSlugs(known);

const tEn = translator("en");
console.log("=== featured en ===");
for (const slug of FEATURED) {
  const parsed = parseCompareSlug(slug, known);
  if (!parsed) {
    console.log(slug, "UNPARSED");
    continue;
  }
  const left = bySlug.get(parsed[0]);
  const right = bySlug.get(parsed[1]);
  if (!left || !right) {
    console.log(slug, "MISSING FIRM");
    continue;
  }
  const input = seoInput(tEn, left, right, "en");
  const hook = pickCompareSeoTitleHook(input);
  const title = titleText(compareSeoTitle(tEn, input));
  const desc = compareSeoDescription(tEn, input);
  console.log(`\n${slug} hook=${hook} title=${title.length} desc=${desc.length}`);
  console.log(`  T: ${title}`);
  console.log(`  D: ${desc}`);
}

let fundingpipsAmount = 0;
let fundingpipsSplit = 0;
let figureOrder = 0;
let splitConflict = 0;
let vs = 0;
let over = 0;
let mixed = 0;
let sooner = 0;
let pairs = 0;
let fundingpipsPairs = 0;
const samples: Record<string, string[]> = {
  fundingpipsAmount: [],
  fundingpipsSplit: [],
  figureOrder: [],
  splitConflict: [],
  vs: [],
  over: [],
  mixed: [],
  sooner: [],
};

for (const locale of LOCALES) {
  const t = translator(locale);
  for (const slug of slugs) {
    const parsed = parseCompareSlug(slug, known);
    if (!parsed) continue;
    const left = bySlug.get(parsed[0]);
    const right = bySlug.get(parsed[1]);
    if (!left || !right) continue;
    pairs++;
    const input = seoInput(t, left, right, locale);
    const title = titleText(compareSeoTitle(t, input));
    const desc = compareSeoDescription(t, input);
    const text = `${title} ${desc}`;
    const isFundingpips = excludeUnreliableSeoStats(left, right);
    if (isFundingpips) fundingpipsPairs++;
    if (isFundingpips && hasSeoAmountOrAmountVerdict(title, desc)) {
      fundingpipsAmount++;
      if (samples.fundingpipsAmount.length < 8) {
        samples.fundingpipsAmount.push(`${locale} ${slug}: ${title} | ${desc}`);
      }
    }
    if (
      isFundingpips &&
      hasExcludedSplitFigure(title, desc, left, right, input.leftSplitRange, input.rightSplitRange)
    ) {
      fundingpipsSplit++;
      if (samples.fundingpipsSplit.length < 8) {
        samples.fundingpipsSplit.push(`${locale} ${slug}: ${title} | ${desc}`);
      }
    }
    const orderHits = figureOrderMismatchesInCopy(title, desc, {
      leftName: left.basic.name,
      rightName: right.basic.name,
      leftTakeHome: input.leftTakeHome,
      rightTakeHome: input.rightTakeHome,
      leftSplitRange: input.leftSplitRange,
      rightSplitRange: input.rightSplitRange,
      leftFirst: input.leftFirst,
      rightFirst: input.rightFirst,
    });
    if (orderHits.length) {
      figureOrder++;
      if (samples.figureOrder.length < 8) {
        samples.figureOrder.push(`${locale} ${slug}: ${orderHits.join(" | ")} :: ${desc}`);
      }
    }
    if (hasContradictorySplitVerdict(title, desc, input)) {
      splitConflict++;
      if (samples.splitConflict.length < 8) {
        samples.splitConflict.push(`${locale} ${slug}: ${title} | ${desc}`);
      }
    }
    const dups = duplicateVsPhrases(text);
    if (dups.length) {
      vs++;
      if (samples.vs.length < 8) samples.vs.push(`${locale} ${slug}: ${dups.join(" | ")} :: ${desc}`);
    }
    if (desc.length > COMPARE_DESCRIPTION_MAX_CHARS) {
      over++;
      if (samples.over.length < 8) samples.over.push(`${locale} ${slug} (${desc.length}): ${desc}`);
    }
    if (hasMixedCurrencyCopy(desc)) {
      mixed++;
      if (samples.mixed.length < 8) samples.mixed.push(`${locale} ${slug}: ${desc}`);
    }
    if (hasNearTieSoonerCopy(desc)) {
      sooner++;
      if (samples.sooner.length < 8) samples.sooner.push(`${locale} ${slug}: ${desc}`);
    }
  }
}

console.log("\n=== counts ===");
console.log({
  firms: firms.length,
  uniqueSlugs: slugs.length,
  pairLocaleRows: pairs,
  fundingpipsPairLocaleRows: fundingpipsPairs,
  fundingpipsAmountOrVerdict: fundingpipsAmount,
  fundingpipsSplitFigure: fundingpipsSplit,
  figureOrderMismatches: figureOrder,
  splitVerdictContradictsTakeHome: splitConflict,
  vs,
  over,
  mixed,
  sooner,
});
for (const [label, rows] of Object.entries(samples)) {
  if (!rows.length) continue;
  console.log(`\n${label} samples:`);
  for (const row of rows) console.log(" -", row);
}
