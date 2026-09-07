import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canonicalCompareSlug, COMPARE_EXCLUDED_SLUGS } from "@/lib/compare";
import { getAllFirms } from "@/lib/data";

type CompareIndexParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: CompareIndexParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CompareIndex" });
  const pairCount = compareableFirms().length;
  const comparisons = (pairCount * (pairCount - 1)) / 2;
  return {
    title: t("metaTitle"),
    description: t("metaDescription", { count: comparisons }),
  };
}

export default async function CompareIndexPage({
  params,
}: CompareIndexParams) {
  const { locale } = await params;
  const t = await getTranslations("CompareIndex");
  const firms = compareableFirms();
  const comparisons = (firms.length * (firms.length - 1)) / 2;
  const localePrefix = locale === "en" ? "" : `/${locale}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("metaTitle"),
    description: t("metaDescription", { count: comparisons }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: comparisons,
      itemListElement: firms.flatMap((left, leftIndex) =>
        firms.slice(leftIndex + 1).map((right, offset) => ({
          "@type": "ListItem",
          position:
            (leftIndex * (2 * firms.length - leftIndex - 1)) / 2 + offset + 1,
          name: `${left.basic.name} vs ${right.basic.name}`,
          url: `https://www.propfxlab.com${localePrefix}/compare/${canonicalCompareSlug(left.slug, right.slug)}`,
        })),
      ),
    },
  };

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {t("subtitle", { count: comparisons, firms: firms.length })}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {firms.map((firm) => (
          <section key={firm.slug} id={firm.slug}>
            <h2 className="text-lg font-semibold text-zinc-100">
              <Link
                href={`/firm/${firm.slug}`}
                className="transition-colors hover:text-cyan-300"
              >
                {firm.basic.name}
              </Link>
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {firms
                .filter((other) => other.slug !== firm.slug)
                .map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/compare/${canonicalCompareSlug(firm.slug, other.slug)}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white"
                    >
                      {t("vsName", { name: other.basic.name })}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

function compareableFirms() {
  return getAllFirms().filter((firm) => !COMPARE_EXCLUDED_SLUGS.has(firm.slug));
}
