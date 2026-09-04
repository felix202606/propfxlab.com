"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PromoCodeCopy({ code }: { code: string }) {
  const t = useTranslations("FirmCard");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {t("promoLabel")}
      </span>
      <code className="flex-1 font-mono text-sm font-semibold tracking-wide text-emerald-300">
        {code}
      </code>
      <button
        type="button"
        onClick={copyCode}
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
