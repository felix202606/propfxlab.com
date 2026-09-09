"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeMeta, routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

export function LocaleSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = localeMeta[locale] ?? localeMeta.en;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectLocale(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("languageLabel")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm outline-none transition-all ${
          open
            ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-100 shadow-[0_0_20px_-8px_rgba(99,102,241,0.9)]"
            : "border-slate-800 bg-[#0B0F19] text-slate-200 hover:border-indigo-400/40 hover:bg-indigo-500/10"
        }`}
      >
        <span aria-hidden className="text-[15px] leading-none">
          {current.flag}
        </span>
        <span className="font-medium">{current.label}</span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180 text-indigo-300" : ""}`}
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ul
        id={listId}
        role="listbox"
        aria-label={t("languageLabel")}
        className={`absolute right-0 z-50 mt-2 min-w-[11.5rem] origin-top-right rounded-2xl border border-slate-800 bg-gradient-to-b from-[#12182a] to-[#0B0F19] p-1 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.45)] transition-all ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {routing.locales.map((code) => {
          const meta = localeMeta[code];
          const selected = code === locale;
          return (
            <li key={code} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => selectLocale(code)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "bg-indigo-500/20 text-indigo-50"
                    : "text-slate-200 hover:bg-indigo-500/10 hover:text-white"
                }`}
              >
                <span aria-hidden className="text-[16px] leading-none">
                  {meta.flag}
                </span>
                <span className="flex-1 font-medium">{meta.label}</span>
                {selected ? (
                  <span aria-hidden className="text-indigo-300">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
