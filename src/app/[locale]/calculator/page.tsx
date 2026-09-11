import type { Metadata } from "next";
import {
  pageAlternates,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { PayoutCalculator } from "@/components/PayoutCalculator";
import { getAllFirms } from "@/lib/data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/calculator">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CalculatorPage" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/calculator"),
    openGraph: pageOpenGraph({
      locale,
      pathname: "/calculator",
      title,
      description,
    }),
    twitter: pageTwitter({ title, description }),
  };
}

export default async function CalculatorPage() {
  const t = await getTranslations("CalculatorPage");
  const firms = getAllFirms();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <div className="mt-8">
        <PayoutCalculator firms={firms} />
      </div>
    </main>
  );
}
