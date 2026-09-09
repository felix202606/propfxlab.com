import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FirmLogo } from "@/components/FirmLogo";
import { getOutHref } from "@/lib/offers";
import type { PropFirm } from "@/lib/schema";

export function FirmArchive({ firms }: { firms: PropFirm[] }) {
  const t = useTranslations("HomePage");
  const tCard = useTranslations("FirmCard");

  if (firms.length === 0) return null;

  return (
    <details className="group mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 open:border-amber-400/25">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{t("archiveTitle", { count: firms.length })}</span>
        <span className="shrink-0 text-xs text-slate-500 group-open:hidden">
          {t("archiveHint")}
        </span>
      </summary>
      <ul className="divide-y divide-slate-800 border-t border-slate-800">
        {firms.map((firm) => (
          <li
            key={firm.slug}
            className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap"
          >
            <FirmLogo
              name={firm.basic.name}
              src={firm.basic.logo.src}
              alt={firm.basic.logo.alt}
              size="sm"
            />
            <Link
              href={`/firm/${firm.slug}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100 hover:text-indigo-200"
            >
              {firm.basic.name}
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              <span aria-hidden>⚠️</span>
              {t("archiveRisk")}
            </span>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/firm/${firm.slug}`}
                className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-indigo-400/40 hover:text-indigo-100"
              >
                {tCard("calculateCta")}
              </Link>
              <a
                href={getOutHref(firm.slug)}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="rounded-md bg-indigo-500/20 px-2 py-1 text-[11px] font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
              >
                {tCard("visitOfficial")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
