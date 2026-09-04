import { useTranslations } from "next-intl";

export type AccordionFaq = {
  id: string;
  question: string;
  answer: string;
  slug?: string;
};

type FaqAccordionProps = {
  faqs: AccordionFaq[];
  heading?: string;
};

/**
 * 手风琴 FAQ：用原生 <details>/<summary> 实现零 JS 展开收起，
 * 同时保留 itemProp 微数据，与 toFaqJsonLd() 生成的 JSON-LD 互为补充。
 */
export function FaqAccordion({ faqs, heading }: FaqAccordionProps) {
  const t = useTranslations("FirmPage");
  const title = heading ?? t("faqHeading");

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <h2
        id="faq-heading"
        className="text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        <span className="bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        {faqs.map((item) => (
          <details
            key={item.id}
            id={item.slug ?? item.id}
            className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-100 marker:content-none">
              <span itemProp="name">{item.question}</span>
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-base text-zinc-400 transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div
              className="mt-3 pr-8 text-sm leading-7 text-zinc-400"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
