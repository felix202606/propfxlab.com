import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SubscribeWidget } from "@/components/SubscribeWidget";
import { getAllFirms } from "@/lib/data";
import { localeMeta, routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  try {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) return {};

    const t = await getTranslations({ locale, namespace: "Metadata" });
    return {
      title: {
        default: t("titleDefault"),
        template: "%s · PropFXLab",
      },
      description: t("description"),
      appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Prop Calc",
      },
      icons: {
        icon: [
          {
            url: "/logo-on-dark.png",
            type: "image/png",
            media: "(prefers-color-scheme: dark)",
          },
          {
            url: "/logo-on-light.png",
            type: "image/png",
            media: "(prefers-color-scheme: light)",
          },
        ],
        apple: "/icon-192.png",
      },
    };
  } catch (err) {
    console.error("[layout] generateMetadata failed:", err);
    return {};
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  let firms: { slug: string; name: string }[] = [];
  try {
    firms = getAllFirms().map((firm) => ({
      slug: firm.slug,
      name: firm.basic.name,
    }));
  } catch (err) {
    console.error("[layout] getAllFirms failed, rendering footer without firm links:", err);
  }

  let subT = {
    badge: "⚡ Exclusive Alerts",
    heading: "Get prop firm discounts first",
    subheading: "Flash sales, promo codes & payout insights — straight to your inbox.",
    placeholder: "your@email.com",
    button: "Get Alerts",
    sending: "Sending…",
    successMsg: "Subscribed! Check your inbox for exclusive discounts.",
    noSpam: "0 Spam. Unsubscribe at any time.",
    networkError: "Network error. Please check your connection.",
    genericError: "Something went wrong. Please try again.",
  };
  try {
    const tSub = await getTranslations({ locale, namespace: "Subscribe" });
    subT = {
      badge: tSub("badge"),
      heading: tSub("heading"),
      subheading: tSub("subheading"),
      placeholder: tSub("placeholder"),
      button: tSub("button"),
      sending: tSub("sending"),
      successMsg: tSub("successMsg"),
      noSpam: tSub("noSpam"),
      networkError: tSub("networkError"),
      genericError: tSub("genericError"),
    };
  } catch (err) {
    console.error("[layout] Subscribe translations failed, using English fallback:", err);
  }

  return (
    <html
      lang={localeMeta[locale].bcp47}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#09090b] font-sans text-zinc-50">
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter firms={firms} />
          <SubscribeWidget locale={locale} t={subT} />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
