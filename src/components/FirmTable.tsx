import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FirmLogo } from "@/components/FirmLogo";
import { TrustpilotBadge } from "@/components/TrustpilotBadge";
import { getFirmOffer } from "@/lib/offers";
import { formatMoney, type PayoutBreakdown } from "@/lib/payout";
import type { PlatformStatus, PropFirm } from "@/lib/schema";

const STATUS_DOT: Record<PlatformStatus, string> = {
  active: "bg-emerald-400",
  warning: "bg-amber-400",
  suspended: "bg-red-400",
};

export type FirmTableRow = {
  firm: PropFirm;
  breakdown: PayoutBreakdown | null;
};

export function FirmTable({ rows }: { rows: FirmTableRow[] }) {
  const t = useTranslations("FirmCard");
  const tHome = useTranslations("HomePage");

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-medium">{tHome("tableFirmColumn")}</th>
            <th className="px-4 py-3 font-medium">{t("netPayoutLabel")}</th>
            <th className="px-4 py-3 font-medium">{t("splitLabel")}</th>
            <th className="px-4 py-3 font-medium">{t("payoutSpeedLabel")}</th>
            <th className="px-4 py-3 font-medium">{t("promoLabel")}</th>
            <th className="px-4 py-3 font-medium" aria-hidden />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(({ firm, breakdown }) => {
            const offer = getFirmOffer(firm.slug, firm.basic.website);
            const isSuspended = firm.status === "suspended";
            const payoutCurrency = breakdown?.currency ?? firm.calculator.currency;
            const splitPercent =
              breakdown?.tier.traderSharePercent ??
              firm.withdrawal.defaultTraderSharePercent;

            return (
              <tr key={firm.slug} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
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
                        <span className="truncate font-medium text-zinc-100">
                          {firm.basic.name}
                        </span>
                      </div>
                      <TrustpilotBadge firm={firm} className="mt-1" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap text-emerald-300">
                  {breakdown ? formatMoney(breakdown.netPayout, payoutCurrency) : "—"}
                </td>
                <td className="px-4 py-3 font-mono whitespace-nowrap text-zinc-300">
                  {splitPercent}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-amber-300">
                  {firm.payoutSpeed}
                </td>
                <td className="px-4 py-3">
                  {isSuspended ? (
                    <span className="text-zinc-500">—</span>
                  ) : (
                    <code className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-xs text-emerald-300">
                      {offer.code}
                    </code>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isSuspended ? (
                    <Link
                      href={`/firm/${firm.slug}`}
                      className="inline-flex items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-red-200 transition-colors hover:border-red-400/40"
                    >
                      {t("readReview")}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={offer.href}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-zinc-950 shadow-[0_0_16px_-4px_rgba(52,211,153,0.9)] transition-all hover:brightness-110"
                      >
                        {t("claimCta")}
                      </a>
                      <Link
                        href={`/firm/${firm.slug}`}
                        className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
                      >
                        {t("readReview")}
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
