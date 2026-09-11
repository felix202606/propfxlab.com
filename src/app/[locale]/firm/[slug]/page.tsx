import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PayoutCalculator } from "@/components/PayoutCalculator";
import { WithdrawalChannels } from "@/components/WithdrawalChannels";
import { ProsConsBox } from "@/components/ProsConsBox";
import { WarningBox } from "@/components/WarningBox";
import { FaqAccordion } from "@/components/FaqAccordion";
import { FirmLogo } from "@/components/FirmLogo";
import { canonicalCompareSlug, COMPARE_EXCLUDED_SLUGS } from "@/lib/compare";
import { getAllFirms, getFirmBySlug, getFirmSlugs } from "@/lib/data";
import { getOutboundLink } from "@/lib/offers";
import { formatMoney } from "@/lib/payout";
import { toFaqJsonLd } from "@/lib/schema";

export function generateStaticParams() {
  return getFirmSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/firm/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const firm = getFirmBySlug(slug);
  const t = await getTranslations({ locale, namespace: "FirmPage" });
  if (!firm) {
    return { title: t("notFoundMetaTitle") };
  }
  return {
    title: t("metaTitle", { name: firm.basic.name }),
    description: t("metaDescription", { name: firm.basic.name }),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}

export default async function FirmPage({
  params,
}: PageProps<"/[locale]/firm/[slug]">) {
  const { slug } = await params;
  const firm = getFirmBySlug(slug);
  if (!firm) notFound();

  const t = await getTranslations("FirmPage");
  const firms = getAllFirms();
  const jsonLd = toFaqJsonLd(firm);
  const { funding } = firm.basic;
  const outbound = getOutboundLink(firm.slug, firm.basic.website);
  const cycle = firm.withdrawal.payoutCycle;

  const cycleText =
    cycle.type === "on_demand"
      ? t("cycleOnDemand", { days: cycle.firstPayoutMinDays })
      : cycle.subsequentIntervalDays
        ? t("cycleEveryNDays", { days: cycle.subsequentIntervalDays })
        : t("cycleOnDemandAfterFirst", { days: cycle.firstPayoutMinDays });

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="flex flex-wrap items-center gap-4">
        <FirmLogo
          name={firm.basic.name}
          src={firm.basic.logo.src}
          alt={firm.basic.logo.alt}
          size="md"
        />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {firm.basic.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {firm.basic.legalName ? `${firm.basic.legalName} · ` : null}
            {t("foundedOn", { date: firm.basic.foundedAt })} ·{" "}
            {firm.basic.headquarters.city}, {firm.basic.headquarters.country}
          </p>
        </div>
        <a
          href={outbound.href}
          className="ml-auto text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          rel={outbound.rel}
          target="_blank"
        >
          {t("website")}
        </a>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("minFunding")}
          value={formatMoney(funding.minAccountSize, funding.currency)}
        />
        <Stat
          label={t("maxFunding")}
          value={formatMoney(funding.maxAccountSize, funding.currency)}
        />
        <Stat
          label={t("defaultSplit")}
          value={`${firm.withdrawal.defaultTraderSharePercent}% / ${firm.withdrawal.defaultFirmSharePercent}%`}
        />
        <Stat label={t("payoutCycleLabel")} value={cycleText} />
        <Stat
          label={t("platformTax")}
          value={`${firm.calculator.platformWithholdingTaxPercent}%`}
        />
        <Stat
          label={t("minPayout")}
          value={formatMoney(
            firm.calculator.minPayoutAmount,
            firm.calculator.currency,
          )}
        />
        <Stat
          label={t("scalingCap")}
          value={
            funding.maxScaledSize
              ? formatMoney(funding.maxScaledSize, funding.currency)
              : t("none")
          }
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {cycle.description}
      </p>

      {/* 出金通道图标区 */}
      <div className="mt-10">
        <WithdrawalChannels
          channels={firm.withdrawal.channels}
          currency={firm.calculator.currency}
        />
      </div>

      {/* 优缺点 Pros & Cons 对比框 */}
      {firm.prosAndCons ? (
        <div className="mt-8">
          <ProsConsBox prosAndCons={firm.prosAndCons} />
        </div>
      ) : null}

      <div className="mt-10">
        <PayoutCalculator firms={firms} defaultSlug={firm.slug} lockFirm />
      </div>

      {/* 禁忌规则提醒 Warning Box */}
      <div className="mt-10">
        <WarningBox warnings={firm.withdrawal.warnings} />
      </div>

      {/* FAQ 展开手风琴 */}
      <div className="mt-14">
        <FaqAccordion faqs={firm.faqs} />
      </div>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-zinc-100">
          {t("compareHeading", { name: firm.basic.name })}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {firms
            .filter(
              (other) =>
                other.slug !== firm.slug &&
                !COMPARE_EXCLUDED_SLUGS.has(other.slug),
            )
            .map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/compare/${canonicalCompareSlug(firm.slug, other.slug)}`}
                  className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white"
                >
                  {t("compareWith", { name: other.basic.name })}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </article>
  );
}
