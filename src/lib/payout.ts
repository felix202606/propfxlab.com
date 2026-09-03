import type { PropFirm, ProfitSplitTier, WithdrawalFee } from "@/lib/schema";

export type PayoutInput = {
  firm: PropFirm;
  challengeAmount: number;
  profit: number;
  tierId: string;
};

export type PayoutWarning =
  | { code: "below-min-challenge"; amount: number; currency: string }
  | { code: "above-max-challenge"; amount: number; currency: string }
  | { code: "profit-outside-tier-range" };

export type PayoutError = { code: "tier-not-found" | "invalid-number" };

export type PayoutBreakdown = {
  currency: string;
  challengeAmount: number;
  profit: number;
  profitPercentOfChallenge: number | null;
  tier: ProfitSplitTier;
  afterPlatformDeduction: number;
  platformDeduction: number;
  traderShare: number;
  firmShare: number;
  taxWithheld: number;
  afterTax: number;
  processorFee: number;
  withdrawalFee: number;
  netPayout: number;
  belowMinimum: boolean;
  minPayoutAmount: number;
  warnings: PayoutWarning[];
};

function applyFee(amount: number, fee: WithdrawalFee): number {
  if (fee.type === "none") return 0;

  let feeAmount = 0;
  if ((fee.type === "flat" || fee.type === "mixed") && fee.flatAmount != null) {
    feeAmount += fee.flatAmount;
  }
  if ((fee.type === "percent" || fee.type === "mixed") && fee.percent != null) {
    feeAmount += amount * (fee.percent / 100);
  }
  return feeAmount;
}

export function resolveTier(
  firm: PropFirm,
  tierId: string,
): ProfitSplitTier | undefined {
  return firm.calculator.profitSplitTiers.find((tier) => tier.id === tierId);
}

export function calculatePayout(input: PayoutInput): PayoutBreakdown | PayoutError {
  const { firm, challengeAmount, profit, tierId } = input;
  const tier = resolveTier(firm, tierId);

  if (!tier) {
    return { code: "tier-not-found" };
  }

  const warnings: PayoutWarning[] = [];
  const { minAccountSize, maxAccountSize } = firm.basic.funding;
  const { currency } = firm.basic.funding;

  if (challengeAmount > 0 && challengeAmount < minAccountSize) {
    warnings.push({ code: "below-min-challenge", amount: minAccountSize, currency });
  }
  if (challengeAmount > maxAccountSize) {
    warnings.push({ code: "above-max-challenge", amount: maxAccountSize, currency });
  }
  if (
    (tier.maxProfit != null && profit >= tier.maxProfit) ||
    profit < tier.minProfit
  ) {
    warnings.push({ code: "profit-outside-tier-range" });
  }

  const safeProfit = Number.isFinite(profit) ? Math.max(0, profit) : 0;
  const deductionRate = firm.calculator.platformDeductionPercent / 100;
  const platformDeduction = safeProfit * deductionRate;
  const afterPlatformDeduction = safeProfit - platformDeduction;

  const traderShare =
    afterPlatformDeduction * (tier.traderSharePercent / 100);
  const firmShare = afterPlatformDeduction - traderShare;

  const taxRate = firm.calculator.platformWithholdingTaxPercent / 100;
  const taxWithheld = traderShare * taxRate;
  const afterTax = traderShare - taxWithheld;

  const processorFee =
    afterTax * (firm.calculator.paymentProcessorFeePercent / 100);
  const afterProcessor = afterTax - processorFee;

  const withdrawalFee = applyFee(afterProcessor, firm.withdrawal.platformFee);
  const netPayout = Math.max(0, afterProcessor - withdrawalFee);

  const minPayoutAmount = firm.calculator.minPayoutAmount;
  const belowMinimum = netPayout > 0 && netPayout < minPayoutAmount;

  return {
    currency: firm.calculator.currency,
    challengeAmount,
    profit: safeProfit,
    profitPercentOfChallenge:
      challengeAmount > 0 ? (safeProfit / challengeAmount) * 100 : null,
    tier,
    afterPlatformDeduction,
    platformDeduction,
    traderShare,
    firmShare,
    taxWithheld,
    afterTax,
    processorFee,
    withdrawalFee,
    netPayout,
    belowMinimum,
    minPayoutAmount,
    warnings,
  };
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
