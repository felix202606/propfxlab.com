"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { PropFirm } from "@/lib/schema";

type TrustpilotBadgeProps = {
  firm: Pick<PropFirm, "rating" | "reviewCount">;
  className?: string;
};

export function TrustpilotBadge({ firm, className = "" }: TrustpilotBadgeProps) {
  const t = useTranslations("FirmCard");
  const format = useFormatter();

  if (firm.rating == null) return null;

  const rating = firm.rating.toFixed(1);
  const count = format.number(firm.reviewCount);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-px text-[10px] font-medium tracking-wide text-yellow-300 ${className}`}
      title={t("ratingBadge", { rating, count })}
    >
      <span className="truncate">{t("ratingBadge", { rating, count })}</span>
    </span>
  );
}
