import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllNews } from "@/lib/data";
import { formatNewsPublished } from "@/lib/news-format";
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
  const articles = getAllNews();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t("subtitle")}</p>

      {articles.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-zinc-500">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {articles.map((article) => {
            const copy = getNewsLocaleCopy(article, locale);
            return (
              <li key={article.slug}>
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-emerald-400/30">
                  <p className="text-xs tracking-wide text-zinc-500">
                    {article.sourceName}
                    <span className="mx-2 text-zinc-700">·</span>
                    {formatNewsPublished(article.publishedAt, locale)}
                  </p>
                  <h2 className="mt-2 text-lg font-medium tracking-tight">
                    <Link
                      href={`/news/${article.slug}`}
                      className="transition-colors hover:text-emerald-300"
                    >
                      {copy.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{copy.summary}</p>
                  {article.tags.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
