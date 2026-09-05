import { getTranslations } from "next-intl/server";
import { ComparisonsGrid } from "@/components/ComparisonsGrid";
import { FaqAccordion } from "@/components/FaqAccordion";
import { HomeMarketplace } from "@/components/HomeMarketplace";
import { SubscribeForm } from "@/components/SubscribeForm";
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

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  let firms: ReturnType<typeof getAllFirms> = [];
  try {
    firms = getAllFirms();
  } catch (err) {
    console.error("[home] getAllFirms failed, rendering empty marketplace:", err);
  }

  let faqs: Array<HomeFaq & { id: string; slug: string }> = [];
  let faqTitle: string | undefined;
  try {
    const t = await getTranslations("HomePage");
    faqTitle = t("faqTitle");
    faqs = toHomeFaqs(t.raw("faqs")).map((item, index) => ({
      id: `home-faq-${index + 1}`,
      question: item.question,
      answer: item.answer,
      slug: `home-faq-${index + 1}`,
    }));
  } catch (err) {
    console.error("[home] translations failed, rendering page without FAQ copy:", err);
  }

  return (
    <main className="relative flex-1">
      <HomeMarketplace firms={firms} />
      <TrustGrid />
      <ComparisonsGrid firms={firms} />
      {faqs.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-4 pb-20">
          <FaqAccordion faqs={faqs} heading={faqTitle} />
        </div>
      ) : null}

      {/* Subscribe banner */}
      <section className="mx-auto w-full max-w-2xl px-4 pb-20">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8">
          <div className="mb-1 inline-block rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            ⚡ Exclusive Alerts
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
            Get the best prop firm discounts first
          </h2>
          <p className="mt-2 mb-5 text-sm leading-relaxed text-zinc-400">
            Flash sales, promo codes &amp; payout insights — straight to your inbox.
          </p>
          <SubscribeForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
