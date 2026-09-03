import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PlatformStatus, PropFirm } from "@/lib/schema";
import { formatMoney } from "@/lib/payout";

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
      className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm ${style.badgeClasses}`}
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

export function FirmCard({ firm }: { firm: PropFirm }) {
  const t = useTranslations("FirmCard");
  const { funding } = firm.basic;

  return (
    <Link
      href={`/firm/${firm.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:shadow-[0_0_28px_-8px_rgba(16,185,129,0.4)]"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <StatusBadge status={firm.status} />

      <p className="pr-28 font-semibold tracking-tight text-zinc-50">
        {firm.basic.name}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {firm.basic.headquarters.city} ·{" "}
        {t("foundedIn", { year: firm.basic.foundedAt.slice(0, 4) })}
      </p>

      <dl className="mt-4 space-y-2 border-t border-white/5 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{t("fundingRangeLabel")}</dt>
          <dd className="font-mono text-zinc-300">
            {formatMoney(funding.minAccountSize, funding.currency)}
            {" – "}
            {formatMoney(funding.maxAccountSize, funding.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{t("splitLabel")}</dt>
          <dd className="font-mono text-zinc-300">
            {firm.withdrawal.defaultTraderSharePercent}%
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{t("payoutSpeedLabel")}</dt>
          <dd className="inline-flex items-center gap-1 font-mono font-medium text-amber-300">
            <span aria-hidden>⚡</span>
            {firm.payoutSpeed}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
