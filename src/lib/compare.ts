import { isCryptoChannel } from "@/lib/channel-tags";
import { POPULAR_COMPARISONS } from "@/lib/popular-comparisons";
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

/** Closed / redirected profiles must not mint compare URLs. */
export const COMPARE_EXCLUDED_SLUGS = new Set(["myfundedfx"]);

export function buildCompareSlug(leftSlug: string, rightSlug: string): string {
  return `${leftSlug}${COMPARE_DELIMITER}${rightSlug}`;
}

/** One indexable slug per unordered pair: `alpha-capital-vs-ftmo`, never both orders. */
export function canonicalCompareSlug(leftSlug: string, rightSlug: string): string {
  const [left, right] = [leftSlug, rightSlug].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  return buildCompareSlug(left, right);
}

export function compareableSlugs(slugs: readonly string[]): string[] {
  return [...new Set(slugs.filter((slug) => !COMPARE_EXCLUDED_SLUGS.has(slug)))].sort(
    (a, b) => a.localeCompare(b, "en"),
  );
}

export function listCanonicalCompareSlugs(slugs: readonly string[]): string[] {
  const sorted = compareableSlugs(slugs);
  const pairs: string[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      pairs.push(buildCompareSlug(sorted[i], sorted[j]));
    }
  }
  return pairs;
}

export function getPopularCompareSlugs(): string[] {
  const slugs = new Set<string>();
  for (const [left, right] of POPULAR_COMPARISONS) {
    if (COMPARE_EXCLUDED_SLUGS.has(left) || COMPARE_EXCLUDED_SLUGS.has(right)) {
      continue;
    }
    slugs.add(canonicalCompareSlug(left, right));
  }
  return [...slugs];
}

/**
 * Build-time prerender set. The full C(n,2) matrix stays in the sitemap and is
 * generated on demand (`dynamicParams`) so each Vercel deploy does not store
 * ~2,800 HTML snapshots. Popular pairs stay prerendered for the homepage.
 */
export function getPrerenderCompareSlugs(): string[] {
  return getPopularCompareSlugs();
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


export type DrawdownType =
  | "trailing"
  | "static"
  | "eod"
  | "intraday"
  | "daily_and_overall";

function firmRuleText(firm: PropFirm): string {
  const faqs = firm.faqs.flatMap((item) => [item.question, item.answer]);
  const pros = firm.prosAndCons?.pros ?? [];
  const cons = firm.prosAndCons?.cons ?? [];
  return [extractDrawdownRule(firm) ?? "", ...(firm.withdrawal.warnings ?? []), ...faqs, ...pros, ...cons].join(
    "\n",
  );
}

/**
 * Classify drawdown only when the firm's own text names a type.
 * Returns null rather than guessing.
 */
export function classifyDrawdownType(firm: PropFirm): DrawdownType | null {
  const text = firmRuleText(firm);
  // Only count a type when it is clearly about drawdown/loss, not product names
  // like "Intraday evaluation" or "Dual Step Intraday/Swing".
  if (
    /\b(?:eod|end[\s-]*of[\s-]*day)\s+(?:drawdown|trailing|loss)\b/i.test(text) ||
    /\b(?:drawdown|loss)\b[^.]{0,24}\b(?:eod|end[\s-]*of[\s-]*day)\b/i.test(text)
  ) {
    return "eod";
  }
  if (/\bintraday\s+(?:drawdown|loss|trailing)\b/i.test(text)) return "intraday";
  if (/\btrailing\s+(?:drawdown|daily|loss|max)\b/i.test(text)) return "trailing";
  if (/\b(?:static|fixed|non[\s-]*trailing)\s+(?:drawdown|max|maximum)\b/i.test(text)) {
    return "static";
  }
  if (/daily (?:loss|drawdown)/i.test(text) && /(?:overall|max(?:imum)?)\s+(?:loss|drawdown)/i.test(text)) {
    return "daily_and_overall";
  }
  return null;
}

/**
 * Minimum trading days when the firm states a clear number, or 0 when it
 * explicitly says there is no minimum. Vague "minimum trading days"
 * mentions without a number return null.
 */
export function extractMinTradingDays(firm: PropFirm): number | null {
  const text = firmRuleText(firm);
  if (
    /no minimum trading days|no min(?:imum)? trading days|without minimum trading days|there (?:is|are) no minimum trading days/i.test(
      text,
    )
  ) {
    return 0;
  }
  const numbered = text.match(
    /(?:minimum(?:\s+of)?|min(?:imum)?)\s+(\d+)\s+trading\s+days|(\d+)\s+minimum\s+trading\s+days|(\d+)\s+trading\s+days(?:\s+minimum)/i,
  );
  if (!numbered) return null;
  const days = Number(numbered[1] ?? numbered[2] ?? numbered[3]);
  return Number.isFinite(days) ? days : null;
}

export type CryptoPayoutInfo = {
  supported: boolean;
  labels: string[];
  hasStablecoin: boolean;
};

export function cryptoPayoutInfo(firm: PropFirm): CryptoPayoutInfo {
  const labels: string[] = [];
  let hasStablecoin = false;
  for (const channel of firm.withdrawal.channels) {
    if (!isCryptoChannel(channel)) continue;
    const blob = `${channel.name} ${channel.notes ?? ""} ${channel.currencies.join(" ")}`;
    if (/\busdc\b|\busdt\b|stablecoin/i.test(blob)) hasStablecoin = true;
    const found: string[] = [];
    if (/\busdc\b/i.test(blob)) found.push("USDC");
    if (/\busdt\b/i.test(blob)) found.push("USDT");
    if (/\bbtc\b|bitcoin/i.test(blob)) found.push("BTC");
    if (found.length === 0) found.push(channel.name);
    for (const label of found) {
      if (!labels.includes(label)) labels.push(label);
    }
  }
  return { supported: labels.length > 0, labels, hasStablecoin };
}

export function formatCryptoPayoutMethods(info: CryptoPayoutInfo): string {
  return info.labels.join(", ");
}

/** Compact payout rails for copy: USDC, USDT, Rise, bank wire, then others. */
export function payoutRailLabels(firm: PropFirm): string[] {
  const labels = [...cryptoPayoutInfo(firm).labels];
  const seen = new Set(labels.map((label) => label.toLowerCase()));
  const add = (label: string) => {
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };
  for (const channel of firm.withdrawal.channels) {
    if (isCryptoChannel(channel)) continue;
    if (/\brise\b/i.test(channel.name)) add("Rise");
    else if (
      channel.method === "bank_wire" ||
      /bank|wire|sepa|swift|\bach\b/i.test(channel.name)
    ) {
      add("bank wire");
    } else {
      const short = channel.name.split(/[(/]/)[0]?.trim() ?? channel.name;
      add(short.length > 16 ? (short.split(/\s+/)[0] ?? short) : short);
    }
  }
  return labels;
}

export type PayoutFrequencyToken = "on_demand" | "weekly" | "biweekly" | "monthly" | `every_${number}`;

export function payoutFrequencyToken(firm: PropFirm): PayoutFrequencyToken | null {
  const cycle = firm.withdrawal.payoutCycle;
  if (cycle.subsequentIntervalDays === 7) return "weekly";
  if (cycle.subsequentIntervalDays === 14) return "biweekly";
  if (cycle.subsequentIntervalDays === 30) return "monthly";
  if (cycle.type === "on_demand") return "on_demand";
  if (cycle.subsequentIntervalDays && cycle.subsequentIntervalDays > 0) {
    return `every_${cycle.subsequentIntervalDays}`;
  }
  return null;
}

/** Frequency only — on-demand firms with the same first-payout wait compare equal. */
export function payoutFrequencyKey(firm: PropFirm): string {
  const cycle = firm.withdrawal.payoutCycle;
  if (cycle.type === "on_demand") return `on_demand:${cycle.firstPayoutMinDays}`;
  return `${cycle.type}:${cycle.firstPayoutMinDays}:${cycle.subsequentIntervalDays ?? "none"}`;
}

/** Withdrawal rails (method + named crypto/stablecoin labels). */
export function payoutMethodsKey(firm: PropFirm): string {
  const methods = [...new Set(firm.withdrawal.channels.map((channel) => channel.method))].sort().join("+");
  const crypto = cryptoPayoutInfo(firm).labels.join("+");
  return `${methods}|${crypto}`;
}

export const FIRST_PAYOUT_TIE_DAYS = 1;
/** Take-home gaps below this (same currency, after rounding) are treated as ties. */
export const TAKE_HOME_TIE_AMOUNT = 50;

export function isFirstPayoutTie(leftDays: number, rightDays: number): boolean {
  return Math.abs(leftDays - rightDays) <= FIRST_PAYOUT_TIE_DAYS;
}

export function samePayoutCurrency(left: PropFirm, right: PropFirm): boolean {
  return left.calculator.currency === right.calculator.currency;
}

/**
 * The published take-home example is $8K profit on a $100K account.
 * Only compare dollar amounts when both firms' calculator currency is USD,
 * so we never mix $ and € (or invent an FX rate).
 */
export function comparableTakeHome(left: PropFirm, right: PropFirm): boolean {
  return left.calculator.currency === "USD" && right.calculator.currency === "USD";
}

export function isTakeHomeTie(leftNet: number | null, rightNet: number | null): boolean {
  if (leftNet == null || rightNet == null) return true;
  return Math.abs(leftNet - rightNet) < TAKE_HOME_TIE_AMOUNT;
}

export type CompareDifferentiator = "drawdown" | "minTradingDays" | "payoutMethod" | "cryptoPayouts";

export type ConcreteDifferentiator =
  | { key: "drawdown"; left: DrawdownType; right: DrawdownType }
  | { key: "minTradingDays"; leftDays: number; rightDays: number }
  | { key: "payoutFrequency"; left: PayoutFrequencyToken; right: PayoutFrequencyToken }
  | { key: "payoutRails"; left: string[]; right: string[] }
  | { key: "cryptoPayouts"; left: string; right: string };

/**
 * First field, in the stated order, that both firms have data for and that
 * actually differs with concrete labels. Used when a compared value would
 * otherwise read "X vs X".
 */
export function pickConcreteDifferentiator(
  left: PropFirm,
  right: PropFirm,
): ConcreteDifferentiator | null {
  const leftDrawdown = classifyDrawdownType(left);
  const rightDrawdown = classifyDrawdownType(right);
  if (leftDrawdown && rightDrawdown && leftDrawdown !== rightDrawdown) {
    return { key: "drawdown", left: leftDrawdown, right: rightDrawdown };
  }

  const leftDays = extractMinTradingDays(left);
  const rightDays = extractMinTradingDays(right);
  if (leftDays != null && rightDays != null && leftDays !== rightDays) {
    return { key: "minTradingDays", leftDays, rightDays };
  }

  const leftFreq = payoutFrequencyToken(left);
  const rightFreq = payoutFrequencyToken(right);
  if (leftFreq && rightFreq && leftFreq !== rightFreq) {
    return { key: "payoutFrequency", left: leftFreq, right: rightFreq };
  }

  const leftRails = payoutRailLabels(left);
  const rightRails = payoutRailLabels(right);
  if (leftRails.join("|") !== rightRails.join("|") && leftRails.length > 0 && rightRails.length > 0) {
    return { key: "payoutRails", left: leftRails, right: rightRails };
  }

  const leftCrypto = cryptoPayoutInfo(left);
  const rightCrypto = cryptoPayoutInfo(right);
  if (leftCrypto.supported || rightCrypto.supported) {
    const leftLabel = leftCrypto.supported ? leftCrypto.labels.join(", ") || "crypto" : "none";
    const rightLabel = rightCrypto.supported ? rightCrypto.labels.join(", ") || "crypto" : "none";
    if (leftLabel !== rightLabel) {
      return { key: "cryptoPayouts", left: leftLabel, right: rightLabel };
    }
  }

  return null;
}

/** @deprecated Use pickConcreteDifferentiator — kept for any residual key-only callers. */
export function pickCompareDifferentiator(
  left: PropFirm,
  right: PropFirm,
): CompareDifferentiator | null {
  const concrete = pickConcreteDifferentiator(left, right);
  if (!concrete) return null;
  if (concrete.key === "payoutFrequency" || concrete.key === "payoutRails") return "payoutMethod";
  return concrete.key;
}

export type ProfileFallbackField = "platform" | "markets";

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

/** Data-backed fallback when split and payout look the same. Never invents price. */
export function profileFallbackField(
  left: PropFirm,
  right: PropFirm,
): ProfileFallbackField | null {
  if (
    left.platforms.length > 0 &&
    right.platforms.length > 0 &&
    !sameStringSet(left.platforms, right.platforms)
  ) {
    return "platform";
  }
  const leftMarkets = [...left.category, ...left.assets];
  const rightMarkets = [...right.category, ...right.assets];
  if (leftMarkets.length > 0 && rightMarkets.length > 0 && !sameStringSet(leftMarkets, rightMarkets)) {
    return "markets";
  }
  return null;
}

export function bothHaveCryptoPayouts(left: PropFirm, right: PropFirm): boolean {
  return cryptoPayoutInfo(left).supported && cryptoPayoutInfo(right).supported;
}

export type CompareTitleHook = "faster" | "more" | "split" | "crypto" | "cryptoBoth" | "generic";

const TAKE_HOME_SCORE_REF = 2_000;
const SPLIT_SCORE_REF = 20;
const SPEED_SCORE_REF = 14;
const CRYPTO_HOOK_SCORE = 0.35;

export type CompareHookInput = {
  leftFirstDays: number;
  rightFirstDays: number;
  leftTakeHome: number | null;
  rightTakeHome: number | null;
  left: PropFirm;
  right: PropFirm;
};

export function compareHookScores(input: CompareHookInput): Record<Exclude<CompareTitleHook, "generic" | "cryptoBoth">, number> {
  const sameCurrency = comparableTakeHome(input.left, input.right);
  const takeHomeGap =
    sameCurrency && input.leftTakeHome != null && input.rightTakeHome != null
      ? Math.abs(input.leftTakeHome - input.rightTakeHome)
      : 0;
  const splitGap = Math.abs(
    maxTraderSharePercent(input.left) - maxTraderSharePercent(input.right),
  );
  const speedGap = Math.abs(input.leftFirstDays - input.rightFirstDays);
  const leftCrypto = cryptoPayoutInfo(input.left).supported;
  const rightCrypto = cryptoPayoutInfo(input.right).supported;

  return {
    more:
      sameCurrency && takeHomeGap >= TAKE_HOME_TIE_AMOUNT
        ? Math.min(1, takeHomeGap / TAKE_HOME_SCORE_REF)
        : 0,
    split: splitGap > 0 ? Math.min(1, splitGap / SPLIT_SCORE_REF) : 0,
    faster: !isFirstPayoutTie(input.leftFirstDays, input.rightFirstDays)
      ? Math.min(1, speedGap / SPEED_SCORE_REF)
      : 0,
    // Title hook only when one firm has crypto and the other does not.
    crypto: leftCrypto !== rightCrypto ? CRYPTO_HOOK_SCORE : 0,
  };
}

/**
 * Pick the title hook with the largest real gap. "Which Pays Faster?" is
 * used only when first-payout speed is the strongest (and more than a 1-day tie).
 * Ties on score prefer take-home, then split, then speed, then crypto.
 */
export function pickCompareTitleHook(input: CompareHookInput): CompareTitleHook {
  const scores = compareHookScores(input);
  const order: Array<Exclude<CompareTitleHook, "generic" | "cryptoBoth">> = ["more", "split", "faster", "crypto"];
  let best: CompareTitleHook = "generic";
  let bestScore = 0;
  for (const hook of order) {
    if (scores[hook] > bestScore) {
      best = hook;
      bestScore = scores[hook];
    }
  }
  // No numeric gap is large enough: if both firms pay out in crypto/stablecoin,
  // use a crypto-intent title instead of the generic template.
  if (best === "generic" && bothHaveCryptoPayouts(input.left, input.right)) {
    return "cryptoBoth";
  }
  return best;
}
