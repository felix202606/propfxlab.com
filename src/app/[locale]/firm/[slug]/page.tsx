import type { Metadata } from "next";
import {
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/seo";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PayoutCalculator } from "@/components/PayoutCalculator";
import { WithdrawalChannels } from "@/components/WithdrawalChannels";
import { ProsConsBox } from "@/components/ProsConsBox";
import { WarningBox } from "@/components/WarningBox";
import { FaqAccordion } from "@/components/FaqAccordion";
import { FirmLogo } from "@/components/FirmLogo";
import { AffiliateLink } from "@/components/AffiliateLink";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { canonicalCompareSlug, COMPARE_EXCLUDED_SLUGS } from "@/lib/compare";
import { getFirmSlugs } from "@/lib/data";
import { getFirmRoster, getListedFirm } from "@/lib/firms";
import { getOutboundLink } from "@/lib/outbound";
import { formatMoney } from "@/lib/payout";
import { toFaqJsonLd } from "@/lib/schema";
import {
  featuredComparesForFirm,
  firmSeoFacts,
  fitDescription,
  fitTitle,
  listFormat,
  seoYear,
  titleText,
  type FirmSeoFacts,
} from "@/lib/seo-copy";

type FirmTranslator = Awaited<ReturnType<typeof getTranslations<"FirmPage">>>;

function splitLabel(t: FirmTranslator, facts: FirmSeoFacts, range: boolean): string {
  if (facts.maxSplit > facts.defaultSplit) {
    return range
      ? t("splitRange", { percent: facts.defaultSplit, max: facts.maxSplit })
      : t("splitUpTo", { max: facts.maxSplit });
  }
  return t("splitFlat", { percent: facts.defaultSplit });
}

function firstPayoutLabel(t: FirmTranslator, facts: FirmSeoFacts): string {
  return facts.firstPayoutDays === 0
    ? t("firstPayoutDayOne")
    : t("firstPayoutAfter", { days: facts.firstPayoutDays });
}

export function generateStaticParams() {
  return getFirmSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/firm/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const firm = await getListedFirm(slug);
  const t = await getTranslations({ locale, namespace: "FirmPage" });
  if (!firm) {
    return { title: t("notFoundMetaTitle") };
  }
  const facts = firmSeoFacts(firm);
  const year = seoYear();
  const split = splitLabel(t, facts, false);
  const title = fitTitle([
    t("metaTitle", { name: facts.name, year, split }),
    t("metaTitleShort", { name: facts.name, year, split }),
    t("metaTitleMin", { name: facts.name, year }),
  ]);
  const descriptionValues = {
    name: facts.name,
    year,
    split: splitLabel(t, facts, true),
    firstPayout: firstPayoutLabel(t, facts),
    hasMin: facts.minPayout ? "yes" : "no",
    minPayout: facts.minPayout ?? "",
    maxFunding: facts.maxFunding,
    channels: facts.channelNames.length,
  };
  const description = fitDescription([
    t("metaDescription", descriptionValues),
    t("metaDescriptionShort", descriptionValues),
  ]);
  const socialTitle = titleText(title);
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/firm/${slug}`),
    openGraph: pageOpenGraph({
      locale,
      pathname: `/firm/${slug}`,
      title: socialTitle,
      description,
    }),
    twitter: pageTwitter({ title: socialTitle, description }),
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
  const { locale, slug } = await params;
  const firm = await getListedFirm(slug);
  if (!firm) notFound();

  const t = await getTranslations("FirmPage");
  const tCard = await getTranslations("FirmCard");
  const roster = await getFirmRoster();
  const rosterNames = new Map(roster.map((item) => [item.slug, item.name]));
  const facts = firmSeoFacts(firm);
  const introFacts = t("introFacts", {
    name: facts.name,
    split: splitLabel(t, facts, true),
    firstPayout: firstPayoutLabel(t, facts),
    cadence:
      facts.intervalDays != null
        ? t("cadenceEvery", { days: facts.intervalDays })
        : facts.firstPayoutDays > 0
          ? t("cadenceOnDemand")
          : "",
    hasMin: facts.minPayout ? "yes" : "no",
    minPayout: facts.minPayout ?? "",
    minFunding: facts.minFunding,
    maxFunding: facts.maxFunding,
    channels: listFormat(locale, facts.channelNames),
  });
  const popularCompares = featuredComparesForFirm(
    firm.slug,
    roster.map((item) => item.slug),
  ).filter(([a, b]) => rosterNames.has(a) && rosterNames.has(b));
  const jsonLd = toFaqJsonLd(firm, locale);
  const { funding } = firm.basic;
  const offer = firm.offer;
  const outbound = getOutboundLink(firm);
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
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {offer?.code ? (
            <div className="min-w-0 max-w-xs">
              <PromoCodeCopy
                copyOnly
                code={offer.code}
                href={outbound.href}
                promotion={offer.promotion}
              />
            </div>
          ) : null}
          {outbound.partner ? (
            <AffiliateLink
              slug={firm.slug}
              source="firm_page"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
            >
              {tCard("claimCta")}
            </AffiliateLink>
          ) : (
            <a
              href={outbound.href}
              className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              rel={outbound.rel}
              target="_blank"
            >
              {t("website")}
            </a>
          )}
        </div>
      </header>

      <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-300">
        {introFacts}
      </p>

      {popularCompares.length > 0 ? (
        <nav
          aria-label={t("popularComparesHeading", { name: firm.basic.name })}
          className="mt-5"
        >
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("popularComparesHeading", { name: firm.basic.name })}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {popularCompares.map(([a, b]) => (
              <li key={`${a}-${b}`}>
                <Link
                  href={`/compare/${canonicalCompareSlug(a, b)}`}
                  className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:border-cyan-400/50 hover:text-white"
                >
                  {t("popularCompareLink", {
                    left: rosterNames.get(a) ?? a,
                    right: rosterNames.get(b) ?? b,
                  })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

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
        <PayoutCalculator firms={[firm]} defaultSlug={firm.slug} lockFirm />
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
          {roster
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
                  {t("compareWith", { name: other.name })}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </article>
  );
}
