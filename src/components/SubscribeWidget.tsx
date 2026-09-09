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
  // mounted guards against SSR mismatch
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Auto-open after 4s only if user hasn't dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  // Don't render anything until client-side (avoids hydration flash)
  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:right-5">
      {/* ── Floating card ── */}
      <div
        ref={cardRef}
        aria-hidden={!open}
        className={[
          // Shape: very rounded "squircle-ish" card with glowing border
          "w-[min(260px,calc(100vw-2.5rem))] overflow-hidden",
          "rounded-[22px] border border-indigo-500/25",
          "bg-gradient-to-b from-[#12182a]/95 to-[#0B0F19]/95 backdrop-blur-sm",
          "shadow-[0_8px_40px_-8px_rgba(99,102,241,0.25),0_4px_24px_rgba(0,0,0,0.6)]",
          "transition-all duration-300 ease-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0",
        ].join(" ")}
      >
        {/* Indigo accent bar at top */}
        <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

        {/* Header */}
        <div className="relative px-4 pt-4 pb-3">
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-indigo-500/15 hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
            {t.badge}
          </span>
          <h3 className="mt-2 text-[13px] font-bold leading-snug text-white pr-4">{t.heading}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{t.subheading}</p>
        </div>

        {/* Form */}
        <div className="px-4 pb-4">
          <SubscribeForm locale={locale} t={t} />
        </div>
      </div>

      {/* ── Trigger button: glowing circle with bell ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.button}
        title={t.button}
        className={[
          "group relative flex h-12 w-12 items-center justify-center rounded-full",
          "bg-gradient-to-br from-indigo-500 to-violet-600",
          "shadow-[0_4px_20px_rgba(99,102,241,0.45)]",
          "transition-all duration-200 hover:scale-110 hover:shadow-[0_4px_28px_rgba(139,92,246,0.65)]",
          "active:scale-95",
        ].join(" ")}
      >
        {/* Pulse ring — only when card is closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400/30" />
        )}

        {/* Bell icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative z-10 transition-transform group-hover:rotate-12"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    </div>
  );
}
