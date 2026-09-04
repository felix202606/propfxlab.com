"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FirmCard } from "@/components/FirmCard";
import { HERO_ACCOUNT_SIZES } from "@/lib/offers";
import {
  calculatePayout,
  formatMoney,
  type PayoutBreakdown,
} from "@/lib/payout";
import type { PropFirm } from "@/lib/schema";

const DEFAULT_ACCOUNT = 100_000;
const DEFAULT_PROFIT = 8000;

function formatAccountChip(amount: number): string {
  if (amount >= 1000) return `$${amount / 1000}k`;
  return `$${amount}`;
}

function payoutForFirm(
  firm: PropFirm,
  challengeAmount: number,
  profit: number,
): PayoutBreakdown | null {
  const tierId = firm.calculator.profitSplitTiers[0]?.id;
  if (!tierId) return null;
  const result = calculatePayout({
    firm,
    challengeAmount,
    profit,
    tierId,
  });
  if ("code" in result) return null;
  return result;
}

export function HomeMarketplace({ firms }: { firms: PropFirm[] }) {
  const t = useTranslations("HomePage");
  const calc = useTranslations("PayoutCalculator");
  const [accountSize, setAccountSize] = useState(DEFAULT_ACCOUNT);
  const [profit, setProfit] = useState(String(DEFAULT_PROFIT));

  const profitValue = Number(profit);
  const hasValidProfit = Number.isFinite(profitValue) && profitValue >= 0;

  const ranked = useMemo(() => {
    if (!hasValidProfit) return [];
    return firms
      .map((firm) => ({
        firm,
        breakdown: payoutForFirm(firm, accountSize, profitValue),
      }))
      .sort((a, b) => {
        const aClosed = a.firm.status === "suspended" ? 1 : 0;
        const bClosed = b.firm.status === "suspended" ? 1 : 0;
        if (aClosed !== bClosed) return aClosed - bClosed;
        const aPay = a.breakdown?.netPayout ?? -1;
        const bPay = b.breakdown?.netPayout ?? -1;
        return bPay - aPay;
      });
  }, [firms, accountSize, profitValue, hasValidProfit]);

  const leader =
    ranked.find((entry) => entry.firm.status !== "suspended") ?? ranked[0];
  const preview = leader?.breakdown ?? null;

  return (
    <>
      <section
        id="calculator"
        className="relative overflow-hidden border-b border-white/5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-10 lg:pt-24 lg:pb-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-emerald-300 bg-clip-text text-transparent">
                {t("title")}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              {t("subtitle")}
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => event.preventDefault()}
            >
              <fieldset>
                <legend className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {t("accountSizeLabel")}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HERO_ACCOUNT_SIZES.map((size) => {
                    const selected = size === accountSize;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setAccountSize(size)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                          selected
                            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgba(52,211,153,0.9)]"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                        }`}
                      >
                        {formatAccountChip(size)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block max-w-sm text-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {t("profitLabel")}
                </span>
                <span className="relative mt-2 flex">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    inputMode="decimal"
                    value={profit}
                    onChange={(event) => setProfit(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-3 pl-7 font-mono text-lg text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-400/40"
                  />
                </span>
              </label>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-32px_rgba(16,185,129,0.45)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t("previewLabel")}
            </p>
            {firms.length === 0 ? (
              <div className="mt-6 space-y-4">
                <div className="h-12 w-48 animate-pulse rounded-lg bg-white/10" />
                <p className="text-sm text-zinc-500">{t("emptyPreview")}</p>
              </div>
            ) : preview && leader ? (
              <>
                <p className="mt-1 text-sm text-zinc-400">
                  {t("previewFirm", { firm: leader.firm.basic.name })}
                </p>
                <p className="mt-4 bg-gradient-to-r from-emerald-300 via-cyan-300 to-white bg-clip-text font-mono text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
                  {formatMoney(preview.netPayout, preview.currency)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {t("previewSplit", {
                    percent: preview.tier.traderSharePercent,
                  })}
                </p>
                <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                      {calc("traderShare", {
                        percent: preview.tier.traderSharePercent,
                      })}
                    </dt>
                    <dd className="mt-1 font-mono text-zinc-200">
                      {formatMoney(preview.traderShare, preview.currency)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                      {calc("withdrawalFee")}
                    </dt>
                    <dd className="mt-1 font-mono text-zinc-200">
                      {formatMoney(preview.withdrawalFee, preview.currency)}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/calculator"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20"
                >
                  {t("openCalculator")}
                </Link>
              </>
            ) : (
              <p className="mt-6 text-sm text-red-400">
                {calc("errorInvalidNumber")}
              </p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] tracking-wide text-zinc-500">
          {t("dataAudited")}
        </p>
        </div>
      </section>

      <section id="rankings" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent">
                {t("rankingsTitle")}
              </span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {t("rankingsSubtitle", {
                account: formatAccountChip(accountSize),
                profit: hasValidProfit
                  ? formatMoney(profitValue, "USD")
                  : "—",
              })}
            </p>
          </div>
        </div>

        {firms.length === 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
            <p className="md:col-span-2 text-sm text-zinc-500">
              {t("emptyRankings")}
            </p>
          </div>
        ) : (
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {ranked.map(({ firm, breakdown }, index) => (
              <li key={firm.slug}>
                <FirmCard
                  firm={firm}
                  rank={index + 1}
                  netPayout={breakdown?.netPayout ?? null}
                  currency={firm.calculator.currency}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
