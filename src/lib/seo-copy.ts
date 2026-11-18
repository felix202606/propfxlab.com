import type { Metadata } from "next";
import { localeMeta } from "@/i18n/routing";
import featuredCompares from "../../data/featured-compares.json";
import {
  cryptoPayoutInfo,
  formatCryptoPayoutMethods,
  isFirstPayoutTie,
  isTakeHomeTie,
  maxTraderSharePercent,
  parseCompareSlug,
  pickCompareTitleHook,
  pickConcreteDifferentiator,
  profileFallbackField,
  comparableTakeHome,
  payoutRailLabels,
  type ConcreteDifferentiator,
  type DrawdownType,
  type PayoutFrequencyToken,
} from "@/lib/compare";
import type { PropFirm } from "@/lib/schema";
import { SITE_NAME } from "@/lib/seo";

/** Google truncates titles around 60 characters. */
export const TITLE_MAX_CHARS = 60;
const TEMPLATE_SUFFIX = ` · ${SITE_NAME}`;

/**
 * Pick the most descriptive title candidate that fits: keep the layout's
 * "%s · PropFXLab" suffix when it fits, otherwise use `absolute` (no brand)
 * before falling back to a shorter candidate.
 */
export function fitTitle(
  candidates: readonly string[],
  max = TITLE_MAX_CHARS,
): NonNullable<Metadata["title"]> {
  const usable = candidates.filter(Boolean);
  for (const candidate of usable) {
    if (candidate.length + TEMPLATE_SUFFIX.length <= max) return candidate;
    if (candidate.length <= max) return { absolute: candidate };
  }
  return { absolute: usable[usable.length - 1] ?? SITE_NAME };
}

/** Google shows roughly 155–160 characters of a meta description. */
export const DESCRIPTION_MAX_CHARS = 160;

/** First description candidate that fits, else the shortest one. */
export function fitDescription(
  candidates: readonly string[],
  max = DESCRIPTION_MAX_CHARS,
): string {
  const usable = candidates.filter(Boolean);
  return (
    usable.find((candidate) => candidate.length <= max) ??
    [...usable].sort((a, b) => a.length - b.length)[0] ??
    ""
  );
}

/** Plain string version of a Metadata title (for og/twitter/JSON-LD). */
export function titleText(title: NonNullable<Metadata["title"]>): string {
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  return "";
}

export function seoYear(): number {
  return new Date().getFullYear();
}

/** "$200K", "$2M" — compact money for titles and meta descriptions. */
export function compactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

export function listFormat(locale: string, items: readonly string[]): string {
  const bcp47 = localeMeta[locale as keyof typeof localeMeta]?.bcp47 ?? "en";
  return new Intl.ListFormat(bcp47, { style: "long", type: "conjunction" }).format(
    items,
  );
}

/** Data points used by firm/compare titles, metas and fact sentences. */
export type FirmSeoFacts = {
  name: string;
  defaultSplit: number;
  maxSplit: number;
  firstPayoutDays: number;
  /** null when payouts are on demand after the first one. */
  intervalDays: number | null;
  minPayout: string | null;
  minFunding: string;
  maxFunding: string;
  channelNames: string[];
};

export function firmSeoFacts(firm: PropFirm): FirmSeoFacts {
  const { funding } = firm.basic;
  const cycle = firm.withdrawal.payoutCycle;
  const minPayoutAmount = firm.calculator.minPayoutAmount;
  return {
    name: firm.basic.name,
    defaultSplit: firm.withdrawal.defaultTraderSharePercent,
    maxSplit: maxTraderSharePercent(firm),
    firstPayoutDays: cycle.firstPayoutMinDays,
    intervalDays:
      cycle.type === "on_demand" ? null : (cycle.subsequentIntervalDays ?? null),
    minPayout:
      typeof minPayoutAmount === "number" && minPayoutAmount > 0
        ? compactMoney(minPayoutAmount, firm.calculator.currency)
        : null,
    minFunding: compactMoney(funding.minAccountSize, funding.currency),
    // Initial account size, not the scaling cap.
    maxFunding: compactMoney(funding.maxAccountSize, funding.currency),
    channelNames: firm.withdrawal.channels.map((channel) => channel.name),
  };
}

/**
 * Compare pairs with the most search impressions (data/featured-compares.json)
 * that include `firmSlug`, in impression order.
 */
export function featuredComparesForFirm(
  firmSlug: string,
  knownSlugs: readonly string[],
  limit = 6,
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const slug of featuredCompares.slugs) {
    const parsed = parseCompareSlug(slug, knownSlugs);
    if (!parsed || !parsed.includes(firmSlug)) continue;
    pairs.push(parsed);
    if (pairs.length >= limit) break;
  }
  return pairs;
}


/** Google typically shows ~155 characters of a compare meta description. */
export const COMPARE_DESCRIPTION_MAX_CHARS = 155;

type CompareCopyT = {
  (key: string, values?: Record<string, string | number>): string;
};

export type CompareSeoFactsInput = {
  left: PropFirm;
  right: PropFirm;
  leftSplitRange: string;
  rightSplitRange: string;
  leftFirst: string;
  rightFirst: string;
  leftFirstDays: number;
  rightFirstDays: number;
  leftTakeHome: string;
  rightTakeHome: string;
  leftNet: number | null;
  rightNet: number | null;
  account: string;
  profit: string;
  locale?: string;
};

const TITLE_HOOK_KEYS = {
  faster: {
    long: "metaTitleFaster",
    short: "metaTitleFasterShort",
  },
  more: {
    long: "metaTitleMore",
    short: "metaTitleMoreShort",
  },
  split: {
    long: "metaTitleSplit",
    short: "metaTitleSplitShort",
  },
  crypto: {
    long: "metaTitleCrypto",
    short: "metaTitleCryptoShort",
  },
  generic: {
    long: "metaTitle",
    short: "metaTitleShort",
  },
} as const;

const DRAWDOWN_TYPE_KEYS: Record<DrawdownType, string> = {
  trailing: "drawdownTypeTrailing",
  static: "drawdownTypeStatic",
  eod: "drawdownTypeEod",
  intraday: "drawdownTypeIntraday",
  daily_and_overall: "drawdownTypeDailyOverall",
};

function hookInput(input: CompareSeoFactsInput) {
  return {
    leftFirstDays: input.leftFirstDays,
    rightFirstDays: input.rightFirstDays,
    leftTakeHome: input.leftNet,
    rightTakeHome: input.rightNet,
    left: input.left,
    right: input.right,
  };
}

function formatRails(_t: CompareCopyT, labels: readonly string[], locale?: string): string {
  if (labels.length === 0) return "";
  if (locale) return listFormat(locale, labels);
  if (labels.length === 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function isCryptoRailLabel(label: string): boolean {
  return /USDC|USDT|BTC|stablecoin|crypto/i.test(label);
}

function sharedRailLabels(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right.map((label) => label.toLowerCase()));
  return left.filter((label) => rightSet.has(label.toLowerCase()));
}

function uniqueRailLabels(items: readonly string[], other: readonly string[]): string[] {
  const otherSet = new Set(other.map((label) => label.toLowerCase()));
  return items.filter((label) => !otherSet.has(label.toLowerCase()));
}

function sameRailLabels(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right.map((label) => label.toLowerCase()));
  return left.every((label) => rightSet.has(label.toLowerCase()));
}

/**
 * Natural payment-method sentences, longest/most specific first, then a
 * short fallback that still fits a 155-character description.
 */
export function formatRailsContrast(
  t: CompareCopyT,
  leftName: string,
  rightName: string,
  leftRails: readonly string[],
  rightRails: readonly string[],
  locale?: string,
): string[] {
  if (leftRails.length === 0 || rightRails.length === 0) return [];
  if (sameRailLabels(leftRails, rightRails)) return [];

  const fmt = (labels: readonly string[]) => formatRails(t, labels, locale);
  const bothAdds = (shared: readonly string[], name: string, extras: readonly string[]) =>
    t("railsBothAdds", { shared: fmt(shared), name, extras: fmt(extras) });
  const paysAdds = (leftMethods: readonly string[], rightMethods: readonly string[]) =>
    t("railsPaysAdds", {
      left: leftName,
      leftMethods: fmt(leftMethods),
      right: rightName,
      rightMethods: fmt(rightMethods),
    });
  const paysPays = () =>
    t("railsPaysPays", {
      left: leftName,
      leftMethods: fmt(leftRails),
      right: rightName,
      rightMethods: fmt(rightRails),
    });

  const candidates: string[] = [];
  const leftCrypto = leftRails.filter(isCryptoRailLabel);
  const rightCrypto = rightRails.filter(isCryptoRailLabel);
  const sharedCrypto = sharedRailLabels(leftCrypto, rightCrypto);
  const leftCryptoOnly = uniqueRailLabels(leftCrypto, rightCrypto);
  const rightCryptoOnly = uniqueRailLabels(rightCrypto, leftCrypto);

  if (sharedCrypto.length > 0 && leftCryptoOnly.length === 0 && rightCryptoOnly.length > 0) {
    candidates.push(bothAdds(sharedCrypto, rightName, rightCryptoOnly));
  } else if (sharedCrypto.length > 0 && rightCryptoOnly.length === 0 && leftCryptoOnly.length > 0) {
    candidates.push(bothAdds(sharedCrypto, leftName, leftCryptoOnly));
  } else if (leftCrypto.length > 0 && rightCrypto.length > 0 && sharedCrypto.length === 0) {
    candidates.push(paysAdds(leftCrypto, rightRails));
  }

  const sharedAll = sharedRailLabels(leftRails, rightRails);
  const leftOnly = uniqueRailLabels(leftRails, rightRails);
  const rightOnly = uniqueRailLabels(rightRails, leftRails);
  if (sharedAll.length > 0 && leftOnly.length === 0 && rightOnly.length > 0) {
    candidates.push(bothAdds(sharedAll, rightName, rightOnly));
  } else if (sharedAll.length > 0 && rightOnly.length === 0 && leftOnly.length > 0) {
    candidates.push(bothAdds(sharedAll, leftName, leftOnly));
  } else if (sharedAll.length > 0 && leftOnly.length > 0 && rightOnly.length > 0) {
    candidates.push(paysPays());
  } else if (sharedAll.length === 0) {
    candidates.push(paysAdds(leftRails, rightRails));
    candidates.push(paysPays());
  }

  const moreName =
    rightRails.length > leftRails.length
      ? rightName
      : leftRails.length > rightRails.length
        ? leftName
        : null;
  if (moreName) candidates.push(t("railsMoreMethods", { name: moreName }));
  else candidates.push(t("railsDifferShort"));

  return [...new Set(candidates.filter(Boolean))];
}

function railsSentenceCandidates(t: CompareCopyT, input: CompareSeoFactsInput): string[] {
  return formatRailsContrast(
    t,
    input.left.basic.name,
    input.right.basic.name,
    payoutRailLabels(input.left),
    payoutRailLabels(input.right),
    input.locale,
  );
}

function frequencyLabel(t: CompareCopyT, token: PayoutFrequencyToken): string {
  if (token === "on_demand") return t("freqOnDemand");
  if (token === "weekly") return t("freqWeekly");
  if (token === "biweekly") return t("freqBiweekly");
  if (token === "monthly") return t("freqMonthly");
  const days = Number(token.slice("every_".length));
  return t("freqEveryDays", { days });
}

function minDaysLabel(t: CompareCopyT, days: number): string {
  return days === 0 ? t("minDaysNone") : t("minDaysCount", { days });
}

/** Concrete "static vs trailing drawdown" (or rails / frequency) phrase. */
export function formatDifferentiatorPhrase(
  t: CompareCopyT,
  detail: ConcreteDifferentiator,
  locale?: string,
): string {
  switch (detail.key) {
    case "drawdown":
      return t("diffDrawdownValue", {
        left: t(DRAWDOWN_TYPE_KEYS[detail.left]),
        right: t(DRAWDOWN_TYPE_KEYS[detail.right]),
      });
    case "minTradingDays":
      return t("diffMinDaysValue", {
        left: minDaysLabel(t, detail.leftDays),
        right: minDaysLabel(t, detail.rightDays),
      });
    case "payoutFrequency":
      return t("diffPayoutValue", {
        left: frequencyLabel(t, detail.left),
        right: frequencyLabel(t, detail.right),
      });
    case "payoutRails":
      return t("diffPayoutValue", {
        left: formatRails(t, detail.left, locale),
        right: formatRails(t, detail.right, locale),
      });
    case "cryptoPayouts":
      return t("diffCryptoValue", {
        left: detail.left === "none" ? t("cryptoNone") : detail.left,
        right: detail.right === "none" ? t("cryptoNone") : detail.right,
      });
  }
}

export function compareSeoTitle(t: CompareCopyT, input: CompareSeoFactsInput) {
  const year = seoYear();
  const hook = pickCompareTitleHook(hookInput(input));
  const names = { left: input.left.basic.name, right: input.right.basic.name, year };
  if (hook === "cryptoBoth") {
    const hasStablecoin =
      cryptoPayoutInfo(input.left).hasStablecoin ||
      cryptoPayoutInfo(input.right).hasStablecoin;
    return fitTitle([
      ...(hasStablecoin
        ? [t("metaTitleStablecoinCrypto", names), t("metaTitleStablecoinShort", names)]
        : [t("metaTitleCrypto", names)]),
      t("metaTitleCryptoShort", names),
      t("metaTitle", names),
      t("metaTitleShort", names),
      t("metaTitleMin", names),
    ]);
  }
  const hookKeys = TITLE_HOOK_KEYS[hook];
  return fitTitle([
    t(hookKeys.long, names),
    t(hookKeys.short, names),
    t("metaTitle", names),
    t("metaTitleShort", names),
    t("metaTitleMin", names),
  ]);
}

function joinSentences(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
}

function compareVerdict(t: CompareCopyT, input: CompareSeoFactsInput, hook: ReturnType<typeof pickCompareTitleHook>): string {
  const leftName = input.left.basic.name;
  const rightName = input.right.basic.name;
  if (hook === "faster") {
    const leftFaster = input.leftFirstDays < input.rightFirstDays;
    return t("verdictFaster", {
      faster: leftFaster ? leftName : rightName,
      slower: leftFaster ? rightName : leftName,
      fastFirst: leftFaster ? input.leftFirst : input.rightFirst,
      slowFirst: leftFaster ? input.rightFirst : input.leftFirst,
    });
  }
  if (
    hook === "more" &&
    input.leftNet != null &&
    input.rightNet != null &&
    comparableTakeHome(input.left, input.right)
  ) {
    const leftWins = input.leftNet > input.rightNet;
    return t("verdictMore", {
      winner: leftWins ? leftName : rightName,
      profit: input.profit,
      leftTakeHome: input.leftTakeHome,
      rightTakeHome: input.rightTakeHome,
    });
  }
  if (hook === "split") {
    const leftHigher =
      maxTraderSharePercent(input.left) > maxTraderSharePercent(input.right);
    return t("verdictSplit", {
      winner: leftHigher ? leftName : rightName,
      leftSplitRange: input.leftSplitRange,
      rightSplitRange: input.rightSplitRange,
    });
  }
  if (hook === "crypto") {
    const leftCrypto = cryptoPayoutInfo(input.left);
    const rightCrypto = cryptoPayoutInfo(input.right);
    const supported = leftCrypto.supported ? leftCrypto : rightCrypto;
    const name = leftCrypto.supported ? leftName : rightName;
    const other = leftCrypto.supported ? rightName : leftName;
    return t("verdictCryptoOne", {
      name,
      other,
      methods: formatCryptoPayoutMethods(supported),
    });
  }
  if (hook === "cryptoBoth") {
    const leftCrypto = cryptoPayoutInfo(input.left);
    const rightCrypto = cryptoPayoutInfo(input.right);
    if (leftCrypto.hasStablecoin || rightCrypto.hasStablecoin) {
      return t("verdictBothStablecoin", { left: leftName, right: rightName });
    }
    return t("verdictCryptoBoth", { left: leftName, right: rightName, stablecoinNote: "" });
  }
  return t("verdictGeneric", { left: leftName, right: rightName });
}

function bothCryptoSentence(t: CompareCopyT, input: CompareSeoFactsInput): string | null {
  const leftCrypto = cryptoPayoutInfo(input.left);
  const rightCrypto = cryptoPayoutInfo(input.right);
  if (!leftCrypto.supported || !rightCrypto.supported) return null;
  const stablecoinNote =
    leftCrypto.hasStablecoin || rightCrypto.hasStablecoin
      ? t("verdictCryptoStablecoinNote")
      : "";
  return t("bothCryptoShort", { stablecoinNote });
}

function splitSentence(t: CompareCopyT, input: CompareSeoFactsInput, hook: string): string | null {
  const equal = input.leftSplitRange === input.rightSplitRange;
  if (equal) {
    const detail = pickConcreteDifferentiator(input.left, input.right);
    // Rails are phrased as their own natural sentence, not "A vs B decides it".
    if (detail?.key === "payoutRails") {
      return t("bothSplit", { split: input.leftSplitRange });
    }
    if (detail) {
      return t("bothSplitDecides", {
        split: input.leftSplitRange,
        differentiator: formatDifferentiatorPhrase(t, detail, input.locale),
      });
    }
    const fallback = profileFallbackField(input.left, input.right);
    if (fallback === "platform") {
      return t("bothSplitPickPlatform", { split: input.leftSplitRange });
    }
    if (fallback === "markets") {
      return t("bothSplitPickMarkets", { split: input.leftSplitRange });
    }
    return t("bothSplit", { split: input.leftSplitRange });
  }
  if (hook === "split") return null;
  return t("splitVs", {
    leftSplitRange: input.leftSplitRange,
    rightSplitRange: input.rightSplitRange,
  });
}

function takeHomeSentence(t: CompareCopyT, input: CompareSeoFactsInput, hook: string): string | null {
  // Safer than inventing a 1:1 FX rate: drop the dollar comparison when
  // the two firms' calculator currencies differ.
  if (!comparableTakeHome(input.left, input.right)) return null;
  if (input.leftNet == null || input.rightNet == null) return null;
  if (isTakeHomeTie(input.leftNet, input.rightNet)) {
    return t("bothTakeHome", {
      profit: input.profit,
      account: input.account,
      amount: input.leftTakeHome,
    });
  }
  if (hook === "more") return null;
  return t("takeHomeVs", {
    profit: input.profit,
    account: input.account,
    leftTakeHome: input.leftTakeHome,
    rightTakeHome: input.rightTakeHome,
  });
}

function firstPayoutSentence(t: CompareCopyT, input: CompareSeoFactsInput, hook: string): string | null {
  if (hook === "faster") return null;
  if (isFirstPayoutTie(input.leftFirstDays, input.rightFirstDays)) {
    if (input.leftFirstDays === input.rightFirstDays) {
      return t("bothFirst", { first: input.leftFirst });
    }
    // 0 vs 1 (or 5 vs 6): a near-tie, not worth highlighting.
    return null;
  }
  return t("firstVs", { leftFirst: input.leftFirst, rightFirst: input.rightFirst });
}

function cryptoBothLeadShort(t: CompareCopyT, input: CompareSeoFactsInput): string | null {
  const leftCrypto = cryptoPayoutInfo(input.left);
  const rightCrypto = cryptoPayoutInfo(input.right);
  if (leftCrypto.hasStablecoin || rightCrypto.hasStablecoin) {
    return t("verdictBothStablecoinShort");
  }
  return t("bothCryptoShort", { stablecoinNote: "" });
}

export function compareSeoDescription(t: CompareCopyT, input: CompareSeoFactsInput): string {
  const hook = pickCompareTitleHook(hookInput(input));
  const hookVerdict = compareVerdict(t, input, hook);
  const hookVerdictShort = hook === "cryptoBoth" ? cryptoBothLeadShort(t, input) : null;
  const cryptoBoth = hook === "crypto" || hook === "cryptoBoth" ? null : bothCryptoSentence(t, input);
  const split = splitSentence(t, input, hook);
  const takeHome = takeHomeSentence(t, input, hook);
  const first = firstPayoutSentence(t, input, hook);
  const rails = railsSentenceCandidates(t, input);
  // For a generic hook, the concrete split sentence is a better lead
  // than "compared on split, payout speed and drawdown". cryptoBoth already
  // opens with a data-backed crypto/stablecoin verdict.
  const leadVerdict = hook === "generic" ? (split ?? hookVerdict) : hookVerdict;
  const splitAfter = hook === "generic" && leadVerdict === split ? null : split;
  const verdicts = [
    leadVerdict,
    ...(hookVerdictShort && hookVerdictShort !== leadVerdict ? [hookVerdictShort] : []),
  ];

  const candidates: string[] = [];
  // Prefer payment-method wording and take-home over a tied first-payout line
  // or a same-split filler, so a slightly shorter combo does not drop rails.
  const extrasFor = (verdict: string, railsLine: string | null) => {
    const extras: Array<{ text: string; weight: number }> = [];
    const preferRails = hook === "cryptoBoth" || hook === "generic";
    if (preferRails) {
      if (railsLine) extras.push({ text: railsLine, weight: 16 });
      if (takeHome) extras.push({ text: takeHome, weight: 8 });
      if (splitAfter) extras.push({ text: splitAfter, weight: 4 });
      if (cryptoBoth) extras.push({ text: cryptoBoth, weight: 3 });
      if (first) extras.push({ text: first, weight: 2 });
    } else {
      const splitsDiffer = input.leftSplitRange !== input.rightSplitRange;
      if (takeHome) extras.push({ text: takeHome, weight: 16 });
      if (first) extras.push({ text: first, weight: 12 });
      if (splitAfter) extras.push({ text: splitAfter, weight: splitsDiffer ? 14 : 8 });
      if (cryptoBoth) extras.push({ text: cryptoBoth, weight: splitsDiffer ? 8 : 12 });
      if (railsLine) extras.push({ text: railsLine, weight: 2 });
    }
    const n = extras.length;
    const scored: Array<{ score: number; text: string }> = [];
    for (let mask = (1 << n) - 1; mask >= 0; mask--) {
      let score = 0;
      const parts: string[] = [verdict];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << (n - 1 - i))) {
          score += extras[i]!.weight;
          parts.push(extras[i]!.text);
        }
      }
      scored.push({ score, text: joinSentences(...parts) });
    }
    scored.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
    return scored.map((item) => item.text);
  };
  for (const verdict of verdicts) {
    if (rails.length) {
      for (const railsLine of rails) candidates.push(...extrasFor(verdict, railsLine));
    }
    candidates.push(...extrasFor(verdict, null));
  }
  candidates.push(
    hookVerdict,
    t("verdictGeneric", { left: input.left.basic.name, right: input.right.basic.name }),
  );
  return fitDescription(candidates, COMPARE_DESCRIPTION_MAX_CHARS);
}

/**
 * Phrases of the form "X vs X" / "X 对 X" / "X 對 X" where both sides are
 * identical. Used to verify compare descriptions never repeat a tied value.
 */
function lastBoundary(text: string, end: number): number {
  const marks = [". ", "; ", ": ", "。", "；", "："];
  let at = 0;
  for (const mark of marks) {
    const index = text.lastIndexOf(mark, Math.max(0, end - 1));
    if (index >= 0) at = Math.max(at, index + mark.length);
  }
  return at;
}

function cutRight(text: string): string {
  const cut = text.search(
    /(?:[.;。；]|$|\s+decides it\b|\s+la diferencia está en\b|\s+决定因素是|\s+決定因素是|\s+เป็นตัวตัดสิน|\s+yếu tố quyết định là|\s+a diferença está em\b)/i,
  );
  return (cut === -1 ? text : text.slice(0, cut)).trim();
}

function normalizeVsOperand(value: string): string {
  return value
    .trim()
    .replace(/\s+(?:split|reparto|divisão|chia|ส่วนแบ่ง)$/i, "")
    .replace(/\s+/g, " ");
}

/**
 * "X vs X" / "X 对 X" only when the full operands are identical
 * ("80–90% vs 80–90%"), not when a shared token appears inside two
 * different lists ("USDC, USDT vs USDT, Rise").
 */
export function duplicateVsPhrases(text: string): string[] {
  const hits: string[] = [];
  const splitter = /\s+(?:vs\.?|对|對)\s+/giu;
  let match: RegExpExecArray | null;
  while ((match = splitter.exec(text)) !== null) {
    const left = normalizeVsOperand(text.slice(lastBoundary(text, match.index), match.index));
    const right = normalizeVsOperand(cutRight(text.slice(match.index + match[0].length)));
    if (left && right && left === right) {
      const phrase = `${left} vs ${right}`;
      if (!hits.includes(phrase)) hits.push(phrase);
    }
  }
  return hits;
}

const CURRENCY_SIGN_CLASSES = [
  /\$/,
  /€/,
  /£/,
  /¥/,
  /₹/,
  /\bUSD\b/i,
  /\bEUR\b/i,
  /\bGBP\b/i,
];

/** True when a description mentions more than one currency sign or code. */
export function hasMixedCurrencyCopy(text: string): boolean {
  const hits = CURRENCY_SIGN_CLASSES.filter((pattern) => pattern.test(text));
  return hits.length > 1;
}

const NEAR_TIE_SOONER =
  /pays out sooner[^.]*\b(?:on day 1 vs after 1 day|after 1 day vs on day 1)\b/i;

/** True when a 1-day first-payout gap is framed as "sooner". */
export function hasNearTieSoonerCopy(text: string): boolean {
  if (NEAR_TIE_SOONER.test(text)) return true;
  // "after N day(s) vs after N±1 day(s)" combined with "sooner"
  if (!/sooner/i.test(text)) return false;
  const match = text.match(
    /after (\d+) days? vs after (\d+) days?|after (\d+) days? vs on day 1|on day 1 vs after (\d+) days?/i,
  );
  if (!match) return false;
  const nums = match.slice(1).filter(Boolean).map(Number);
  if (nums.length === 1) return nums[0] <= 1;
  if (nums.length >= 2) return Math.abs(nums[0] - nums[1]) <= 1;
  return false;
}

export function formatCompareCryptoLabel(
  t: CompareCopyT,
  firm: PropFirm,
): string {
  const info = cryptoPayoutInfo(firm);
  if (!info.supported) return t("cryptoNone");
  const methods = formatCryptoPayoutMethods(info);
  return info.hasStablecoin ? t("cryptoStablecoinMethods", { methods }) : methods;
}
