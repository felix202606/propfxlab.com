import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { NewsIndex, type NewsListItem } from "@/components/NewsIndex";
import { getAllNews } from "@/lib/data";
import { getNewsCategories } from "@/lib/news-categories";
import { getNewsLocaleCopy } from "@/lib/schema";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function NewsIndexPage({
  params,
}: PageProps<"/[locale]/news">) {
  const { locale } = await params;
  const t = await getTranslations("NewsPage");
  const articles: NewsListItem[] = getAllNews().map((article) => {
    const copy = getNewsLocaleCopy(article, locale);
    return {
      slug: article.slug,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      tags: article.tags,
      title: copy.title,
      summary: copy.summary,
      categories: getNewsCategories(article),
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t("subtitle")}</p>

      <Suspense
        fallback={
          <div className="mt-8 space-y-4">
            <div className="h-11 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
            <div className="h-10 animate-pulse rounded-full border border-white/10 bg-white/[0.03]" />
            <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          </div>
        }
      >
        <NewsIndex articles={articles} locale={locale} />
      </Suspense>
    </main>
  );
}
