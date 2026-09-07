import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ComparePicker } from "@/components/ComparePicker";
import { FirmLogo } from "@/components/FirmLogo";
import { canonicalCompareSlug, listCanonicalCompareSlugs } from "@/lib/compare";
import { getFirmOffer, POPULAR_COMPARISONS } from "@/lib/offers";
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
          : "mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16"
      }
    >
      {showHeader ? (
        <>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              {t("comparisonsTitle")}
            </span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {t("comparisonsSubtitle")}
          </p>
        </>
      ) : null}
      {showViewAll && pickerFirms.length >= 2 ? (
        <p className="mt-3">
          <Link
            href="/compare"
            className="text-sm font-medium text-cyan-300 transition-colors hover:text-white"
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
        <h2 className="mt-10 text-lg font-semibold text-zinc-100">
          {popularHeading}
        </h2>
      ) : null}

      {pairs.length === 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map(({ left, right }) => {
            const compareHref = `/compare/${canonicalCompareSlug(left.slug, right.slug)}`;
            const leftOffer = getFirmOffer(left.slug, left.basic.website);
            const rightOffer = getFirmOffer(right.slug, right.basic.website);

            return (
              <li key={`${left.slug}-vs-${right.slug}`}>
                <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-cyan-400/25 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.35)]">
                  <div className="flex items-center justify-between gap-3">
                    <FirmMini firm={left} />
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-widest text-zinc-500">
                      {t("vs")}
                    </span>
                    <FirmMini firm={right} align="right" />
                  </div>

                  <Link
                    href={compareHref}
                    className="mt-4 text-sm font-medium text-zinc-200 transition-colors hover:text-white"
                  >
                    {left.basic.name} {t("vs")} {right.basic.name}
                  </Link>

                  <Link
                    href={compareHref}
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-center text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-300/50 hover:bg-cyan-400/15 hover:text-white"
                  >
                    {t("viewComparison")}
                  </Link>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={leftOffer.href}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-white"
                    >
                      {left.basic.name}
                    </a>
                    <a
                      href={rightOffer.href}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-white"
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
      <span className="truncate text-xs font-medium text-zinc-300">
        {firm.basic.name}
      </span>
    </div>
  );
}
