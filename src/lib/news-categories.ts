import type { NewsArticle } from "@/lib/schema";

export const NEWS_CATEGORIES = [
  "all",
  "rule-changes",
  "payout-alerts",
  "firm-news",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const RULE_TAGS = new Set([
  "regulation",
  "compliance",
  "challenge-rules",
  "prop-firm-rules",
  "news-trading",
  "cysec",
  "warnings",
  "cfds",
]);

const PAYOUT_TAGS = new Set([
  "payouts",
  "usdt-payouts",
  "industry-milestones",
]);

const FIRM_TAGS = new Set([
  "prop-trading",
  "prop-firms",
  "prop-firm-discounts",
  "prop-firm-technology",
  "funded-accounts",
  "funded-trader-updates",
  "product-launch",
  "ftmo",
  "fundednext",
  "maven-trading",
  "propw",
  "crypto-prop-firm",
  "evaluation",
]);

function haystack(article: NewsArticle): string {
  return `${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase();
}

export function getNewsCategories(
  article: NewsArticle,
): Exclude<NewsCategory, "all">[] {
  const tags = article.tags.map((tag) => tag.toLowerCase());
  const text = haystack(article);
  const categories: Exclude<NewsCategory, "all">[] = [];

  if (
    tags.some((tag) => RULE_TAGS.has(tag)) ||
    /\b(rule|rules|regulation|regulatory|compliance|restriction|news trading)\b/i.test(
      text,
    )
  ) {
    categories.push("rule-changes");
  }

  if (
    tags.some((tag) => PAYOUT_TAGS.has(tag)) ||
    /\b(payout|payouts|withdrawal|profit split)\b/i.test(text)
  ) {
    categories.push("payout-alerts");
  }

  if (
    article.relatedFirmSlugs.length > 0 ||
    tags.some((tag) => FIRM_TAGS.has(tag)) ||
    /\b(ftmo|fundednext|prop firm|prop firms|challenge)\b/i.test(text)
  ) {
    categories.push("firm-news");
  }

  return categories;
}

export function articleMatchesCategory(
  categories: Exclude<NewsCategory, "all">[],
  category: NewsCategory,
): boolean {
  if (category === "all") return true;
  return categories.includes(category);
}
