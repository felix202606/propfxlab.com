import {
  parseNewsArticle,
  parsePropFirm,
  type NewsArticle,
  type PropFirm,
} from "@/lib/schema";

/** Partner fields in the CMS. `href` only ever reaches the /out redirect. */
export type CmsOffer = {
  partner?: boolean;
  href?: string;
  code?: string;
  discountLabel?: string;
  promotion?: {
    label?: string;
    code?: string;
    startsAt?: string;
    endsAt?: string;
  };
};

type Raw = Record<string, unknown>;

function stripSystemFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSystemFields);
  if (value && typeof value === "object") {
    const out: Raw = {};
    for (const [key, item] of Object.entries(value)) {
      if (key.startsWith("_")) continue;
      out[key] = stripSystemFields(item);
    }
    return out;
  }
  return value;
}

/** Sanity drops nulls; the site schema uses null for "no limit". */
function nullIfMissing(target: Raw | undefined, key: string): void {
  if (target && !(key in target)) target[key] = null;
}

export function firmFromCms(doc: unknown): {
  firm: PropFirm;
  offer: CmsOffer;
  sortOrder: number | null;
} {
  const raw = stripSystemFields(doc) as Raw;
  const { offer, sortOrder, ...rest } = raw as Raw & {
    offer?: CmsOffer;
    sortOrder?: number;
  };

  nullIfMissing(rest, "rating");
  const withdrawal = rest.withdrawal as Raw | undefined;
  nullIfMissing(withdrawal?.payoutCycle as Raw | undefined, "subsequentIntervalDays");
  for (const channel of (withdrawal?.channels as Raw[] | undefined) ?? []) {
    nullIfMissing(channel, "maxAmount");
  }
  const calculator = rest.calculator as Raw | undefined;
  for (const tier of (calculator?.profitSplitTiers as Raw[] | undefined) ?? []) {
    nullIfMissing(tier, "maxProfit");
  }

  return {
    firm: parsePropFirm(rest),
    offer: offer ?? {},
    sortOrder: typeof sortOrder === "number" ? sortOrder : null,
  };
}

export function newsFromCms(doc: unknown): NewsArticle {
  return parseNewsArticle(stripSystemFields(doc));
}
