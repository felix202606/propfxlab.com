import { POPULAR_COMPARISONS } from "@/lib/offers";
import { calculatePayout, type PayoutBreakdown } from "@/lib/payout";
import type { PropFirm } from "@/lib/schema";

export const COMPARE_DELIMITER = "-vs-";
export const COMPARE_ACCOUNT_SIZE = 100_000;
export const COMPARE_EXAMPLE_PROFIT = 8_000;

export type CompareReasonKey =
  | "reasonReputation"
  | "reasonHigherSplit"
  | "reasonFasterPayout"
  | "reasonMoreChannels"
  | "reasonHigherTakeHome";

export type CompareInsight = {
  leftReason: CompareReasonKey;
  rightReason: CompareReasonKey;
};

export function buildCompareSlug(leftSlug: string, rightSlug: string): string {
  return `${leftSlug}${COMPARE_DELIMITER}${rightSlug}`;
}

export function getPopularCompareSlugs(): string[] {
  const slugs = new Set<string>();
  for (const [left, right] of POPULAR_COMPARISONS) {
    slugs.add(buildCompareSlug(left, right));
    slugs.add(buildCompareSlug(right, left));
  }
  return [...slugs];
}

/**
 * Parse `ftmo-vs-fundednext` (or `apex-trader-funding-vs-topstep`) into two
 * known firm slugs. Tries an exact `-vs-` split first, then longest-prefix match
 * so multi-hyphen slugs still resolve.
 */
export function parseCompareSlug(
  slug: string,
  knownSlugs: readonly string[],
): [string, string] | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized.includes(COMPARE_DELIMITER)) return null;

  const [leftExact, rightExact] = splitOnce(normalized, COMPARE_DELIMITER);
  if (
    leftExact &&
    rightExact &&
    knownSlugs.includes(leftExact) &&
    knownSlugs.includes(rightExact)
  ) {
    return [leftExact, rightExact];
  }

  const sorted = [...knownSlugs].sort((a, b) => b.length - a.length);
  for (const left of sorted) {
    const prefix = `${left}${COMPARE_DELIMITER}`;
    if (!normalized.startsWith(prefix)) continue;
    const right = normalized.slice(prefix.length);
    if (knownSlugs.includes(right)) return [left, right];
  }

  return null;
}

export function maxTraderSharePercent(firm: PropFirm): number {
  const fromTiers = firm.calculator.profitSplitTiers.map(
    (tier) => tier.traderSharePercent,
  );
  return Math.max(firm.withdrawal.defaultTraderSharePercent, ...fromTiers);
}

export function examplePayoutForFirm(firm: PropFirm): PayoutBreakdown | null {
  const tierId = firm.calculator.profitSplitTiers[0]?.id;
  if (!tierId) return null;
  const result = calculatePayout({
    firm,
    challengeAmount: COMPARE_ACCOUNT_SIZE,
    profit: COMPARE_EXAMPLE_PROFIT,
    tierId,
  });
  if ("code" in result) return null;
  return result;
}

export function extractDrawdownRule(firm: PropFirm): string | null {
  const fromWarning = firm.withdrawal.warnings?.find(looksLikeDrawdown);
  if (fromWarning) return clipSentence(fromWarning);

  const fromFaq = firm.faqs.find(
    (item) => looksLikeDrawdown(item.question) || looksLikeDrawdown(item.answer),
  );
  if (fromFaq) return clipSentence(fromFaq.answer);

  const fromCon = firm.prosAndCons?.cons.find(looksLikeDrawdown);
  if (fromCon) return clipSentence(fromCon);

  return null;
}

export function pickCompareInsight(
  left: PropFirm,
  right: PropFirm,
): CompareInsight {
  const leftPayout = examplePayoutForFirm(left)?.netPayout ?? 0;
  const rightPayout = examplePayoutForFirm(right)?.netPayout ?? 0;

  const dimensions: Array<{
    key: CompareReasonKey;
    leftScore: number;
    rightScore: number;
  }> = [
    {
      key: "reasonReputation",
      leftScore: -Date.parse(left.basic.foundedAt),
      rightScore: -Date.parse(right.basic.foundedAt),
    },
    {
      key: "reasonHigherSplit",
      leftScore: maxTraderSharePercent(left),
      rightScore: maxTraderSharePercent(right),
    },
    {
      key: "reasonFasterPayout",
      leftScore: -left.withdrawal.payoutCycle.firstPayoutMinDays,
      rightScore: -right.withdrawal.payoutCycle.firstPayoutMinDays,
    },
    {
      key: "reasonMoreChannels",
      leftScore: left.withdrawal.channels.length,
      rightScore: right.withdrawal.channels.length,
    },
    {
      key: "reasonHigherTakeHome",
      leftScore: leftPayout,
      rightScore: rightPayout,
    },
  ];

  const ranked = [...dimensions].sort((a, b) => {
    const aGap = Math.abs(a.leftScore - a.rightScore);
    const bGap = Math.abs(b.leftScore - b.rightScore);
    return bGap - aGap;
  });

  let leftReason: CompareReasonKey | undefined;
  let rightReason: CompareReasonKey | undefined;

  for (const dim of ranked) {
    if (dim.leftScore === dim.rightScore) continue;
    if (dim.leftScore > dim.rightScore && !leftReason) {
      leftReason = dim.key;
    }
    if (dim.rightScore > dim.leftScore && !rightReason) {
      rightReason = dim.key;
    }
    if (leftReason && rightReason) break;
  }

  const leftovers: CompareReasonKey[] = [
    "reasonHigherSplit",
    "reasonFasterPayout",
    "reasonMoreChannels",
    "reasonHigherTakeHome",
    "reasonReputation",
  ];
  const used = new Set(
    [leftReason, rightReason].filter((key): key is CompareReasonKey => Boolean(key)),
  );

  if (!leftReason) {
    leftReason =
      leftovers.find((key) => !used.has(key)) ?? "reasonHigherTakeHome";
    used.add(leftReason);
  }
  if (!rightReason) {
    rightReason =
      leftovers.find((key) => !used.has(key)) ?? "reasonHigherSplit";
  }

  return { leftReason, rightReason };
}

function splitOnce(value: string, delimiter: string): [string, string] {
  const index = value.indexOf(delimiter);
  if (index === -1) return [value, ""];
  return [value.slice(0, index), value.slice(index + delimiter.length)];
}

function looksLikeDrawdown(text: string): boolean {
  return /drawdown|daily loss|overall loss|max loss|trailing/i.test(text);
}

function clipSentence(text: string, max = 180): string {
  const first = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1).trimEnd()}…`;
}
