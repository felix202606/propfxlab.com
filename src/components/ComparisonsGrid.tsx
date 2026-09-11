import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ComparePicker } from "@/components/ComparePicker";
import { FirmLogo } from "@/components/FirmLogo";
import { canonicalCompareSlug, listCanonicalCompareSlugs } from "@/lib/compare";
import { getOutboundLink, POPULAR_COMPARISONS } from "@/lib/offers";
import type { PropFirm } from "@/lib/schema";

export function ComparisonsGrid({
  firms,
  showHeader = true,
  showViewAll = true,
  embedded = false,
  popularHeading,
}: {
  firms: PropFirm[];
  showHeader?: boolean;
  showViewAll?: boolean;
  embedded?: boolean;
  popularHeading?: string;
}) {
  const t = useTranslations("HomePage");
  const bySlug = new Map(firms.map((firm) => [firm.slug, firm]));

  const pairs = POPULAR_COMPARISONS.flatMap(([leftSlug, rightSlug]) => {
    const left = bySlug.get(leftSlug);
    const right = bySlug.get(rightSlug);
    if (!left || !right) return [];
    return [{ left, right }];
  }).slice(0, 6);

  const pickerFirms = firms.map((firm) => ({
    slug: firm.slug,
    name: firm.basic.name,
  }));

  return (
    <section
      id={embedded ? "popular-comparisons" : "compare"}
      className={
        embedded
          ? "scroll-mt-24"
          : "scroll-mt-24 border-b border-slate-800 bg-[#0B0F19]"
      }
    >
      <div className={embedded ? undefined : "mx-auto w-full max-w-6xl px-4 py-16"}>
      {showHeader ? (
        <>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              {t("comparisonsTitle")}
            </span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {t("comparisonsSubtitle")}
          </p>
        </>
      ) : null}
      {showViewAll && pickerFirms.length >= 2 ? (
        <p className="mt-3">
          <Link
            href="/compare"
            className="text-sm font-medium text-indigo-300 transition-colors hover:text-white"
          >
            {t("viewAllComparisons", {
              count: listCanonicalCompareSlugs(pickerFirms.map((firm) => firm.slug))
                .length,
            })}
          </Link>
        </p>
      ) : null}

      {pickerFirms.length >= 2 ? <ComparePicker firms={pickerFirms} /> : null}

      {popularHeading ? (
        <h2 className="mt-10 text-lg font-semibold text-slate-100">
          {popularHeading}
        </h2>
      ) : null}

      {pairs.length === 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40"
            />
          ))}
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map(({ left, right }) => {
            const compareHref = `/compare/${canonicalCompareSlug(left.slug, right.slug)}`;
            const leftOut = getOutboundLink(left.slug, left.basic.website);
            const rightOut = getOutboundLink(right.slug, right.basic.website);

            return (
              <li key={`${left.slug}-vs-${right.slug}`}>
                <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-gradient-to-b from-[#12182a] to-[#0B0F19] p-5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_28px_-10px_rgba(99,102,241,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <FirmMini firm={left} />
                    <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-500">
                      {t("vs")}
                    </span>
                    <FirmMini firm={right} align="right" />
                  </div>

                  <Link
                    href={compareHref}
                    className="mt-4 text-sm font-medium text-slate-200 transition-colors hover:text-white"
                  >
                    {left.basic.name} {t("vs")} {right.basic.name}
                  </Link>

                  <Link
                    href={compareHref}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-3 py-2 text-center text-xs font-semibold text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
                  >
                    {t("viewComparison")}
                  </Link>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={leftOut.href}
                      target="_blank"
                      rel={leftOut.rel}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-center text-xs font-medium text-slate-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                    >
                      {left.basic.name}
                    </a>
                    <a
                      href={rightOut.href}
                      target="_blank"
                      rel={rightOut.rel}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-center text-xs font-medium text-slate-300 transition-colors hover:border-indigo-400/40 hover:text-white"
                    >
                      {right.basic.name}
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </section>
  );
}

function FirmMini({
  firm,
  align = "left",
}: {
  firm: PropFirm;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <FirmLogo
        name={firm.basic.name}
        src={firm.basic.logo.src}
        alt={firm.basic.logo.alt}
        size="sm"
      />
      <span className="truncate text-xs font-medium text-slate-300">
        {firm.basic.name}
      </span>
    </div>
  );
}
