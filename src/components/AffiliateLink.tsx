"use client";

import type { ReactNode } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { getOutHref, OUT_LINK_REL } from "@/lib/offers";

export function trackAffiliateClick(slug: string, source = "cta") {
  try {
    sendGAEvent("event", "affiliate_click", {
      firm_slug: slug,
      link_url: getOutHref(slug),
      link_source: source,
    });
  } catch {
    // Never block navigation if GA is still loading.
  }
}

export function AffiliateLink({
  slug,
  className,
  children,
  source = "cta",
}: {
  slug: string;
  className?: string;
  children: ReactNode;
  source?: string;
}) {
  return (
    <a
      href={getOutHref(slug)}
      target="_blank"
      rel={OUT_LINK_REL}
      className={className ? `${className} cursor-pointer` : "cursor-pointer"}
      onClick={() => trackAffiliateClick(slug, source)}
    >
      {children}
    </a>
  );
}
