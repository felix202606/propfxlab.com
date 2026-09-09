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
import { getFirmOffer, getOutHref } from "@/lib/offers";
import { formatMoney, type PayoutBreakdown } from "@/lib/payout";
import type { PlatformStatus, PropFirm } from "@/lib/schema";

const STATUS_DOT: Record<PlatformStatus, string> = {
  active: "bg-emerald-400",
  warning: "bg-amber-400",
  suspended: "bg-red-400",
};

const ROW_GRID =
  "grid-cols-[minmax(200px,220px)_minmax(100px,0.65fr)_minmax(120px,0.85fr)_minmax(110px,0.8fr)_minmax(84px,0.55fr)_minmax(130px,0.85fr)_minmax(108px,0.7fr)_minmax(110px,0.55fr)]";

/** Sticky firm column: extends into row padding so scroll content never peeks underneath. */
const STICKY_FIRM =
  "sticky left-0 z-20 -ml-3 border-r border-slate-800/80 bg-[#0B0F19] pr-2 pl-3 shadow-[10px_0_14px_-10px_rgba(0,0,0,0.75)]";

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
    <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 [scrollbar-gutter:stable]">
      <div className="min-w-[1180px] space-y-1.5">
        <div
          className={`grid ${ROW_GRID} gap-2 px-3 py-1.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase`}
        >
          <div className={`${STICKY_FIRM} z-30 py-1.5`}>
            {tHome("tableFirmColumn")}
          </div>
          <div>{tHome("tableOriginColumn")}</div>
          <div>{tHome("tableAssetsColumn")}</div>
          <div>{tHome("tablePlatformsColumn")}</div>
          <div>{tHome("tableMaxAllocationColumn")}</div>
          <div>{tHome("tableNetProfitColumn")}</div>
          <div>{tHome("tablePromoColumn")}</div>
          <div className="text-right">{tHome("tableActionsColumn")}</div>
        </div>

        <ul className="space-y-1.5">
          {rows.map(({ firm, breakdown, rank }) => {
            const offer = getFirmOffer(firm.slug, firm.basic.website);
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
                  className={`group grid ${ROW_GRID} items-center gap-2 rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/[0.04] hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.55)]`}
                >
                  <div
                    className={`${STICKY_FIRM} -my-2 flex min-w-0 items-center gap-2.5 self-stretch rounded-l-[11px] py-2 transition-colors group-hover:bg-[#0d1224]`}
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-[11px] text-slate-500">
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
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[firm.status]}`}
                          aria-hidden
                        />
                        <Link
                          href={`/firm/${firm.slug}`}
                          className="truncate text-sm font-semibold text-slate-50 hover:text-indigo-200"
                        >
                          {firm.basic.name}
                        </Link>
                      </div>
                      <TrustpilotBadge firm={firm} className="mt-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 text-[12px] leading-5 text-slate-300">
                    <div className="truncate">
                      <span className="mr-1" aria-hidden>
                        {flagEmoji(hq.countryCode)}
                      </span>
                      {shortCountry(hq.countryCode)}
                    </div>
                    <div className="text-[11px] text-slate-500">{yearsLabel}</div>
                  </div>

                  <div className="min-w-0">
                    <AssetChips assets={firm.assets} limit={4} />
                  </div>

                  <div className="min-w-0">
                    <PlatformChips platforms={firm.platforms} limit={4} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-slate-100">
                      {formatCompactUsd(allocation)}
                    </p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[15px] font-bold tracking-tight text-[#10B981]">
                      {breakdown
                        ? formatMoney(breakdown.netPayout, payoutCurrency)
                        : "—"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-400/70">
                      {tHome("tableSplitHint", { percent: splitPercent })}
                    </p>
                  </div>

                  <div className="min-w-0">
                    {isSuspended ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      <PromoCodeCopy
                        copyOnly
                        code={offer.code}
                        href={getOutHref(firm.slug)}
                        discountLabel={offer.discountLabel}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    {isSuspended ? (
                      <Link
                        href={`/firm/${firm.slug}`}
                        className="inline-flex items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap text-red-200 transition-colors hover:border-red-400/40"
                      >
                        {t("readReview")}
                      </Link>
                    ) : (
                      <a
                        href={getOutHref(firm.slug)}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
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
