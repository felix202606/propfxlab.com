"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { calculatePayout, formatMoney, type PayoutWarning } from "@/lib/payout";
import type { PropFirm } from "@/lib/schema";

type PayoutCalculatorProps = {
  firms: PropFirm[];
  defaultSlug?: string;
  /** 详情页锁定当前公司，不显示公司下拉 */
  lockFirm?: boolean;
};

export function PayoutCalculator({
  firms,
  defaultSlug,
  lockFirm = false,
}: PayoutCalculatorProps) {
  const t = useTranslations("PayoutCalculator");

  const initialFirm =
    firms.find((firm) => firm.slug === defaultSlug) ?? firms[0];

  const [slug, setSlug] = useState(initialFirm?.slug ?? "");
  const firm = firms.find((item) => item.slug === slug) ?? initialFirm;

  const [challengeAmount, setChallengeAmount] = useState(
    String(firm?.basic.funding.maxAccountSize ?? 100000),
  );
  const [profit, setProfit] = useState("8000");
  const [tierId, setTierId] = useState(
    firm?.calculator.profitSplitTiers[0]?.id ?? "",
  );

  const selectedFirm = firm;

  const breakdown = useMemo(() => {
    if (!selectedFirm) return null;
    const challenge = Number(challengeAmount);
    const expectedProfit = Number(profit);
    if (!Number.isFinite(challenge) || !Number.isFinite(expectedProfit)) {
      return { code: "invalid-number" } as const;
    }
    return calculatePayout({
      firm: selectedFirm,
      challengeAmount: challenge,
      profit: expectedProfit,
      tierId,
    });
  }, [selectedFirm, challengeAmount, profit, tierId]);

  if (!selectedFirm) {
    return <p className="text-zinc-500">{t("noFirms")}</p>;
  }

  const currency = selectedFirm.calculator.currency;

  function onFirmChange(nextSlug: string) {
    const next = firms.find((item) => item.slug === nextSlug);
    setSlug(nextSlug);
    if (!next) return;
    setChallengeAmount(String(next.basic.funding.maxAccountSize));
    const firstTier = next.calculator.profitSplitTiers[0];
    if (firstTier) setTierId(firstTier.id);
  }

  function warningText(warning: PayoutWarning): string {
    switch (warning.code) {
      case "below-min-challenge":
        return t("warningBelowMinChallenge", {
          amount: formatMoney(warning.amount, warning.currency),
        });
      case "above-max-challenge":
        return t("warningAboveMaxChallenge", {
          amount: formatMoney(warning.amount, warning.currency),
        });
      case "profit-outside-tier-range":
        return t("warningProfitOutsideTierRange");
    }
  }

  return (
    <section
      aria-labelledby="payout-calculator-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2
        id="payout-calculator-heading"
        className="text-lg font-semibold tracking-tight"
      >
        {t("heading")}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        {lockFirm ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-zinc-500">{t("currentFirm")}</p>
            <p className="mt-1 font-medium">{selectedFirm.basic.name}</p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("firmLabel")}</span>
            <select
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={slug}
              onChange={(event) => onFirmChange(event.target.value)}
            >
              {firms.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.basic.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("tierLabel")}</span>
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={tierId}
            onChange={(event) => setTierId(event.target.value)}
          >
            {selectedFirm.calculator.profitSplitTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label}（{tier.traderSharePercent}%）
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            {t("challengeAmountLabel", { currency })}
          </span>
          <input
            type="number"
            min={0}
            step={1000}
            inputMode="decimal"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={challengeAmount}
            onChange={(event) => setChallengeAmount(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("profitLabel", { currency })}</span>
          <input
            type="number"
            min={0}
            step={100}
            inputMode="decimal"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={profit}
            onChange={(event) => setProfit(event.target.value)}
          />
        </label>
      </form>

      <div className="mt-6 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
        {breakdown && "code" in breakdown ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {breakdown.code === "invalid-number"
              ? t("errorInvalidNumber")
              : t("errorTierNotFound")}
          </p>
        ) : breakdown ? (
          <>
            <p className="text-sm text-zinc-500">{t("estimatedPayout")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatMoney(breakdown.netPayout, breakdown.currency)}
            </p>
            {breakdown.profitPercentOfChallenge != null ? (
              <p className="mt-1 text-sm text-zinc-500">
                {t("profitPercentOfChallenge", {
                  percent: breakdown.profitPercentOfChallenge.toFixed(2),
                })}
              </p>
            ) : null}
            {breakdown.belowMinimum ? (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                {t("belowMinimumWarning", {
                  amount: formatMoney(
                    breakdown.minPayoutAmount,
                    breakdown.currency,
                  ),
                })}
              </p>
            ) : null}
            {breakdown.warnings.map((warning, index) => (
              <p
                key={`${warning.code}-${index}`}
                className="mt-2 text-sm text-amber-700 dark:text-amber-400"
              >
                {warningText(warning)}
              </p>
            ))}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-zinc-500">{t("platformDeduction")}</dt>
              <dd className="text-right">
                {formatMoney(breakdown.platformDeduction, currency)}
              </dd>
              <dt className="text-zinc-500">
                {t("traderShare", { percent: breakdown.tier.traderSharePercent })}
              </dt>
              <dd className="text-right">
                {formatMoney(breakdown.traderShare, currency)}
              </dd>
              <dt className="text-zinc-500">{t("firmShare")}</dt>
              <dd className="text-right">
                {formatMoney(breakdown.firmShare, currency)}
              </dd>
              <dt className="text-zinc-500">{t("taxWithheld")}</dt>
              <dd className="text-right">
                {formatMoney(breakdown.taxWithheld, currency)}
              </dd>
              <dt className="text-zinc-500">{t("processorFee")}</dt>
              <dd className="text-right">
                {formatMoney(breakdown.processorFee, currency)}
              </dd>
              <dt className="text-zinc-500">{t("withdrawalFee")}</dt>
              <dd className="text-right">
                {formatMoney(breakdown.withdrawalFee, currency)}
              </dd>
            </dl>
          </>
        ) : null}
      </div>
    </section>
  );
}
