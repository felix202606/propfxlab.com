import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FirmLogo } from "@/components/FirmLogo";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { getCardChannelTags } from "@/lib/channel-tags";
import { getFirmOffer } from "@/lib/offers";
import { formatMoney } from "@/lib/payout";
import type { PlatformStatus, PropFirm } from "@/lib/schema";

const STATUS_STYLES: Record<
  PlatformStatus,
  { icon: string | null; badgeClasses: string; dotClasses: string }
> = {
  active: {
    icon: null,
    badgeClasses: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    dotClasses: "bg-emerald-400",
  },
  warning: {
    icon: "⚠️",
    badgeClasses: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    dotClasses: "bg-amber-400",
  },
  suspended: {
    icon: "🚫",
    badgeClasses: "border-red-400/30 bg-red-400/10 text-red-300",
    dotClasses: "bg-red-400",
  },
};

const STATUS_LABEL_KEY: Record<PlatformStatus, string> = {
  active: "statusActive",
  warning: "statusWarning",
  suspended: "statusSuspended",
};

function StatusBadge({ status }: { status: PlatformStatus }) {
  const t = useTranslations("FirmCard");
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm ${style.badgeClasses}`}
    >
      {style.icon ? (
        <span aria-hidden>{style.icon}</span>
      ) : (
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${style.dotClasses}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${style.dotClasses}`}
          />
        </span>
      )}
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
}

type FirmCardProps = {
  firm: PropFirm;
  rank?: number;
  netPayout?: number | null;
  currency?: string;
};

export function FirmCard({ firm, rank, netPayout, currency }: FirmCardProps) {
  const t = useTranslations("FirmCard");
  const offer = getFirmOffer(firm.slug, firm.basic.website);
  const payoutCurrency = currency ?? firm.calculator.currency;
  const channelTags = getCardChannelTags(firm.withdrawal.channels);
  const firstPayoutDays = firm.withdrawal.payoutCycle.firstPayoutMinDays;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:shadow-[0_0_28px_-8px_rgba(16,185,129,0.4)]">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-3">
        <FirmLogo
          name={firm.basic.name}
          src={firm.basic.logo.src}
          alt={firm.basic.logo.alt}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {rank != null ? (
              <span className="font-mono text-[11px] text-zinc-500">#{rank}</span>
            ) : null}
            <h3 className="truncate font-semibold tracking-tight text-zinc-50">
              {firm.basic.name}
            </h3>
          </div>
          <div className="mt-1.5">
            <StatusBadge status={firm.status} />
          </div>
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("netPayoutLabel")}
          </dt>
          <dd className="mt-1 font-mono text-lg font-semibold text-emerald-300">
            {netPayout != null ? formatMoney(netPayout, payoutCurrency) : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("payoutSpeedLabel")}
          </dt>
          <dd className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-amber-300">
            <span aria-hidden>⚡</span>
            {firm.payoutSpeed}
          </dd>
        </div>
      </dl>

      <div className="relative mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {t("firstPayoutLabel")}
        </p>
        <p className="mt-0.5 font-mono text-sm font-medium text-cyan-300">
          {firstPayoutDays === 0
            ? t("firstPayoutImmediate")
            : t("firstPayoutValue", { days: firstPayoutDays })}
        </p>
      </div>

      {channelTags.length > 0 ? (
        <ul className="relative mt-3 flex flex-wrap gap-1.5">
          {channelTags.map((tag) => (
            <li
              key={tag.id}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-cyan-200"
            >
              {tag.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative mt-auto pt-4">
        {firm.status === "suspended" ? (
          <Link
            href={`/firm/${firm.slug}`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-400/15"
          >
            {t("readReview")}
          </Link>
        ) : (
          <>
            <PromoCodeCopy code={offer.code} href={offer.href} />

            <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-2">
              <a
                href={offer.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-3 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_22px_-4px_rgba(52,211,153,0.95)] ring-1 ring-emerald-200/50 transition-all hover:brightness-110 hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.85)]"
              >
                {t("claimCta")}
              </a>
              <Link
                href={`/firm/${firm.slug}`}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-950/70 px-3 py-2.5 text-sm font-medium text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-colors hover:border-white/15 hover:bg-zinc-900 hover:text-zinc-200"
              >
                {t("readReview")}
              </Link>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
