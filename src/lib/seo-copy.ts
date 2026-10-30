import type { Metadata } from "next";
import { localeMeta } from "@/i18n/routing";
import featuredCompares from "../../data/featured-compares.json";
import { maxTraderSharePercent, parseCompareSlug } from "@/lib/compare";
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
