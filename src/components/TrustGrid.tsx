import { useTranslations } from "next-intl";

const TRUST_ITEMS = [
  {
    key: "discount" as const,
    glow: "from-emerald-500/25",
    hover:
      "hover:border-emerald-400/40 hover:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.55)]",
    iconClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M3.6 12.4 12.4 3.6A2 2 0 0 1 13.8 3H20a1 1 0 0 1 1 1v6.2a2 2 0 0 1-.6 1.4l-8.8 8.8a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16.25" cy="7.75" r="1.25" fill="currentColor" />
        <path
          d="M8 14.5 13.5 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "free" as const,
    glow: "from-cyan-500/25",
    hover:
      "hover:border-cyan-400/40 hover:shadow-[0_16px_40px_-12px_rgba(34,211,238,0.5)]",
    iconClass: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M8.5 12.5 7 14a3.2 3.2 0 0 1-4.5 0 3.2 3.2 0 0 1 0-4.5L7 5a3.2 3.2 0 0 1 4.5 0l.8.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 11.5 17 10a3.2 3.2 0 0 1 4.5 0 3.2 3.2 0 0 1 0 4.5L17 19a3.2 3.2 0 0 1-4.5 0l-.8-.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.2 14.8c1.3 1.4 3.4 1.5 4.8.2.2-.2.4-.4.6-.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "audit" as const,
    glow: "from-sky-500/25",
    hover:
      "hover:border-sky-400/40 hover:shadow-[0_16px_40px_-12px_rgba(56,189,248,0.5)]",
    iconClass: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M12 3 5 6.2v5.5c0 4.3 2.9 7.4 7 8.8 4.1-1.4 7-4.5 7-8.8V6.2L12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m9 12 2.1 2.1L15.5 9.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function TrustGrid() {
  const t = useTranslations("HomePage");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8" id="how-it-works">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        <span className="bg-gradient-to-r from-white via-emerald-100 to-cyan-300 bg-clip-text text-transparent">
          {t("trustTitle")}
        </span>
      </h2>
      <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-6 text-zinc-400">
        {t("trustSubtitle")}
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {TRUST_ITEMS.map((item) => (
          <li
            key={item.key}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-1 ${item.hover}`}
          >
            <div
              className={`pointer-events-none absolute -top-16 right-0 h-32 w-32 bg-gradient-to-b ${item.glow} to-transparent blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
            />
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-[radial-gradient(closest-side,rgba(16,185,129,0.14),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border ${item.iconClass}`}
            >
              {item.icon}
            </span>
            <h3 className="relative mt-4 text-base font-semibold tracking-tight text-zinc-50">
              {t(`trust.${item.key}.title`)}
            </h3>
            <p className="relative mt-2 text-sm leading-6 text-zinc-400">
              {t(`trust.${item.key}.body`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
