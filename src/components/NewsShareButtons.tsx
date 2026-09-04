"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type NewsShareButtonsProps = {
  url: string;
  title: string;
};

const btnClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-300";

export function NewsShareButtons({ url, title }: NewsShareButtonsProps) {
  const t = useTranslations("NewsPage");
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const telegram = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
  const x = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {t("shareLabel")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={facebook}
          target="_blank"
          rel="noreferrer noopener"
          className={btnClass}
        >
          Facebook
        </a>
        <a
          href={telegram}
          target="_blank"
          rel="noreferrer noopener"
          className={btnClass}
        >
          Telegram
        </a>
        <a href={x} target="_blank" rel="noreferrer noopener" className={btnClass}>
          X
        </a>
        <button type="button" onClick={copyLink} aria-live="polite" className={btnClass}>
          {copied ? t("linkCopied") : t("copyLink")}
        </button>
      </div>
    </div>
  );
}
