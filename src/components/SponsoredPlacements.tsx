"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AffiliateLink } from "@/components/AffiliateLink";
import { FirmLogo } from "@/components/FirmLogo";
import { PromoCodeCopy } from "@/components/PromoCodeCopy";
import { getOutHref, hasWindow, isWithinWindow, type PublicOffer } from "@/lib/outbound";
import type { PropFirm } from "@/lib/schema";
import { useNow } from "@/lib/use-now";

export type SponsoredFirm = {
  slug: string;
  name: string;
  logo: PropFirm["basic"]["logo"];
  offer?: PublicOffer;
  startsAt?: string;
  endsAt?: string;
};

/** Scheduled slots stay hidden in cached HTML and appear once the browser knows the time. */
function useVisibleSlots(slots: SponsoredFirm[]): SponsoredFirm[] {
  const now = useNow();
  return slots.filter((slot) =>
    hasWindow(slot) ? now !== null && isWithinWindow(slot, now) : true,
  );
}

function SponsoredBadge() {
  const t = useTranslations("HomePage");
  return (
    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
      {t("sponsoredBadge")}
    </span>
  );
}

function SponsoredCta({ firm, source }: { firm: SponsoredFirm; source: string }) {
  const tCard = useTranslations("FirmCard");
  const className =
    "inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)] transition-all hover:brightness-110";
  if (!firm.offer) {
    return (
      <Link href={`/firm/${firm.slug}`} className={className}>
        {tCard("readReview")}
      </Link>
    );
  }
  return (
    <AffiliateLink slug={firm.slug} source={source} className={className}>
      {tCard("claimCta")}
    </AffiliateLink>
  );
}

export function SponsoredTop3({ slots }: { slots: SponsoredFirm[] }) {
  const t = useTranslations("HomePage");
  const visible = useVisibleSlots(slots);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="sponsored-top3" className="mb-6">
      <div className="flex items-center gap-2">
        <h2 id="sponsored-top3" className="text-sm font-semibold text-slate-200">
          {t("sponsoredTitle")}
        </h2>
        <SponsoredBadge />
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {visible.map((firm) => (
          <li
            key={firm.slug}
            className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-gradient-to-b from-[#16140f] to-[#0B0F19] p-4"
          >
            <div className="flex items-center gap-2.5">
              <FirmLogo name={firm.name} src={firm.logo.src} alt={firm.logo.alt} size="sm" />
              <Link
                href={`/firm/${firm.slug}`}
                className="min-w-0 truncate text-[15px] font-semibold text-slate-50 hover:text-indigo-200"
              >
                {firm.name}
              </Link>
            </div>
            {firm.offer?.code ? (
              <PromoCodeCopy
                copyOnly
                code={firm.offer.code}
                href={getOutHref(firm.slug)}
                discountLabel={firm.offer.discountLabel}
                promotion={firm.offer.promotion}
              />
            ) : null}
            <SponsoredCta firm={firm} source="sponsored_top3" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SponsoredBanner({ slot }: { slot: SponsoredFirm }) {
  const t = useTranslations("HomePage");
  const [visible] = useVisibleSlots([slot]);
  if (!visible) return null;

  return (
    <div className="border-b border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] via-[#0B0F19] to-fuchsia-500/[0.08]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5">
        <SponsoredBadge />
        <FirmLogo name={visible.name} src={visible.logo.src} alt={visible.logo.alt} size="sm" />
        <p className="min-w-0 flex-1 text-sm font-medium text-slate-100">
          {t("sponsoredBannerText", { firm: visible.name })}
          {visible.offer?.discountLabel ? (
            <span className="ml-2 font-semibold text-amber-200">{visible.offer.discountLabel}</span>
          ) : null}
        </p>
        {visible.offer?.code ? (
          <div className="w-28">
            <PromoCodeCopy
              copyOnly
              code={visible.offer.code}
              href={getOutHref(visible.slug)}
              discountLabel={visible.offer.discountLabel}
              promotion={visible.offer.promotion}
            />
          </div>
        ) : null}
        <SponsoredCta firm={visible} source="sponsored_banner" />
      </div>
    </div>
  );
}
