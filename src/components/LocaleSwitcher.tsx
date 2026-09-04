"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeMeta, routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-1.5 text-sm text-zinc-400">
      <span className="sr-only">{t("languageLabel")}</span>
      <select
        aria-label={t("languageLabel")}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as (typeof routing.locales)[number];
          router.replace(pathname, { locale: nextLocale });
        }}
        className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 outline-none transition-colors hover:border-emerald-400/30 hover:bg-white/10 focus:border-emerald-400/40"
      >
        {routing.locales.map((code) => (
          <option key={code} value={code} className="bg-zinc-950 text-zinc-100">
            {localeMeta[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}
