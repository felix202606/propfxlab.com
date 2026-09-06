"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { NewsPagination } from "@/components/NewsPagination";
import {
  NEWS_CATEGORIES,
  articleMatchesCategory,
  type NewsCategory,
} from "@/lib/news-categories";
import { formatNewsPublished } from "@/lib/news-format";
import { clampPage, parsePageParam } from "@/lib/pagination";

export const NEWS_PAGE_SIZE = 8;

export type NewsListItem = {
  slug: string;
  sourceName: string;
  publishedAt: string;
  tags: string[];
  title: string;
  summary: string;
  categories: Exclude<NewsCategory, "all">[];
};

const CATEGORY_LABEL_KEY: Record<NewsCategory, string> = {
  all: "categoryAll",
  "rule-changes": "categoryRuleChanges",
  "payout-alerts": "categoryPayoutAlerts",
  "firm-news": "categoryFirmNews",
};

function isNewsCategory(value: string | null): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory);
}

export function NewsIndex({
  articles,
  locale,
}: {
  articles: NewsListItem[];
  locale: string;
}) {
  const t = useTranslations("NewsPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? "",
  );

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const categoryParam = searchParams.get("category");
  const category: NewsCategory = isNewsCategory(categoryParam)
    ? categoryParam
    : "all";
  const urlPage = parsePageParam(searchParams.get("page") ?? undefined);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return articles.filter((article) => {
      if (!articleMatchesCategory(article.categories, category)) return false;
      if (!query) return true;
      return (
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query)
      );
    });
  }, [articles, category, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / NEWS_PAGE_SIZE));
  const page = clampPage(urlPage, totalPages);
  const start = (page - 1) * NEWS_PAGE_SIZE;
  const visible = filtered.slice(start, start + NEWS_PAGE_SIZE);

  function replaceQuery(next: { page?: number; category?: NewsCategory; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextPage = next.page ?? page;
    const nextCategory = next.category ?? category;
    const nextQuery = next.q ?? searchQuery;

    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));

    if (nextCategory === "all") params.delete("category");
    else params.set("category", nextCategory);

    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="mt-8 space-y-4">
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value;
              setSearchQuery(value);
              replaceQuery({ q: value, page: 1 });
            }}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/40"
          />
        </label>

        <div
          role="tablist"
          aria-label={t("categoryLabel")}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {NEWS_CATEGORIES.map((id) => {
            const selected = id === category;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => replaceQuery({ category: id, page: 1 })}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                  selected
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgba(52,211,153,0.9)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {t(CATEGORY_LABEL_KEY[id])}
              </button>
            );
          })}
        </div>
      </div>

      {articles.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-zinc-500">
          {t("empty")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-zinc-500">
          {t("noResults")}
        </p>
      ) : (
        <>
          <p className="mt-6 text-xs tracking-wide text-zinc-500">
            {t("showingCount", {
              shown: visible.length,
              total: filtered.length,
              page,
              totalPages,
            })}
          </p>

          <ul className="mt-4 space-y-4">
            {visible.map((article) => (
              <li key={article.slug}>
                <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-colors hover:border-emerald-400/30">
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
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {article.summary}
                  </p>
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
            ))}
          </ul>

          <NewsPagination
            page={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => replaceQuery({ page: nextPage })}
          />
        </>
      )}
    </>
  );
}
