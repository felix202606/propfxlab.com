import "server-only";

import { cache } from "react";
import { getAllFirms } from "@/lib/data";
import { FIRM_OFFERS } from "@/lib/offers";
import type { ListedFirm, OfferPromotion, PublicOffer } from "@/lib/outbound";
import { POPULAR_COMPARISONS } from "@/lib/popular-comparisons";
import { firmFromCms, type CmsOffer } from "@/lib/sanity-mapping";
import { sanityQuery } from "@/lib/sanity-fetch";
import type { PropFirm } from "@/lib/schema";

/**
 * Cache tags. A firm edit revalidates its own tag plus FIRMS_TAG (homepage,
 * calculator, /compare); FIRM_ROSTER_TAG is used by every page (footer,
 * related links, sitemap) and is only revalidated when a firm is added,
 * removed, renamed or gets a new logo.
 */
export const FIRMS_TAG = "firms";
export const FIRM_ROSTER_TAG = "firms:roster";
export const PLACEMENTS_TAG = "placements";

export function firmTag(slug: string): string {
  return `firm:${slug}`;
}

export type RosterFirm = Pick<PropFirm, "slug"> & {
  name: string;
  logo: PropFirm["basic"]["logo"];
};

export type SponsoredSlot = { slug: string; startsAt?: string; endsAt?: string };

export type HomepagePlacements = {
  top3: SponsoredSlot[];
  banner: SponsoredSlot | null;
  popularComparisons: readonly (readonly [string, string])[];
};

/** `href` stays out of every projection except the /out query. */
const OFFER_PROJECTION = `"offer": offer{partner, code, discountLabel, promotion}`;
const LIST_QUERY = `*[_type == "firm" && defined(slug)]{..., ${OFFER_PROJECTION}}`;
const FIRM_QUERY = `*[_type == "firm" && slug == $slug][0]{..., ${OFFER_PROJECTION}}`;
const ROSTER_QUERY = `*[_type == "firm" && defined(slug)]{slug, "name": basic.name, "logo": basic.logo{src, alt, width, height}}`;
const OUT_QUERY = `*[_type == "firm" && slug == $slug][0]{"partner": offer.partner, "href": offer.href, "website": basic.website}`;
const PLACEMENTS_QUERY = `*[_id == "homepagePlacements"][0]{
  "top3": top3[]{"slug": firm->slug, startsAt, endsAt},
  "banner": banner{enabled, "slug": firm->slug, startsAt, endsAt},
  "popularComparisons": popularComparisons[]{"left": left->slug, "right": right->slug}
}`;

function byName(a: { basic: { name: string } }, b: { basic: { name: string } }): number {
  return a.basic.name.localeCompare(b.basic.name, "en");
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""),
  ) as T;
}

function toPublicOffer(offer: CmsOffer): PublicOffer | undefined {
  if (!offer.partner) return undefined;
  const promotion = offer.promotion ? compact<OfferPromotion>({ ...offer.promotion }) : undefined;
  return compact<PublicOffer>({
    code: offer.code,
    discountLabel: offer.discountLabel,
    promotion: promotion && (promotion.code || promotion.label) ? promotion : undefined,
  });
}

function localListedFirm(firm: PropFirm): ListedFirm {
  const offer = FIRM_OFFERS[firm.slug];
  if (!offer) return firm;
  return { ...firm, offer: compact<PublicOffer>({ code: offer.code, discountLabel: offer.discountLabel }) };
}

const skippedDocs = new Set<string>();

function cmsListedFirm(doc: unknown): ListedFirm | null {
  try {
    const { firm, offer, sortOrder } = firmFromCms(doc);
    const listed: ListedFirm = { ...firm };
    const publicOffer = toPublicOffer(offer);
    if (publicOffer) listed.offer = publicOffer;
    if (sortOrder !== null) listed.sortOrder = sortOrder;
    return listed;
  } catch {
    const slug = String((doc as { slug?: unknown } | null)?.slug);
    // Firm pages all read their doc; one line per slug per worker keeps build logs small.
    if (!skippedDocs.has(slug)) {
      skippedDocs.add(slug);
      console.warn("[firms] skip invalid CMS firm", slug);
    }
    return null;
  }
}

/**
 * CMS first. Firms only in data/firms stay listed, so deleting a CMS
 * document never drops an indexed URL; use `status` to retire a firm.
 */
export const getListedFirms = cache(async (): Promise<ListedFirm[]> => {
  const bySlug = new Map<string, ListedFirm>();
  for (const firm of getAllFirms()) bySlug.set(firm.slug, localListedFirm(firm));
  const docs = await sanityQuery<unknown[]>(LIST_QUERY, {}, [FIRMS_TAG]);
  for (const doc of docs ?? []) {
    const listed = cmsListedFirm(doc);
    if (listed) bySlug.set(listed.slug, listed);
  }
  return [...bySlug.values()].sort(byName);
});

export const getListedFirm = cache(async (slug: string): Promise<ListedFirm | undefined> => {
  const doc = await sanityQuery<unknown>(FIRM_QUERY, { slug }, [firmTag(slug)]);
  const listed = doc ? cmsListedFirm(doc) : null;
  if (listed) return listed;
  const local = getAllFirms().find((firm) => firm.slug === slug);
  return local ? localListedFirm(local) : undefined;
});

export const getFirmRoster = cache(async (): Promise<RosterFirm[]> => {
  const bySlug = new Map<string, RosterFirm>();
  for (const firm of getAllFirms()) {
    bySlug.set(firm.slug, { slug: firm.slug, name: firm.basic.name, logo: firm.basic.logo });
  }
  const rows = await sanityQuery<RosterFirm[]>(ROSTER_QUERY, {}, [FIRM_ROSTER_TAG]);
  for (const row of rows ?? []) {
    if (row?.slug && row.name && row.logo?.src && row.logo.alt) {
      bySlug.set(row.slug, { slug: row.slug, name: row.name, logo: compact(row.logo) });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
});

/** Redirect target for /out/[slug]: the partner tracking URL, else the official site. */
export async function getOutboundTarget(slug: string): Promise<string | undefined> {
  const row = await sanityQuery<{ partner?: boolean; href?: string; website?: string }>(
    OUT_QUERY,
    { slug },
    [firmTag(slug)],
  );
  if (row?.website) return row.partner && row.href ? row.href : row.website;
  const local = getAllFirms().find((firm) => firm.slug === slug);
  if (!local) return undefined;
  return FIRM_OFFERS[slug]?.href ?? local.basic.website;
}

type PlacementsRow = {
  top3?: ({ slug?: string; startsAt?: string; endsAt?: string } | null)[] | null;
  banner?: { enabled?: boolean; slug?: string; startsAt?: string; endsAt?: string } | null;
  popularComparisons?: ({ left?: string; right?: string } | null)[] | null;
};

function toSlot(row: { slug?: string; startsAt?: string; endsAt?: string } | null | undefined) {
  if (!row?.slug) return null;
  return compact<SponsoredSlot>({ slug: row.slug, startsAt: row.startsAt, endsAt: row.endsAt });
}

export const getHomepagePlacements = cache(async (): Promise<HomepagePlacements> => {
  const row = await sanityQuery<PlacementsRow>(PLACEMENTS_QUERY, {}, [PLACEMENTS_TAG]);
  if (!row) return { top3: [], banner: null, popularComparisons: POPULAR_COMPARISONS };
  const pairs = (row.popularComparisons ?? []).flatMap((pair) =>
    pair?.left && pair.right ? [[pair.left, pair.right] as const] : [],
  );
  return {
    top3: (row.top3 ?? []).flatMap((slot) => toSlot(slot) ?? []).slice(0, 3),
    banner: row.banner?.enabled ? toSlot(row.banner) : null,
    popularComparisons: pairs.length > 0 ? pairs : POPULAR_COMPARISONS,
  };
});
