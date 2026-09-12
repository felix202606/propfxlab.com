import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  absoluteLocaleUrl,
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/data-audit-log">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DataAuditLogPage" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/data-audit-log"),
    openGraph: pageOpenGraph({
      locale,
      pathname: "/data-audit-log",
      title,
      description,
    }),
    twitter: pageTwitter({ title, description }),
  };
}

export default async function DataAuditLogPage({
  params,
}: PageProps<"/[locale]/data-audit-log">) {
  const { locale } = await params;
  const t = await getTranslations("DataAuditLogPage");
  const pageUrl = absoluteLocaleUrl(locale, "/data-audit-log");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("metaTitle"),
    description: t("metaDescription"),
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    about: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      email: "contact@propfxlab.com",
      description: t("orgDescription"),
    },
  };

  const sections = [
    { title: t("sourcesTitle"), body: t("sourcesBody") },
    { title: t("frequencyTitle"), body: t("frequencyBody") },
    { title: t("changelogTitle"), body: t("changelogBody") },
    { title: t("verifyTitle"), body: t("verifyBody") },
    { title: t("contactTitle"), body: t("contactBody") },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
          {t("title")}
        </span>
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
        {t("subtitle")}
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 sm:p-6"
          >
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">
              {section.title}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/about"
          className="inline-flex rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:text-white"
        >
          {t("ctaAbout")}
        </Link>
        <Link
          href="/faq"
          className="inline-flex rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110"
        >
          {t("ctaFaq")}
        </Link>
      </div>
    </main>
  );
}
