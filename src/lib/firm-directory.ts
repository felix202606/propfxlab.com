import { PLATFORM_LABELS } from "@/lib/platforms";
import type { FirmHighlight, PropFirm, TradingPlatform } from "@/lib/schema";

export const NET_PROFIT_ACCOUNT = 100_000;

export const SHORT_COUNTRY: Record<string, string> = {
  AE: "UAE",
  US: "US",
  GB: "UK",
  CZ: "CZ",
  NL: "NL",
  HK: "HK",
  IL: "IL",
  LI: "LI",
  MT: "MT",
  CA: "CA",
};

export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );
}

export function shortCountry(countryCode: string): string {
  return SHORT_COUNTRY[countryCode] ?? countryCode;
}

export function yearsInOperation(
  foundedAt: string,
  now = new Date(),
): number {
  const founded = new Date(`${foundedAt}T00:00:00Z`);
  if (Number.isNaN(founded.getTime())) return 0;
  let years = now.getUTCFullYear() - founded.getUTCFullYear();
  const anniversary = Date.UTC(
    now.getUTCFullYear(),
    founded.getUTCMonth(),
    founded.getUTCDate(),
  );
  if (now.getTime() < anniversary) years -= 1;
  return Math.max(0, years);
}

export function maxAllocation(firm: PropFirm): number {
  return firm.basic.funding.maxScaledSize ?? firm.basic.funding.maxAccountSize;
}

export function formatCompactUsd(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const label = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(/\.0$/, "");
    return `$${label}M`;
  }
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const label = Number.isInteger(thousands)
      ? String(thousands)
      : thousands.toFixed(1).replace(/\.0$/, "");
    return `$${label}K`;
  }
  return `$${amount}`;
}

export function firmMatchesQuery(firm: PropFirm, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (firm.basic.name.toLowerCase().includes(q)) return true;
  if (firm.slug.replace(/-/g, " ").includes(q) || firm.slug.includes(q)) {
    return true;
  }
  return firm.platforms.some((platform) => platformMatchesQuery(platform, q));
}

function platformMatchesQuery(platform: TradingPlatform, q: string): boolean {
  const label = PLATFORM_LABELS[platform].toLowerCase();
  if (label.includes(q) || q.includes(label)) return true;
  const compact = label.replace(/\s+/g, "");
  return compact.includes(q.replace(/\s+/g, "")) || q.includes(compact);
}

export function firmHasHighlights(
  firm: PropFirm,
  selected: FirmHighlight[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((tag) => firm.highlights.includes(tag));
}
