import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FirmLogo } from "@/components/FirmLogo";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { getCardChannelTags } from "@/lib/channel-tags";
import {
  COMPARE_ACCOUNT_SIZE,
  COMPARE_EXAMPLE_PROFIT,
  examplePayoutForFirm,
  extractDrawdownRule,
  getPopularCompareSlugs,
  maxTraderSharePercent,
  parseCompareSlug,
  pickCompareInsight,
} from "@/lib/compare";
import { getFirmBySlug, getFirmSlugs } from "@/lib/data";
import { getFirmOffer } from "@/lib/offers";
import { formatMoney } from "@/lib/payout";
import type { PropFirm } from "@/lib/schema";

export function generateStaticParams() {
  return getPopularCompareSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/compare/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "ComparePage" });
  const pair = resolveComparePair(slug);
  if (!pair) {
    return { title: t("notFoundMetaTitle") };
  }
  const { left, right } = pair;
  return {
    title: t("metaTitle", { left: left.basic.name, right: right.basic.name }),
    description: t("metaDescription", {
      left: left.basic.name,
      right: right.basic.name,
    }),
  };
}

export default async function ComparePage({
  params,
}: PageProps<"/[locale]/compare/[slug]">) {
  const { slug } = await params;
  const pair = resolveComparePair(slug);
  if (!pair) notFound();

  const t = await getTranslations("ComparePage");
  const tCard = await getTranslations("FirmCard");
  const { left, right } = pair;
  const insight = pickCompareInsight(left, right);
  const leftPayout = examplePayoutForFirm(left);
  const rightPayout = examplePayoutForFirm(right);
  const leftWinsTakeHome =
    (leftPayout?.netPayout ?? 0) > (rightPayout?.netPayout ?? 0);
  const rightWinsTakeHome =
    (rightPayout?.netPayout ?? 0) > (leftPayout?.netPayout ?? 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("metaTitle", { left: left.basic.name, right: right.basic.name }),
    description: t("metaDescription", {
      left: left.basic.name,
      right: right.basic.name,
    }),
  };

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="text-sm">
        <Link
          href={{ pathname: "/", hash: "compare" }}
          className="text-zinc-500 transition-colors hover:text-cyan-300"
        >
          {t("backToCompare")}
        </Link>
      </p>

      <header className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {left.basic.name}{" "}
          <span className="font-mono text-sm tracking-widest text-zinc-500">
            {t("vs")}
          </span>{" "}
          {right.basic.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {t("subtitle", {
            account: formatMoney(COMPARE_ACCOUNT_SIZE, "USD"),
            profit: formatMoney(COMPARE_EXAMPLE_PROFIT, "USD"),
          })}
        </p>
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-[minmax(7rem,0.9fr)_1fr_1fr] border-b border-white/10 bg-white/[0.03]">
          <div className="px-3 py-4 sm:px-5" />
          <FirmColumnHead firm={left} />
          <FirmColumnHead firm={right} />
        </div>

        <CompareRow label={t("exampleProfitLabel")}>
          <TakeHomeCell
            amount={leftPayout?.netPayout ?? null}
            currency={left.calculator.currency}
            highlight={leftWinsTakeHome}
          />
          <TakeHomeCell
            amount={rightPayout?.netPayout ?? null}
            currency={right.calculator.currency}
            highlight={rightWinsTakeHome}
          />
        </CompareRow>

        <CompareRow label={t("profitSplit")}>
          <SplitCell firm={left} t={t} />
          <SplitCell firm={right} t={t} />
        </CompareRow>

        <CompareRow label={t("firstPayout")}>
          <TextCell>
            <p className="font-mono text-sm text-cyan-200">
              {formatFirstPayout(left, tCard)}
            </p>
          </TextCell>
          <TextCell>
            <p className="font-mono text-sm text-cyan-200">
              {formatFirstPayout(right, tCard)}
            </p>
          </TextCell>
        </CompareRow>

        <CompareRow label={t("channels")}>
          <ChannelCell firm={left} />
          <ChannelCell firm={right} />
        </CompareRow>

        <CompareRow label={t("drawdown")}>
          <TextCell>
            <p className="text-sm leading-6 text-zinc-300">
              {extractDrawdownRule(left) ?? t("drawdownFallback")}
            </p>
          </TextCell>
          <TextCell>
            <p className="text-sm leading-6 text-zinc-300">
              {extractDrawdownRule(right) ?? t("drawdownFallback")}
            </p>
          </TextCell>
        </CompareRow>

        <CompareRow label={t("promo")} last>
          <OfferCell firm={left} t={t} />
          <OfferCell firm={right} t={t} />
        </CompareRow>
      </div>

      <aside className="mt-8 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-zinc-950 to-emerald-400/10 p-5 shadow-[0_0_40px_-18px_rgba(34,211,238,0.55)] sm:p-6">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
          <span aria-hidden>✦</span>
          {t("insightTitle")}
        </p>
        <p className="mt-3 text-base leading-7 text-zinc-100 sm:text-lg">
          {t("insightTemplate", {
            nameA: left.basic.name,
            reasonA: t(insight.leftReason),
            nameB: right.basic.name,
            reasonB: t(insight.rightReason),
          })}
        </p>
      </aside>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ProfileLink firm={left} label={t("readProfile", { name: left.basic.name })} />
        <ProfileLink
          firm={right}
          label={t("readProfile", { name: right.basic.name })}
        />
      </div>
    </article>
  );
}

function resolveComparePair(slug: string): { left: PropFirm; right: PropFirm } | null {
  const parsed = parseCompareSlug(slug, getFirmSlugs());
  if (!parsed) return null;
  const [leftSlug, rightSlug] = parsed;
  if (leftSlug === rightSlug) return null;
  const left = getFirmBySlug(leftSlug);
  const right = getFirmBySlug(rightSlug);
  if (!left || !right) return null;
  return { left, right };
}

function formatFirstPayout(
  firm: PropFirm,
  tCard: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const days = firm.withdrawal.payoutCycle.firstPayoutMinDays;
  return days === 0
    ? tCard("firstPayoutImmediate")
    : tCard("firstPayoutValue", { days });
}

function FirmColumnHead({ firm }: { firm: PropFirm }) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-4 text-center sm:px-5">
      <FirmLogo
        name={firm.basic.name}
        src={firm.basic.logo.src}
        alt={firm.basic.logo.alt}
        size="md"
      />
      <p className="text-sm font-semibold text-zinc-50">{firm.basic.name}</p>
    </div>
  );
}

function CompareRow({
  label,
  last = false,
  children,
}: {
  label: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(7rem,0.9fr)_1fr_1fr] ${
        last ? "" : "border-b border-white/10"
      }`}
    >
      <div className="flex items-center px-3 py-4 sm:px-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function TextCell({ children }: { children: ReactNode }) {
  return <div className="px-3 py-4 sm:px-5">{children}</div>;
}

function TakeHomeCell({
  amount,
  currency,
  highlight,
}: {
  amount: number | null;
  currency: string;
  highlight: boolean;
}) {
  return (
    <div className="px-3 py-4 sm:px-5">
      <p
        className={`font-mono text-lg font-semibold ${
          highlight ? "text-emerald-300" : "text-zinc-100"
        }`}
      >
        {amount != null ? formatMoney(amount, currency) : "—"}
      </p>
    </div>
  );
}

function SplitCell({
  firm,
  t,
}: {
  firm: PropFirm;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const base = firm.withdrawal.defaultTraderSharePercent;
  const max = maxTraderSharePercent(firm);
  return (
    <div className="px-3 py-4 sm:px-5">
      <p className="text-sm font-medium text-zinc-100">
        {max > base
          ? t("splitWithMax", { percent: base, max })
          : t("splitDefault", { percent: base })}
      </p>
    </div>
  );
}

function ChannelCell({ firm }: { firm: PropFirm }) {
  const tags = getCardChannelTags(firm.withdrawal.channels);
  if (tags.length === 0) {
    return <div className="px-3 py-4 text-sm text-zinc-500 sm:px-5">—</div>;
  }
  return (
    <div className="px-3 py-4 sm:px-5">
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-cyan-200"
          >
            {tag.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfferCell({
  firm,
  t,
}: {
  firm: PropFirm;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const offer = getFirmOffer(firm.slug, firm.basic.website);
  return (
    <div className="flex flex-col gap-3 px-3 py-4 sm:px-5">
      <PromoCodeCopy code={offer.code} href={offer.href} />
      <a
        href={offer.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-3 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_22px_-4px_rgba(52,211,153,0.95)] transition-all hover:brightness-110"
      >
        {t("visitWebsite", { name: firm.basic.name })}
      </a>
    </div>
  );
}

function ProfileLink({ firm, label }: { firm: PropFirm; label: string }) {
  return (
    <Link
      href={`/firm/${firm.slug}`}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-cyan-400/30 hover:text-white"
    >
      {label}
    </Link>
  );
}
