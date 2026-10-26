import type { PropFirm } from "@/lib/schema";

/**
 * What pages may know about a partner deal. The tracking URL is deliberately
 * absent: it only exists server-side, behind the /out/[slug] redirect.
 */
export type PublicOffer = {
  /** Copyable checkout code. Omitted when the partner only issued a tracking URL. */
  code?: string;
  /** Compact badge for the real partner deal, e.g. "15% OFF". */
  discountLabel?: string;
  /** Replaces code/badge inside the window; decided in the browser so cached HTML never goes stale. */
  promotion?: OfferPromotion;
};

export type OfferPromotion = {
  label?: string;
  code?: string;
  startsAt?: string;
  endsAt?: string;
};

/** A firm as rendered: `offer` present means approved partner. */
export type ListedFirm = PropFirm & {
  offer?: PublicOffer;
  /** Manual homepage directory position; lower first. */
  sortOrder?: number;
};

export type OutboundLink = {
  href: string;
  rel: string;
  partner: boolean;
};

export const OUT_LINK_REL = "sponsored noopener noreferrer";

/** Unpaid editorial citation to the official site — not an affiliate hop. */
export const EDITORIAL_LINK_REL = "noopener noreferrer";

/** Affiliate hop so outbound clicks stay on /out/[slug] (nofollow sponsored). */
export function getOutHref(slug: string): string {
  return `/out/${slug}`;
}

export function isPartnerFirm(firm: ListedFirm): boolean {
  return firm.offer !== undefined;
}

export function getOutboundLink(firm: ListedFirm): OutboundLink {
  if (isPartnerFirm(firm)) {
    return { href: getOutHref(firm.slug), rel: OUT_LINK_REL, partner: true };
  }
  return { href: firm.basic.website, rel: EDITORIAL_LINK_REL, partner: false };
}

export function isWithinWindow(
  window: { startsAt?: string; endsAt?: string },
  now: number,
): boolean {
  const starts = window.startsAt ? Date.parse(window.startsAt) : Number.NEGATIVE_INFINITY;
  const ends = window.endsAt ? Date.parse(window.endsAt) : Number.POSITIVE_INFINITY;
  return now >= starts && now < ends;
}

/** True when the slot has a schedule, so the server must not decide visibility. */
export function hasWindow(window: { startsAt?: string; endsAt?: string }): boolean {
  return Boolean(window.startsAt || window.endsAt);
}
