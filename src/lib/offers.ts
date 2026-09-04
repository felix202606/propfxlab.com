export type FirmOffer = {
  code: string;
  href: string;
};

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
  myfundedfx: { code: "PROPFXLAB", href: "https://myfundedfx.com" },
};

export function getFirmOffer(slug: string, fallbackHref: string): FirmOffer {
  return FIRM_OFFERS[slug] ?? { code: "PROPFXLAB", href: fallbackHref };
}

export const HERO_ACCOUNT_SIZES = [10_000, 25_000, 50_000, 100_000, 200_000] as const;

export const POPULAR_COMPARISONS = [
  ["ftmo", "fundednext"],
  ["ftmo", "fundingpips"],
  ["fundednext", "goatfunded"],
  ["alpha-capital", "ftmo"],
  ["apex-trader-funding", "myfundedfx"],
  ["funding-traders", "fundingpips"],
] as const;
