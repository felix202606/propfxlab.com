"use client";

import { useEffect, useRef, useState } from "react";
import { SubscribeForm, type SubscribeTranslations } from "./SubscribeForm";

interface SubscribeWidgetProps {
  locale: string;
  t: SubscribeTranslations & {
    badge: string;
    heading: string;
    subheading: string;
  };
}

const STORAGE_KEY = "propfxlab_subscribe_dismissed";

export function SubscribeWidget({ locale, t }: SubscribeWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-show after 6 seconds (only if not dismissed before)
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
      setOpen(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  function toggle() {
    setVisible(true);
    setOpen((v) => !v);
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      {/* Floating card */}
      <div
        ref={cardRef}
        className={[
          "w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 transition-all duration-300",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
      >
        {/* Card header */}
        <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 px-5 pt-5 pb-4">
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {t.badge}
          </span>
          <h3 className="mt-2 text-sm font-bold leading-snug text-white">{t.heading}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{t.subheading}</p>
        </div>

        {/* Form */}
        <div className="px-5 pb-5 pt-3">
          <SubscribeForm locale={locale} t={t} />
        </div>
      </div>

      {/* Toggle pill button */}
      {visible && (
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-emerald-400 shadow-lg shadow-black/40 transition-colors hover:bg-zinc-800 hover:text-emerald-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {t.button}
        </button>
      )}
    </div>
  );
}
