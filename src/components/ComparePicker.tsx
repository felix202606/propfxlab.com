"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buildCompareSlug } from "@/lib/compare";

export type CompareFirmOption = {
  slug: string;
  name: string;
};

export function ComparePicker({ firms }: { firms: CompareFirmOption[] }) {
  const t = useTranslations("HomePage");
  const router = useRouter();
  const [leftSlug, setLeftSlug] = useState("");
  const [rightSlug, setRightSlug] = useState("");

  const canCompare = Boolean(leftSlug && rightSlug && leftSlug !== rightSlug);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCompare) return;
    router.push(`/compare/${buildCompareSlug(leftSlug, rightSlug)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {t("selectFirmA")}
          </span>
          <select
            value={leftSlug}
            onChange={(event) => setLeftSlug(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-400/40"
          >
            <option value="" className="bg-zinc-900">
              {t("selectFirmA")}
            </option>
            {firms.map((firm) => (
              <option key={firm.slug} value={firm.slug} className="bg-zinc-900">
                {firm.name}
              </option>
            ))}
          </select>
        </label>

        <p className="hidden pb-2.5 text-center font-mono text-[11px] tracking-widest text-zinc-500 sm:block">
          {t("vs")}
        </p>

        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {t("selectFirmB")}
          </span>
          <select
            value={rightSlug}
            onChange={(event) => setRightSlug(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-400/40"
          >
            <option value="" className="bg-zinc-900">
              {t("selectFirmB")}
            </option>
            {firms.map((firm) => (
              <option key={firm.slug} value={firm.slug} className="bg-zinc-900">
                {firm.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!canCompare}
          className="rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-300 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_22px_-4px_rgba(34,211,238,0.85)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {t("compareNow")}
        </button>
      </div>
      {leftSlug && rightSlug && leftSlug === rightSlug ? (
        <p className="mt-3 text-xs text-amber-300">{t("sameFirmError")}</p>
      ) : null}
    </form>
  );
}
