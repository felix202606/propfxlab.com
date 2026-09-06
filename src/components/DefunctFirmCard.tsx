import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SaferAlternatives } from "@/components/SaferAlternatives";
import { formatMonthYear } from "@/lib/news-format";
import type { DefunctFirm, DefunctStatus } from "@/lib/schema";

const STATUS_LABEL_KEY: Record<DefunctStatus, string> = {
  regulatory_action: "statusRegulatoryAction",
  unpaid_payouts: "statusUnpaidPayouts",
  ceased_operations: "statusCeasedOperations",
};

const SEVERITY_BADGE: Record<DefunctFirm["severity"], string> = {
  high: "border-red-400/30 bg-red-400/10 text-red-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export function DefunctFirmCard({
  firm,
  locale,
}: {
  firm: DefunctFirm;
  locale: string;
}) {
  const t = useTranslations("DefunctPage");

  return (
    <article className="flex h-full flex-col rounded-2xl border border-red-400/20 bg-gradient-to-b from-red-950/25 via-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(248,113,113,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg leading-none">
              🚫
            </span>
            <h3 className="truncate text-lg font-semibold tracking-tight text-zinc-50">
              {firm.name}
            </h3>
          </div>
          {firm.aliases.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("akaLabel")}: {firm.aliases.join(", ")}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${SEVERITY_BADGE[firm.severity]}`}
        >
          {t(STATUS_LABEL_KEY[firm.status])}
        </span>
      </div>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {t("closedOnLabel")}:{" "}
        <span className="font-mono text-amber-300">
          {formatMonthYear(firm.closedDate, locale)}
        </span>
      </p>

      <p className="mt-3 flex-1 text-sm leading-6 text-zinc-300">{firm.reason}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {firm.relatedFirmSlug ? (
          <Link
            href={`/firm/${firm.relatedFirmSlug}`}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-400/30 hover:text-amber-200"
          >
            {t("viewFullProfile")}
          </Link>
        ) : null}
        {firm.sourceUrl ? (
          <a
            href={firm.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
          >
            {t("sourceLabel")}
          </a>
        ) : null}
      </div>

      <div className="mt-4">
        <SaferAlternatives variant="compact" />
      </div>
    </article>
  );
}
