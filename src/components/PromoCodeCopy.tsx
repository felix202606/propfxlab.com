"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PromoCodeCopy({
  code,
  href,
  compact = false,
  copyOnly = false,
  discountLabel,
}: {
  code: string;
  href: string;
  compact?: boolean;
  copyOnly?: boolean;
  discountLabel?: string;
}) {
  const t = useTranslations("FirmCard");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!copyOnly) {
      // Open synchronously so the click still counts as a user gesture for popups.
      window.open(href, "_blank", "noopener,noreferrer");
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (copyOnly) {
    return (
      <button
        type="button"
        onClick={copyCode}
        aria-live="polite"
        title={copied ? t("copied") : t("copyCodeHint", { code })}
        className="inline-flex w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-fuchsia-500/35 bg-gradient-to-r from-violet-600/25 via-fuchsia-600/15 to-rose-600/25 px-1.5 py-1.5 text-center transition-all hover:border-fuchsia-400/65 hover:brightness-110"
      >
        {discountLabel ? (
          <span className="shrink-0 text-[10px] font-bold tracking-wide text-rose-200">
            {discountLabel}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-semibold tracking-[0.14em] text-fuchsia-300/70 uppercase">
            {t("promoLabel")}
          </span>
        )}
        <code className="min-w-0 max-w-full truncate font-mono text-[13px] font-semibold leading-tight text-fuchsia-100">
          {copied ? t("copied") : code}
        </code>
      </button>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 border border-dashed border-fuchsia-500/30 bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-rose-600/15 shadow-[inset_0_0_0_1px_rgba(217,70,239,0.08)] ${
        compact ? "rounded-md px-1.5 py-0.5" : "rounded-xl px-3 py-2"
      }`}
    >
      {compact ? null : (
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-fuchsia-300/70">
          {t("promoLabel")}
        </span>
      )}
      <code
        className={`min-w-0 truncate font-mono font-semibold tracking-wide text-fuchsia-100 ${
          compact ? "text-[11px]" : "flex-1 text-sm"
        }`}
      >
        {code}
      </code>
      <button
        type="button"
        onClick={copyCode}
        aria-live="polite"
        className={`shrink-0 rounded-md text-[10px] font-semibold tracking-wide transition-all ${
          compact ? "px-1.5 py-px" : "px-2 py-0.5"
        } ${
          copied
            ? "border border-fuchsia-400/40 bg-fuchsia-400/20 text-fuchsia-100"
            : "border border-slate-800 bg-[#0B0F19] text-slate-200 hover:border-fuchsia-400/40 hover:text-fuchsia-100"
        }`}
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
