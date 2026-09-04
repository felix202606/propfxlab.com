"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PromoCodeCopy({
  code,
  href,
}: {
  code: string;
  href: string;
}) {
  const t = useTranslations("FirmCard");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    // Open synchronously so the click still counts as a user gesture for popups.
    window.open(href, "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {t("promoLabel")}
      </span>
      <code className="flex-1 font-mono text-sm font-semibold tracking-wide text-emerald-300">
        {code}
      </code>
      <button
        type="button"
        onClick={copyCode}
        aria-live="polite"
        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all ${
          copied
            ? "border border-emerald-400/40 bg-emerald-400/20 text-emerald-200"
            : "border border-white/10 bg-zinc-950/80 text-zinc-200 hover:border-emerald-400/40 hover:text-emerald-200"
        }`}
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
