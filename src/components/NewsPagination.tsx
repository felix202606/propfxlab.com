"use client";

import { useTranslations } from "next-intl";
import { visiblePageItems } from "@/lib/pagination";

type NewsPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function NewsPagination({
  page,
  totalPages,
  onPageChange,
}: NewsPaginationProps) {
  const t = useTranslations("NewsPage");

  if (totalPages <= 1) return null;

  const items = visiblePageItems(page, totalPages);
  const buttonClass =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors";

  return (
    <nav
      aria-label={t("paginationNav")}
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={`${buttonClass} ${
          page <= 1
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
            : "border-white/10 bg-white/5 text-zinc-200 hover:border-emerald-400/30 hover:text-emerald-200"
        }`}
      >
        {t("previous")}
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 font-mono text-sm text-zinc-600"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${buttonClass} ${
              item === page
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgba(52,211,153,0.9)]"
                : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-zinc-100"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={`${buttonClass} ${
          page >= totalPages
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
            : "border-white/10 bg-white/5 text-zinc-200 hover:border-emerald-400/30 hover:text-emerald-200"
        }`}
      >
        {t("next")}
      </button>
    </nav>
  );
}
