"use client";

import { isWithinWindow, type OfferPromotion } from "@/lib/outbound";
import { useNow } from "@/lib/use-now";

/** Promotion code/badge while its window is open, else the regular ones. */
export function useActiveOffer(
  code: string,
  discountLabel: string | undefined,
  promotion: OfferPromotion | undefined,
): { code: string; discountLabel: string | undefined } {
  const now = useNow();
  if (now === null || !promotion || !isWithinWindow(promotion, now)) {
    return { code, discountLabel };
  }
  return {
    code: promotion.code ?? code,
    discountLabel: promotion.label ?? discountLabel,
  };
}
