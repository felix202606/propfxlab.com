import { getTranslations } from "next-intl/server";
import { ComparisonsGrid } from "@/components/ComparisonsGrid";
import { FaqAccordion } from "@/components/FaqAccordion";
import { HomeMarketplace } from "@/components/HomeMarketplace";
import { TrustGrid } from "@/components/TrustGrid";
import { getAllFirms } from "@/lib/data";

type HomeFaq = { question: string; answer: string };

function toHomeFaqs(raw: unknown): HomeFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is HomeFaq =>
      !!item &&
      typeof item === "object" &&
      typeof (item as HomeFaq).question === "string" &&
      typeof (item as HomeFaq).answer === "string",
  );
}

export default async function Home() {
  const t = await getTranslations("HomePage");
  const firms = getAllFirms();
  const faqs = toHomeFaqs(t.raw("faqs")).map((item, index) => ({
    id: `home-faq-${index + 1}`,
    question: item.question,
    answer: item.answer,
    slug: `home-faq-${index + 1}`,
  }));

  return (
    <main className="relative flex-1">
      <HomeMarketplace firms={firms} />
      <TrustGrid />
      <ComparisonsGrid firms={firms} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-20">
        <FaqAccordion faqs={faqs} heading={t("faqTitle")} />
      </div>
    </main>
  );
}
