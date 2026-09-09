"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type FirmTab = "top" | "forex" | "futures" | "all";

type FirmTabsProps = {
  active: FirmTab;
  onChange: (tab: FirmTab) => void;
  counts: Record<FirmTab, number>;
  defunctCount: number;
};

export function FirmTabs({
  active,
  onChange,
  counts,
  defunctCount,
}: FirmTabsProps) {
  const t = useTranslations("HomePage");

  const tabs: Array<{ id: FirmTab; label: string }> = [
    { id: "top", label: t("tabTop", { count: counts.top }) },
    { id: "forex", label: t("tabForex", { count: counts.forex }) },
    { id: "futures", label: t("tabFutures", { count: counts.futures }) },
    { id: "all", label: t("tabAll", { count: counts.all }) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-1 lg:grid-cols-4"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold tracking-tight transition-all ${
                selected
                  ? "bg-indigo-500/20 text-indigo-100 shadow-[0_0_20px_-8px_rgba(99,102,241,0.9)] ring-1 ring-indigo-400/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <Link
        href="/defunct"
        className="self-start rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-200 transition-all hover:border-red-400/40 hover:bg-red-400/15"
      >
        {t("tabClosedWarning")} ({defunctCount})
      </Link>
    </div>
  );
}
