import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AssetChips } from "@/components/AssetChips";
import { FirmLogo } from "@/components/FirmLogo";
import { PlatformChips } from "@/components/PlatformChips";
import { AffiliateLink } from "@/components/AffiliateLink";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { TrustpilotBadge } from "@/components/TrustpilotBadge";
import type { FirmTableRow } from "@/components/FirmTable";
import { maxTraderSharePercent } from "@/lib/compare";
import {
  flagEmoji,
  formatCompactUsd,
  maxAllocation,
  shortCountry,
  yearsInOperation,
} from "@/lib/firm-directory";
import { getOutboundLink } from "@/lib/outbound";
import { formatMoney } from "@/lib/payout";
import type { PlatformStatus } from "@/lib/schema";

const STATUS_DOT: Record<PlatformStatus, string> = {
  active: "bg-emerald-400",
  warning: "bg-amber-400",
  suspended: "bg-red-400",
};

/**
 * Mobile (<md) rendering of the live ranking. Receives the exact same rows as
 * `FirmTable`; all tab/search/filter/sort/Show more state lives in
 * `HomeMarketplace`, so both views always show the same firms in the same order.
 */
export function FirmCardList({
  rows,
  maxAllocationCap,
}: {
  rows: FirmTableRow[];
  maxAllocationCap: number;
}) {
  const t = useTranslations("FirmCard");
  const tHome = useTranslations("HomePage");
  const cap = Math.max(maxAllocationCap, 1);

  return (
    <ul className="w-full min-w-0 space-y-3">
      {rows.map(({ firm, breakdown, rank }) => {
        const offer = firm.offer;
        const outbound = getOutboundLink(firm);
        const isSuspended = firm.status === "suspended";
        const payoutCurrency = breakdown?.currency ?? firm.calculator.currency;
        const splitPercent =
          breakdown?.tier.traderSharePercent ?? maxTraderSharePercent(firm);
        const hq = firm.basic.headquarters;
        const years = yearsInOperation(firm.basic.foundedAt);
        const yearsLabel =
          years >= 10 ? tHome("yearsPlus") : tHome("yearsShort", { years });
        const allocation = maxAllocation(firm);
        const barPct = Math.min(100, Math.round((allocation / cap) * 100));
        const hasPromo = !isSuspended && Boolean(offer?.code);

        return (
          <li
            key={firm.slug}
            className="min-w-0 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4"
          >
            {/* Top: rank + logo + name (wraps, never truncated) + rating */}
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-2 w-6 shrink-0 text-center font-mono text-[13px] text-slate-500">
                {rank <= 3 ? (
                  <span aria-hidden>
                    {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉"}
                  </span>
                ) : (
                  rank
                )}
                {rank <= 3 ? <span className="sr-only">{rank}</span> : null}
              </span>
              <FirmLogo
                name={firm.basic.name}
                src={firm.basic.logo.src}
                alt={firm.basic.logo.alt}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start gap-1.5">
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[firm.status]}`}
                    aria-hidden
                  />
                  <Link
                    href={`/firm/${firm.slug}`}
                    className="min-w-0 text-base font-semibold leading-snug break-words text-pretty text-slate-50 hover:text-indigo-200"
                  >
                    {firm.basic.name}
                  </Link>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <TrustpilotBadge firm={firm} />
                  {firm.highlights.includes("exchange_depth") ? (
                    <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-1.5 py-px text-[10px] font-medium text-violet-200">
                      {tHome("filterExchangeDepth")}
                    </span>
                  ) : null}
                  {firm.highlights.includes("always_on") ? (
                    <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-1.5 py-px text-[10px] font-medium text-fuchsia-200">
                      {tHome("filterAlwaysOn")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Middle: compact chip rows */}
            <dl className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex min-w-0 items-center gap-2">
                <dt className="sr-only">{tHome("tableOriginColumn")}</dt>
                <dd className="inline-flex min-w-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  <span aria-hidden>{flagEmoji(hq.countryCode)}</span>
                  <span>{shortCountry(hq.countryCode)}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{yearsLabel}</span>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="sr-only">{tHome("tableAssetsColumn")}</dt>
                <dd className="min-w-0">
                  <AssetChips assets={firm.assets} limit={3} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="sr-only">{tHome("tablePlatformsColumn")}</dt>
                <dd className="min-w-0">
                  <PlatformChips platforms={firm.platforms} limit={3} />
                </dd>
              </div>
            </dl>

            {/* Bottom: take-home profit + promo + Visit */}
            <div className="mt-3 flex min-w-0 items-end justify-between gap-3 rounded-xl bg-emerald-500/[0.07] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-emerald-400/80 uppercase">
                  {tHome("tableNetProfitColumn")}
                </p>
                <p className="font-mono text-2xl font-bold tracking-tight text-[#10B981]">
                  {breakdown
                    ? formatMoney(breakdown.netPayout, payoutCurrency)
                    : "—"}
                </p>
                <p className="text-[11px] font-medium text-emerald-400/70">
                  {tHome("tableSplitHint", { percent: splitPercent })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                  {tHome("tableMaxAllocationColumn")}
                </p>
                <p className="font-mono text-[13px] font-semibold text-slate-200">
                  {formatCompactUsd(allocation)}
                </p>
                <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div
              className={`mt-3 grid min-w-0 items-stretch gap-2 ${
                hasPromo ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-1"
              }`}
            >
              {hasPromo && offer?.code ? (
                <div className="relative z-[1] min-w-0">
                  <PromoCodeCopy
                    copyOnly
                    code={offer.code}
                    href={outbound.href}
                    discountLabel={offer.discountLabel}
                    promotion={offer.promotion}
                  />
                </div>
              ) : null}
              {isSuspended ? (
                <Link
                  href={`/firm/${firm.slug}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40"
                >
                  {t("readReview")}
                </Link>
              ) : outbound.partner ? (
                <AffiliateLink
                  slug={firm.slug}
                  source="rankings"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
                >
                  {t("visitOfficial")}
                </AffiliateLink>
              ) : (
                <a
                  href={outbound.href}
                  target="_blank"
                  rel={outbound.rel}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400/40 hover:text-white"
                >
                  {t("visitOfficial")}
                </a>
              )}
            </div>
            {!isSuspended && !offer ? (
              <p className="mt-2 text-[11px] text-slate-500">
                {t("noPartnerPromo")}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
