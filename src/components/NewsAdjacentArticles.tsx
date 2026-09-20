import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getNewsLocaleCopy, type NewsArticle } from "@/lib/schema";

type NewsAdjacentArticlesProps = {
  locale: string;
  previous: NewsArticle | undefined;
  next: NewsArticle | undefined;
};

export async function NewsAdjacentArticles({
  locale,
  previous,
  next,
}: NewsAdjacentArticlesProps) {
  if (!previous && !next) return null;

  const t = await getTranslations("NewsPage");
  const previousCopy = previous ? getNewsLocaleCopy(previous, locale) : null;
  const nextCopy = next ? getNewsLocaleCopy(next, locale) : null;

  return (
    <nav
      aria-label={t("adjacentNav")}
      className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2"
    >
      {previous && previousCopy ? (
        <Link
          href={`/news/${previous.slug}`}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-emerald-400/30"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("previousArticle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-200 group-hover:text-emerald-200">
            {previousCopy.title}
          </p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {next && nextCopy ? (
        <Link
          href={`/news/${next.slug}`}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right transition-colors hover:border-emerald-400/30"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("nextArticle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-200 group-hover:text-emerald-200">
            {nextCopy.title}
          </p>
        </Link>
      ) : null}
    </nav>
  );
}
