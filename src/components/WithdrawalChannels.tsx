import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/payout";
import type { WithdrawalChannel, WithdrawalFee } from "@/lib/schema";

const METHOD_ICON: Record<WithdrawalChannel["method"], string> = {
  bank_wire: "🏦",
  card: "💳",
  ewallet: "👛",
  crypto: "₿",
  other: "🌐",
};

const METHOD_LABEL_KEY: Record<WithdrawalChannel["method"], string> = {
  bank_wire: "methodBankWire",
  card: "methodCard",
  ewallet: "methodEwallet",
  crypto: "methodCrypto",
  other: "methodOther",
};

function FeeText({
  fee,
  fallbackCurrency,
}: {
  fee: WithdrawalFee;
  fallbackCurrency: string;
}) {
  const t = useTranslations("FirmPage");
  const currency = fee.currency ?? fallbackCurrency;

  switch (fee.type) {
    case "none":
      return <>{t("feeNone")}</>;
    case "flat":
      return (
        <>{t("feeFlat", { amount: formatMoney(fee.flatAmount ?? 0, currency) })}</>
      );
    case "percent":
      return <>{t("feePercent", { percent: fee.percent ?? 0 })}</>;
    case "mixed":
      return (
        <>
          {t("feeMixed", {
            amount: formatMoney(fee.flatAmount ?? 0, currency),
            percent: fee.percent ?? 0,
          })}
        </>
      );
  }
}

export function WithdrawalChannels({
  channels,
  currency,
}: {
  channels: WithdrawalChannel[];
  currency: string;
}) {
  const t = useTranslations("FirmPage");

  return (
    <section
      aria-labelledby="withdrawal-channels-heading"
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
    >
      <h2
        id="withdrawal-channels-heading"
        className="text-xl font-semibold tracking-tight text-zinc-50"
      >
        {t("channelsHeading")}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{t("channelsSubtitle")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors duration-200 hover:border-emerald-400/30 hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg ring-1 ring-white/10"
              >
                {METHOD_ICON[channel.method]}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">
                  {channel.name}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {t(METHOD_LABEL_KEY[channel.method])}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-zinc-500">{t("channelMinLabel")}</dt>
                <dd className="font-mono text-zinc-300">
                  {formatMoney(channel.minAmount, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-zinc-500">{t("channelMaxLabel")}</dt>
                <dd className="font-mono text-zinc-300">
                  {channel.maxAmount != null
                    ? formatMoney(channel.maxAmount, currency)
                    : t("channelNoMax")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-zinc-500">{t("channelProcessingLabel")}</dt>
                <dd className="text-right text-zinc-300">
                  {t("channelProcessingRange", {
                    min: channel.processingBusinessDays.min,
                    max: channel.processingBusinessDays.max,
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-zinc-500">{t("channelFeeLabel")}</dt>
                <dd className="font-medium text-emerald-300">
                  <FeeText fee={channel.fee} fallbackCurrency={currency} />
                </dd>
              </div>
            </dl>

            {channel.notes ? (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {channel.notes}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
