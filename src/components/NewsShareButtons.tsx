"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type NewsShareButtonsProps = {
  url: string;
  title: string;
};

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M14.2 22v-8.15h2.74l.41-3.18h-3.15V8.6c0-.92.25-1.55 1.58-1.55H17.4V4.14C16.82 4.05 15.9 4 14.94 4c-2.04 0-3.44 1.24-3.44 3.53v1.98H8.9v3.18h2.6V22h2.7Z" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M21.5 4.4 18.9 20c-.2 1-1.2 1.2-2 .8l-5.4-4.1-2.6 2.5c-.3.3-.8.1-.9-.3l-.5-4.7L19 6.4c.4-.4-.1-.6-.6-.3L6.4 13.2 2 11.8c-1-.3-1-1 .2-1.5L20.2 3.6c.8-.3 1.5.2 1.3.8Z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.2 3H21l-6.5 7.4L22 21h-6.2l-4.4-5.8L6.2 21H3.4l7-8L2.2 3h6.3l4 5.3L18.2 3Zm-1.1 16.2h1.7L7 4.7H5.2l11.9 14.5Z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10.7 5.23" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.43a5 5 0 0 0 7.07 7.07l.71-.71" />
    </svg>
  );
}

const btnClass =
  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors";

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
          className={`${btnClass} border-[#1877F2]/25 bg-[#1877F2]/10 text-[#7ab3ff] hover:border-[#1877F2]/50 hover:bg-[#1877F2]/20`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-white">
            <IconFacebook />
          </span>
          Facebook
        </a>
        <a
          href={telegram}
          target="_blank"
          rel="noreferrer noopener"
          className={`${btnClass} border-[#2AABEE]/25 bg-[#2AABEE]/10 text-[#7fd0f5] hover:border-[#2AABEE]/50 hover:bg-[#2AABEE]/20`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2AABEE] text-white">
            <IconTelegram />
          </span>
          Telegram
        </a>
        <a
          href={x}
          target="_blank"
          rel="noreferrer noopener"
          className={`${btnClass} border-white/15 bg-white/[0.06] text-zinc-100 hover:border-white/30 hover:bg-white/10`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/20">
            <IconX />
          </span>
          X
        </a>
        <button
          type="button"
          onClick={copyLink}
          aria-live="polite"
          className={`${btnClass} border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:border-emerald-400/40 hover:bg-emerald-400/15`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-zinc-950">
            <IconLink />
          </span>
          {copied ? t("linkCopied") : t("copyLink")}
        </button>
      </div>
    </div>
  );
}
