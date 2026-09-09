export type FirmOffer = {
  code: string;
  href: string;
  /** Compact table badge, e.g. "10% OFF" */
  discountLabel?: string;
};

export const DEFAULT_PROMO_CODE = "PROPFXLAB";
export const DEFAULT_DISCOUNT_LABEL = "10% OFF";

/** Affiliate hop so outbound clicks stay on /out/[slug] (nofollow sponsored). */
export function getOutHref(slug: string): string {
  return `/out/${slug}`;
}

/** Site-wide referral codes used on ranking cards. Claim URLs stay on the official domain. */
export const FIRM_OFFERS: Record<string, FirmOffer> = {
  ftmo: { code: "PROPFXLAB", href: "https://ftmo.com" },
  fundednext: { code: "PROPFXLAB", href: "https://fundednext.com" },
  fundingpips: { code: "PROPFXLAB", href: "https://fundingpips.com" },
  goatfunded: { code: "PROPFXLAB", href: "https://www.goatfundedtrader.com" },
  "alpha-capital": { code: "PROPFXLAB", href: "https://alphacapitalgroup.uk" },
  "apex-trader-funding": {
    code: "PROPFXLAB",
    href: "https://apextraderfunding.com",
  },
  "funding-traders": { code: "PROPFXLAB", href: "https://fundingtraders.com" },
  topstep: { code: "PROPFXLAB", href: "https://www.topstep.com" },
  "my-funded-futures": {
    code: "PROPFXLAB",
    href: "https://myfundedfutures.com",
  },
  thinkcapital: { code: "PROPFXLAB", href: "https://www.thinkcapital.com" },
  tradeday: { code: "PROPFXLAB", href: "https://www.tradeday.com" },
};

export function getFirmOffer(slug: string, fallbackHref: string): FirmOffer {
  const offer = FIRM_OFFERS[slug] ?? {
    code: DEFAULT_PROMO_CODE,
    href: fallbackHref,
  };
  return {
    ...offer,
    discountLabel: offer.discountLabel ?? DEFAULT_DISCOUNT_LABEL,
  };
}

export const HERO_ACCOUNT_SIZES = [10_000, 25_000, 50_000, 100_000, 200_000] as const;

export const POPULAR_COMPARISONS = [
  ["ftmo", "fundednext"],
  ["apex-trader-funding", "topstep"],
  ["my-funded-futures", "topstep"],
  ["apex-trader-funding", "tradeday"],
  ["ftmo", "thinkcapital"],
  ["alpha-capital", "ftmo"],
  ["ftmo", "fundingpips"],
  ["fundednext", "goatfunded"],
  ["funding-traders", "fundingpips"],
] as const;
