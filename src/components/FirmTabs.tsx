"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type FirmTab = "top10" | "all";

type FirmTabsProps = {
  active: FirmTab;
  onChange: (tab: FirmTab) => void;
  allCount: number;
  defunctCount: number;
};

export function FirmTabs({
  active,
  onChange,
  allCount,
  defunctCount,
}: FirmTabsProps) {
  const t = useTranslations("HomePage");

  const tabs: Array<{ id: FirmTab; label: string }> = [
    { id: "top10", label: t("tabTop10") },
    { id: "all", label: `${t("tabAllFirms")} (${allCount})` },
  ];

  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              selected
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgba(52,211,153,0.9)]"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
      <Link
        href="/defunct"
        className="rounded-full border border-red-400/25 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 transition-all hover:border-red-400/40 hover:bg-red-400/15"
      >
        {t("tabClosedWarning")} ({defunctCount})
      </Link>
    </div>
  );
}
