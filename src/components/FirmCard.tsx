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
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide ${style.badgeClasses}`}
    >
      {style.icon ? (
        <span aria-hidden>{style.icon}</span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${style.dotClasses}`} />
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
  const channelTags = getCardChannelTags(firm.withdrawal.channels).slice(0, 2);
  const firstPayoutDays = firm.withdrawal.payoutCycle.firstPayoutMinDays;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-colors hover:border-emerald-400/30">
      <div className="relative flex items-center gap-2">
        <FirmLogo
          name={firm.basic.name}
          src={firm.basic.logo.src}
          alt={firm.basic.logo.alt}
          size="sm"
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {rank != null ? (
            <span className="shrink-0 font-mono text-[10px] text-zinc-500">
              #{rank}
            </span>
          ) : null}
          <h3 className="truncate text-xs font-semibold tracking-tight text-zinc-50">
            {firm.basic.name}
          </h3>
        </div>
        <StatusBadge status={firm.status} />
      </div>

      <dl className="relative mt-2 grid grid-cols-3 gap-1.5">
        <div>
          <dt className="truncate text-[9px] leading-3 text-zinc-500">
            {t("netPayoutLabel")}
          </dt>
          <dd className="mt-px font-mono text-xs font-semibold text-emerald-300">
            {netPayout != null ? formatMoney(netPayout, payoutCurrency) : "—"}
          </dd>
        </div>
        <div>
          <dt className="truncate text-[9px] leading-3 text-zinc-500">
            {t("payoutSpeedLabel")}
          </dt>
          <dd className="mt-px line-clamp-1 text-[11px] font-medium leading-4 text-amber-300">
            {firm.payoutSpeed}
          </dd>
        </div>
        <div>
          <dt className="truncate text-[9px] leading-3 text-zinc-500">
            {t("firstPayoutLabel")}
          </dt>
          <dd className="mt-px font-mono text-[11px] font-medium text-cyan-300">
            {firstPayoutDays === 0
              ? t("firstPayoutImmediate")
              : t("firstPayoutValue", { days: firstPayoutDays })}
          </dd>
        </div>
      </dl>

      {channelTags.length > 0 ? (
        <ul className="relative mt-1.5 flex gap-1 overflow-hidden">
          {channelTags.map((tag) => (
            <li
              key={tag.id}
              className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-px font-mono text-[9px] font-medium tracking-wide text-cyan-200"
            >
              {tag.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative mt-auto pt-2">
        {firm.status === "suspended" ? (
          <Link
            href={`/firm/${firm.slug}`}
            className="inline-flex w-full items-center justify-center rounded-md border border-red-400/20 bg-red-400/10 px-2 py-1 text-[11px] font-medium text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-400/15"
          >
            {t("readReview")}
          </Link>
        ) : (
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <PromoCodeCopy compact code={offer.code} href={offer.href} />
            </div>
            <a
              href={offer.href}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-zinc-950 shadow-[0_0_14px_-4px_rgba(52,211,153,0.95)] transition-all hover:brightness-110"
            >
              {t("claimCta")}
            </a>
            <Link
              href={`/firm/${firm.slug}`}
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-zinc-950/70 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-zinc-400 transition-colors hover:border-white/15 hover:text-zinc-200"
            >
              {t("readReview")}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
