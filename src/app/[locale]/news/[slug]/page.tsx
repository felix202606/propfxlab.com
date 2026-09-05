import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsShareButtons } from "@/components/NewsShareButtons";
import { SubscribeForm } from "@/components/SubscribeForm";
import { getAllFirms, getNewsBySlug, getNewsSlugs } from "@/lib/data";
import { formatNewsPublished, newsArticleAbsoluteUrl } from "@/lib/news-format";
import { getNewsLocaleCopy } from "@/lib/schema";
import { localeMeta } from "@/i18n/routing";

export function generateStaticParams() {
  return getNewsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getNewsBySlug(slug);
  const t = await getTranslations({ locale, namespace: "NewsPage" });
  if (!article) {
    return { title: t("notFoundMetaTitle") };
  }
  const copy = getNewsLocaleCopy(article, locale);
  return {
    title: copy.title,
    description: copy.summary,
  };
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default async function NewsArticlePage({
  params,
}: PageProps<"/[locale]/news/[slug]">) {
  const { locale, slug } = await params;
  const article = getNewsBySlug(slug);
  if (!article) notFound();

  const t = await getTranslations("NewsPage");
  const copy = getNewsLocaleCopy(article, locale);
  const shareUrl = newsArticleAbsoluteUrl(locale, article.slug);
  const firms = getAllFirms();
  const related = article.relatedFirmSlugs
    .map((firmSlug) => firms.find((firm) => firm.slug === firmSlug))
    .filter((firm): firm is NonNullable<typeof firm> => firm != null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: copy.title,
    description: copy.summary,
    inLanguage: locale in localeMeta ? localeMeta[locale as keyof typeof localeMeta].bcp47 : locale,
    datePublished: article.publishedAt,
    dateModified: article.scrapedAt,
    url: shareUrl,
    publisher: {
      "@type": "Organization",
      name: "PropFXLab",
    },
    citation: article.sourceUrl,
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="text-sm">
        <Link href="/news" className="text-zinc-500 transition-colors hover:text-emerald-300">
          {t("backToNews")}
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-sm text-zinc-500">
        {t("sourceLabel")}:{" "}
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-emerald-300/90 underline-offset-4 hover:underline"
        >
          {article.sourceName}
        </a>
        <span className="mx-2 text-zinc-700">·</span>
        {t("publishedLabel")}: {formatNewsPublished(article.publishedAt, locale)}
      </p>

      <div className="mt-8 space-y-4 text-sm leading-7 text-zinc-300">
        {paragraphs(copy.content).map((paragraph, index) => (
          <p key={`${article.slug}-${index}`}>{paragraph}</p>
        ))}
      </div>

      <NewsShareButtons url={shareUrl} title={copy.title} />

      {related.length > 0 ? (
        <section className="mt-10 border-t border-white/10 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t("relatedFirms")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((firm) => (
              <li key={firm.slug}>
                <Link
                  href={`/firm/${firm.slug}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
                >
                  {firm.basic.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-xs leading-5 text-zinc-600">{t("disclaimer")}</p>

      {/* Subscribe strip */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="mb-1 inline-block rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          ⚡ Stay Ahead
        </div>
        <h2 className="mt-2 text-base font-bold text-white">
          Get exclusive prop firm discounts &amp; alerts
        </h2>
        <p className="mt-1 mb-4 text-xs text-zinc-400">
          Flash sales, promo codes &amp; payout insights — straight to your inbox.
        </p>
        <SubscribeForm locale={locale} />
      </div>
    </article>
  );
}
