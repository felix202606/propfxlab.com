import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getFirmOffer } from "@/lib/offers";

const ALTERNATIVES = [
  { slug: "ftmo", displayName: "FTMO" },
  { slug: "fundednext", displayName: "FundedNext" },
] as const;

type SaferAlternativesProps = {
  variant?: "banner" | "compact";
};

export function SaferAlternatives({ variant = "banner" }: SaferAlternativesProps) {
  const t = useTranslations("DefunctPage");
  const tCard = useTranslations("FirmCard");

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
        <p className="text-xs leading-5 text-emerald-100/80">
          {t("alternativesInlineText")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALTERNATIVES.map(({ slug, displayName }) => {
            const offer = getFirmOffer(slug, `https://${slug}.com`);
            return (
              <a
                key={slug}
                href={offer.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-[0_0_16px_-4px_rgba(52,211,153,0.9)] transition-all hover:brightness-110"
              >
                {displayName}
                <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] tracking-wide">
                  {offer.code}
                </code>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-cyan-950/30 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
            <span aria-hidden>✅</span> {t("alternativesBadge")}
          </p>
          <p className="mt-2.5 text-sm leading-6 text-zinc-200 sm:text-base">
            {t("alternativesHeadline")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALTERNATIVES.map(({ slug, displayName }) => {
            const offer = getFirmOffer(slug, `https://${slug}.com`);
            return (
              <div
                key={slug}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <Link
                  href={`/firm/${slug}`}
                  className="text-sm font-semibold text-zinc-100 transition-colors hover:text-emerald-300"
                >
                  {displayName}
                </Link>
                <a
                  href={offer.href}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-[0_0_16px_-4px_rgba(52,211,153,0.9)] transition-all hover:brightness-110"
                >
                  {tCard("claimCta")}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] tracking-wide">
                    {offer.code}
                  </code>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
