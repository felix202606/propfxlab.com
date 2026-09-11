import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComparisonsGrid } from "@/components/ComparisonsGrid";
import { HomeMarketplace } from "@/components/HomeMarketplace";
import { SiteFaqExplorer, type SiteFaqListItem } from "@/components/SiteFaqExplorer";
import { TrustGrid } from "@/components/TrustGrid";
import { getAllDefunctFirms, getAllFirms, getAllSiteFaqs } from "@/lib/data";
import { getSiteFaqLocaleCopy } from "@/lib/schema";
import {
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
  siteJsonLd,
} from "@/lib/seo";


export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("titleDefault");
  const description = t("description");
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, ""),
    openGraph: pageOpenGraph({ locale, pathname: "", title, description }),
    twitter: pageTwitter({ title, description }),
  };
}

export default async function Home({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  let firms: ReturnType<typeof getAllFirms> = [];
  let defunctCount = 0;
  try {
    firms = getAllFirms().filter((firm) => firm.status === "active");
    defunctCount = getAllDefunctFirms().length;
  } catch (err) {
    console.error("[home] getAllFirms failed, rendering empty marketplace:", err);
  }

  let faqs: SiteFaqListItem[] = [];
  let faqTitle: string | undefined;
  try {
    const t = await getTranslations("HomePage");
    faqTitle = t("faqTitle");
    faqs = getAllSiteFaqs().map((faq) => {
      const copy = getSiteFaqLocaleCopy(faq, locale);
      return {
        id: faq.id,
        category: faq.category,
        question: copy.question,
        answer: copy.answer,
        slug: `faq-${faq.id}`,
      };
    });
  } catch (err) {
    console.error("[home] translations failed, rendering page without FAQ copy:", err);
  }

  const jsonLd = siteJsonLd();

  return (
    <main className="relative flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeMarketplace firms={firms} defunctCount={defunctCount} />
      <TrustGrid />
      <ComparisonsGrid firms={firms} />
      {faqs.length > 0 ? (
        <section className="border-b border-slate-800 bg-[#0B0F19]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <SiteFaqExplorer faqs={faqs} heading={faqTitle} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
