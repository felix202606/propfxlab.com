export type FirmOffer = {
  /**
   * Copyable checkout code. Omit when the partner only issued a tracking URL.
   */
  code?: string;
  /**
   * Destination after /out/[slug]. Tracking / affiliate URLs live here only.
   * Never put this value in indexable HTML — always render getOutHref(slug).
   */
  href: string;
  /**
   * Optional compact badge when we know the real partner deal, e.g. "15% OFF".
   * Do not invent a site-wide percent — rates differ by firm.
   */
  discountLabel?: string;
};

export type OutboundLink = {
  href: string;
  rel: string;
  partner: boolean;
};

export const DEFAULT_PROMO_CODE = "PROPFXLAB";

export const OUT_LINK_REL = "nofollow sponsored noopener noreferrer";

/** Unpaid editorial citation to the official site — not an affiliate hop. */
export const EDITORIAL_LINK_REL = "noopener noreferrer";

/** Affiliate hop so outbound clicks stay on /out/[slug] (nofollow sponsored). */
export function getOutHref(slug: string): string {
  return `/out/${slug}`;
}

/**
 * Approved partner hops only. Pending / rejected firms stay editorial:
 * review pages remain indexed, with no promo tile and a plain official-site link.
 * `basic.website` in firm JSON stays the clean official URL.
 */
export const FIRM_OFFERS: Record<string, FirmOffer> = {
  ftmo: {
    code: "MkwICempeEtrxUrXdXNo",
    href: "https://join.ftmo.com/MkwICempeEtrxUrXdXNo",
  },
  fundednext: {
    code: DEFAULT_PROMO_CODE,
    href: "https://fundednext.com/?fpr=PROPFXLAB",
  },
  "funding-traders": {
    code: "propfxlab",
    href: "https://fundingtraders.com/?ref=zej14146575&promo=propfxlab",
  },
  the5ers: {
    code: "IKMF4",
    href: "https://www.the5ers.com/?afmc=1fkd",
  },
  "e8-markets": {
    code: "propfxlab",
    href: "https://e8markets.com/d/propfxlab",
  },
  fintokei: { href: "https://www.fintokei.com/?affiliate=2379" },
  "instant-funding": {
    code: DEFAULT_PROMO_CODE,
    href: "https://instantfunding.com/?partner=8771",
  },
  fxify: {
    code: DEFAULT_PROMO_CODE,
    href: "https://trader.fxify.com/purchasechallenge?affiliateId=8621",
  },
  thinkcapital: {
    code: DEFAULT_PROMO_CODE,
    href: "https://checkout.thinkcapital.com/checkout?refcode=PROPFXLAB",
  },
  hyrotrader: {
    code: "propfxlab",
    href: "https://www.hyrotrader.com/?coupon=propfxlab",
  },
  "for-traders": {
    code: "Q2AHMI7NSQ",
    href: "https://app.fortraders.com/trading/new-challenge?affiliateCode=Q2AHMI7NSQ",
  },
  "city-traders-imperium": {
    href: "https://app.citytradersimperium.com/user-auth/register?referral_code=1cea04&utm_source=client&utm_medium=referral&utm_id=1cea04",
  },
  "blue-guardian": {
    code: "propfxlab",
    href: "https://blueguardian.com/?afmc=propfxlab",
  },
  "top-one-trader": {
    code: "propfxlab",
    href: "https://toponetrader.com/?linkId=lp_148658&sourceId=propfxlab&tenantId=toponetrader&affS1=propfxlab",
  },
  "maven-trading": {
    code: "propfxlab",
    href: "https://maventrading.com/?ref=propfxlab",
  },
};

export function getFirmOffer(slug: string): FirmOffer | undefined {
  return FIRM_OFFERS[slug];
}

export function isPartnerFirm(slug: string): boolean {
  return Object.hasOwn(FIRM_OFFERS, slug);
}

export function getOutboundLink(
  slug: string,
  officialWebsite: string,
): OutboundLink {
  if (isPartnerFirm(slug)) {
    return { href: getOutHref(slug), rel: OUT_LINK_REL, partner: true };
  }
  return { href: officialWebsite, rel: EDITORIAL_LINK_REL, partner: false };
}

export const HERO_ACCOUNT_SIZES = [10_000, 25_000, 50_000, 100_000, 200_000] as const;

export const POPULAR_COMPARISONS = [
  ["ftmo", "fundednext"],
  ["e8-markets", "the5ers"],
  ["funding-traders", "instant-funding"],
  ["fxify", "thinkcapital"],
  ["blue-guardian", "for-traders"],
  ["fintokei", "hyrotrader"],
  ["city-traders-imperium", "maven-trading"],
  ["top-one-trader", "ftmo"],
  ["fundednext", "e8-markets"],
] as const;
