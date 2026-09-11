import type { Metadata } from "next";
import {
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { SiteFaqExplorer, type SiteFaqListItem } from "@/components/SiteFaqExplorer";
import { getAllSiteFaqs } from "@/lib/data";
import { getSiteFaqLocaleCopy, toSiteFaqJsonLd } from "@/lib/schema";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/faq"),
    openGraph: pageOpenGraph({
      locale,
      pathname: "/faq",
      title,
      description,
    }),
    twitter: pageTwitter({ title, description }),
  };
}

export default async function FaqPage({
  params,
}: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  const t = await getTranslations("FaqPage");
  const faqs: SiteFaqListItem[] = getAllSiteFaqs().map((faq) => {
    const copy = getSiteFaqLocaleCopy(faq, locale);
    return {
      id: faq.id,
      category: faq.category,
      question: copy.question,
      answer: copy.answer,
      slug: `faq-${faq.id}`,
    };
  });
  const jsonLd = toSiteFaqJsonLd(faqs);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent">
          {t("title")}
        </span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
        {t("subtitle")}
      </p>

      <SiteFaqExplorer faqs={faqs} />
    </main>
  );
}
