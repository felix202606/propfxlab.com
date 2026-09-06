"use client";

import { useTranslations } from "next-intl";

export type FirmTab = "top10" | "all" | "closed";

type FirmTabsProps = {
  active: FirmTab;
  onChange: (tab: FirmTab) => void;
  allCount: number;
  closedCount: number;
};

export function FirmTabs({ active, onChange, allCount, closedCount }: FirmTabsProps) {
  const t = useTranslations("HomePage");

  const tabs: Array<{ id: FirmTab; label: string; warn?: boolean }> = [
    { id: "top10", label: t("tabTop10") },
    { id: "all", label: `${t("tabAllFirms")} (${allCount})` },
    { id: "closed", label: `${t("tabClosedWarning")} (${closedCount})`, warn: true },
  ];

  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        const activeClasses = tab.warn
          ? "border-red-400/40 bg-red-400/15 text-red-200 shadow-[0_0_20px_-8px_rgba(248,113,113,0.9)]"
          : "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgba(52,211,153,0.9)]";

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              selected
                ? activeClasses
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
