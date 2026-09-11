import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AssetChips } from "@/components/AssetChips";
import { FirmLogo } from "@/components/FirmLogo";
import { PlatformChips } from "@/components/PlatformChips";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { TrustpilotBadge } from "@/components/TrustpilotBadge";
import { maxTraderSharePercent } from "@/lib/compare";
import {
  flagEmoji,
  formatCompactUsd,
  maxAllocation,
  shortCountry,
  yearsInOperation,
} from "@/lib/firm-directory";
import { getFirmOffer, getOutboundLink } from "@/lib/offers";
import { formatMoney, type PayoutBreakdown } from "@/lib/payout";
import type { PlatformStatus, PropFirm } from "@/lib/schema";

const STATUS_DOT: Record<PlatformStatus, string> = {
  active: "bg-emerald-400",
  warning: "bg-amber-400",
  suspended: "bg-red-400",
};

/** PFM-style conversion L→R: identity → context → money → promo tile → visit. */
const ROW_GRID =
  "grid w-full grid-cols-[minmax(168px,1.25fr)_56px_minmax(76px,0.7fr)_minmax(84px,0.75fr)_68px_minmax(120px,0.95fr)_112px_96px]";

export type FirmTableRow = {
  firm: PropFirm;
  breakdown: PayoutBreakdown | null;
  rank: number;
};

export function FirmTable({
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
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px] space-y-2.5">
        <div
          className={`${ROW_GRID} items-end gap-x-2.5 px-3 py-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase`}
        >
          <div>{tHome("tableFirmColumn")}</div>
          <div>{tHome("tableOriginColumn")}</div>
          <div>{tHome("tableAssetsColumn")}</div>
          <div>{tHome("tablePlatformsColumn")}</div>
          <div>{tHome("tableMaxAllocationColumn")}</div>
          <div className="text-emerald-400/80">
            {tHome("tableNetProfitColumn")}
          </div>
          <div>{tHome("tablePromoColumn")}</div>
          <div className="text-right">{tHome("tableActionsColumn")}</div>
        </div>

        <ul className="space-y-2.5">
          {rows.map(({ firm, breakdown, rank }) => {
            const offer = getFirmOffer(firm.slug);
            const outbound = getOutboundLink(firm.slug, firm.basic.website);
            const isSuspended = firm.status === "suspended";
            const payoutCurrency =
              breakdown?.currency ?? firm.calculator.currency;
            const splitPercent =
              breakdown?.tier.traderSharePercent ?? maxTraderSharePercent(firm);
            const hq = firm.basic.headquarters;
            const years = yearsInOperation(firm.basic.foundedAt);
            const yearsLabel =
              years >= 10 ? tHome("yearsPlus") : tHome("yearsShort", { years });
            const allocation = maxAllocation(firm);
            const barPct = Math.min(100, Math.round((allocation / cap) * 100));

            return (
              <li key={firm.slug}>
                <div
                  className={`group ${ROW_GRID} items-center gap-x-2.5 rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-3.5 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/[0.04] hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.55)]`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-6 shrink-0 text-center font-mono text-[12px] text-slate-500">
                      {rank <= 3 ? (
                        <span aria-hidden>
                          {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        rank
                      )}
                    </span>
                    <FirmLogo
                      name={firm.basic.name}
                      src={firm.basic.logo.src}
                      alt={firm.basic.logo.alt}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[firm.status]}`}
                          aria-hidden
                        />
                        <Link
                          href={`/firm/${firm.slug}`}
                          className="text-[15px] font-semibold leading-snug text-pretty text-slate-50 hover:text-indigo-200"
                        >
                          {firm.basic.name}
                        </Link>
                      </div>
                      <TrustpilotBadge firm={firm} className="mt-1" />
                      {firm.highlights.includes("exchange_depth") ||
                      firm.highlights.includes("always_on") ? (
                        <div className="mt-1 flex flex-wrap gap-1">
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
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0 text-[13px] leading-5 text-slate-300">
                    <div>
                      <span className="mr-1" aria-hidden>
                        {flagEmoji(hq.countryCode)}
                      </span>
                      {shortCountry(hq.countryCode)}
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      {yearsLabel}
                    </div>
                  </div>

                  <div className="min-w-0 self-center">
                    <AssetChips assets={firm.assets} limit={3} />
                  </div>

                  <div className="min-w-0 self-center">
                    <PlatformChips platforms={firm.platforms} limit={3} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[15px] font-semibold text-slate-100">
                      {formatCompactUsd(allocation)}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg bg-emerald-500/[0.07] px-2 py-1.5">
                    <p className="font-mono text-lg font-bold tracking-tight text-[#10B981]">
                      {breakdown
                        ? formatMoney(breakdown.netPayout, payoutCurrency)
                        : "—"}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-emerald-400/70">
                      {tHome("tableSplitHint", { percent: splitPercent })}
                    </p>
                  </div>

                  <div className="min-w-0">
                    {isSuspended ? (
                      <span className="text-slate-500">—</span>
                    ) : offer?.code ? (
                      <PromoCodeCopy
                        copyOnly
                        code={offer.code}
                        href={outbound.href}
                        discountLabel={offer.discountLabel}
                      />
                    ) : offer ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        {t("noPartnerPromo")}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center justify-end">
                    {isSuspended ? (
                      <Link
                        href={`/firm/${firm.slug}`}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 px-2 py-2 text-xs font-medium whitespace-nowrap text-red-200 transition-colors hover:border-red-400/40"
                      >
                        {t("readReview")}
                      </Link>
                    ) : (
                      <a
                        href={outbound.href}
                        target="_blank"
                        rel={outbound.rel}
                        className={
                          outbound.partner
                            ? "inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-2 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
                            : "inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:border-indigo-400/40 hover:text-white"
                        }
                      >
                        {t("visitOfficial")}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
