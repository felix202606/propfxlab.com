import type { Metadata } from "next";
import { localeMeta, routing } from "@/i18n/routing";

export const SITE_URL = "https://www.propfxlab.com";
export const SITE_NAME = "PropFXLab";

/** Build absolute URL for a locale + pathname ("" or "/foo"). Default locale is unprefixed. */
export function absoluteLocaleUrl(locale: string, pathname = ""): string {
  const suffix = pathname === "/" ? "" : pathname;
  if (locale === routing.defaultLocale) {
    return `${SITE_URL}${suffix || "/"}`;
  }
  return `${SITE_URL}/${locale}${suffix}`;
}

/** hreflang map for Metadata.alternates.languages (BCP-47 keys + x-default). */
export function languageAlternates(pathname = ""): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(routing.defaultLocale, pathname),
  };
  for (const locale of routing.locales) {
    languages[localeMeta[locale].bcp47] = absoluteLocaleUrl(locale, pathname);
  }
  return languages;
}

export function pageAlternates(locale: string, pathname = ""): Metadata["alternates"] {
  return {
    canonical: absoluteLocaleUrl(locale, pathname),
    languages: languageAlternates(pathname),
  };
}

export function pageOpenGraph(opts: {
  locale: string;
  pathname?: string;
  title: string;
  description: string;
}): Metadata["openGraph"] {
  const url = absoluteLocaleUrl(opts.locale, opts.pathname ?? "");
  return {
    type: "website",
    url,
    siteName: SITE_NAME,
    title: opts.title,
    description: opts.description,
    locale: localeMeta[opts.locale as keyof typeof localeMeta]?.bcp47 ?? "en",
  };
}

export function pageTwitter(opts: {
  title: string;
  description: string;
}): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: opts.title,
    description: opts.description,
  };
}

/** Homepage Organization + WebSite JSON-LD. */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-192.png`,
      email: "contact@propfxlab.com",
      description:
        "Independent prop firm payout intelligence and take-home calculator. Not a prop firm or broker.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description:
        "Compare prop firm take-home payouts, safety status and withdrawal speed with a transparent calculator.",
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: `${SITE_URL}/`,
      },
      inLanguage: "en",
    },
  ];
}

/** Normalize legacy /firms/... FAQ paths to live /firm/... routes and absolutize. */
export function absoluteFirmFaqUrl(canonicalPath: string): string {
  const path = canonicalPath.startsWith("/firms/")
    ? `/firm/${canonicalPath.slice("/firms/".length)}`
    : canonicalPath.startsWith("/")
      ? canonicalPath
      : `/${canonicalPath}`;
  return `${SITE_URL}${path}`;
}
