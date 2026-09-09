"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { PropFirm } from "@/lib/schema";

type TrustpilotBadgeProps = {
  firm: Pick<PropFirm, "rating" | "reviewCount">;
  className?: string;
};

export function TrustpilotBadge({
  firm,
  className = "",
}: TrustpilotBadgeProps) {
  const t = useTranslations("FirmCard");
  const format = useFormatter();

  if (firm.rating == null) return null;

  const rating = firm.rating.toFixed(1);
  const count = format.number(firm.reviewCount);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-yellow-300 ${className}`}
      title={t("ratingBadge", { rating, count })}
    >
      <span aria-hidden className="text-[11px] leading-none">
        ★
      </span>
      <span className="font-mono tabular-nums">{rating}</span>
      <span className="font-normal text-yellow-200/70">
        ({count})
      </span>
    </span>
  );
}
