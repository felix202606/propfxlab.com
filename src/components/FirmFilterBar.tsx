"use client";

import { useTranslations } from "next-intl";
import type { FirmHighlight } from "@/lib/schema";

export type SortMode = "highestRated" | "takeHome" | "years";

type FirmFilterBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  highlights: FirmHighlight[];
  onHighlightsChange: (value: FirmHighlight[]) => void;
};

const QUICK_FILTERS: Array<{
  id: FirmHighlight;
  labelKey: "filterLicensed" | "filterInstantPayout" | "filterLowEntry";
}> = [
  { id: "licensed_broker", labelKey: "filterLicensed" },
  { id: "instant_payout", labelKey: "filterInstantPayout" },
  { id: "low_entry", labelKey: "filterLowEntry" },
];

export function FirmFilterBar({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortModeChange,
  highlights,
  onHighlightsChange,
}: FirmFilterBarProps) {
  const t = useTranslations("HomePage");

  function toggleHighlight(id: FirmHighlight) {
    if (highlights.includes(id)) {
      onHighlightsChange(highlights.filter((item) => item !== id));
      return;
    }
    onHighlightsChange([...highlights, id]);
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <label className="relative block min-w-0 flex-1 lg:max-w-sm">
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

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((filter) => {
          const selected = highlights.includes(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleHighlight(filter.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all ${
                selected
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              {t(filter.labelKey)}
            </button>
          );
        })}

        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:inline">
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
            <option value="highestRated" className="bg-zinc-900">
              {t("sortHighestRated")}
            </option>
            <option value="takeHome" className="bg-zinc-900">
              {t("sortTakeHome")}
            </option>
            <option value="years" className="bg-zinc-900">
              {t("sortYears")}
            </option>
          </select>
        </label>
      </div>
    </div>
  );
}
