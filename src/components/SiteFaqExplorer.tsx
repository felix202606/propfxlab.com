"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FaqAccordion, type AccordionFaq } from "@/components/FaqAccordion";
import type { SiteFaqCategory } from "@/lib/schema";

const TABS: Array<{ id: Exclude<SiteFaqCategory, "general">; labelKey: string }> = [
  { id: "safety", labelKey: "categorySafety" },
  { id: "payout", labelKey: "categoryPayout" },
  { id: "rules", labelKey: "categoryRules" },
];

export type SiteFaqListItem = AccordionFaq & {
  category: SiteFaqCategory;
};

export function SiteFaqExplorer({
  faqs,
  heading,
}: {
  faqs: SiteFaqListItem[];
  heading?: string;
}) {
  const t = useTranslations("FaqPage");
  const [category, setCategory] = useState<(typeof TABS)[number]["id"]>("safety");

  const visible = useMemo(
    () =>
      faqs.filter((item) =>
        category === "safety"
          ? item.category === "safety" || item.category === "general"
          : item.category === category,
      ),
    [category, faqs],
  );

  return (
    <div className={heading ? "scroll-mt-24" : "mt-8"} id={heading ? "faq" : undefined}>
      {heading ? (
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            {heading}
          </span>
        </h2>
      ) : null}
      <div
        role="tablist"
        aria-label={t("categoryLabel")}
        className={`${heading ? "mt-6 " : ""}-mx-1 flex gap-2 overflow-x-auto px-1 pb-1`}
      >
        {TABS.map((tab) => {
          const selected = tab.id === category;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(tab.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                selected
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 shadow-[0_0_20px_-8px_rgba(99,102,241,0.9)]"
                  : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="mt-6" key={category}>
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-950/50 px-5 py-8 text-sm text-slate-500">
            {t("empty")}
          </p>
        ) : (
          <FaqAccordion faqs={visible} hideHeading openFirst />
        )}
      </div>
    </div>
  );
}
