"use client";

import { useTranslations } from "next-intl";
import { HERO_ACCOUNT_SIZES } from "@/lib/offers";

export type ViewMode = "card" | "table";
export type SortMode = "takeHome" | "highestRated";

function formatAccountOption(amount: number): string {
  if (amount >= 1000) return `$${amount / 1000}k`;
  return `$${amount}`;
}

type FirmFilterBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  accountSize: number;
  onAccountSizeChange: (value: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
};

export function FirmFilterBar({
  searchQuery,
  onSearchChange,
  accountSize,
  onAccountSizeChange,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
}: FirmFilterBarProps) {
  const t = useTranslations("HomePage");

  return (
    <div className="sticky top-[92px] z-40 border-b border-white/10 bg-[#09090b]/90 backdrop-blur-xl sm:top-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block flex-1 sm:max-w-xs">
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/40"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-xs font-medium uppercase tracking-wider text-zinc-500 sm:inline">
              {t("accountSizeLabel")}
            </span>
            <select
              value={accountSize}
              onChange={(event) => onAccountSizeChange(Number(event.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-400/40"
            >
              {HERO_ACCOUNT_SIZES.map((size) => (
                <option key={size} value={size} className="bg-zinc-900">
                  {formatAccountOption(size)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-xs font-medium uppercase tracking-wider text-zinc-500 sm:inline">
              {t("sortLabel")}
            </span>
            <select
              value={sortMode}
              onChange={(event) =>
                onSortModeChange(event.target.value as SortMode)
              }
              aria-label={t("sortLabel")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-400/40"
            >
              <option value="takeHome" className="bg-zinc-900">
                {t("sortTakeHome")}
              </option>
              <option value="highestRated" className="bg-zinc-900">
                {t("sortHighestRated")}
              </option>
            </select>
          </label>

          <div
            role="group"
            aria-label={t("viewModeLabel")}
            className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1"
          >
            <button
              type="button"
              onClick={() => onViewModeChange("card")}
              aria-pressed={viewMode === "card"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "card"
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("viewModeCard")}
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              aria-pressed={viewMode === "table"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("viewModeTable")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
