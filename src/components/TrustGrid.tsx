import { useTranslations } from "next-intl";

const TRUST_ITEMS = [
  {
    key: "calc" as const,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M8 8h8M8 12h5M8 16h3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    glow: "from-emerald-500/20",
  },
  {
    key: "risk" as const,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M12 3 3.5 19h17L12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 10v4M12 16.5v.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    glow: "from-amber-500/20",
  },
  {
    key: "speed" as const,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M13 3 5 14h7l-1 7 8-11h-7l1-7Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    glow: "from-cyan-500/20",
  },
];

export function TrustGrid() {
  const t = useTranslations("HomePage");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
          {t("trustTitle")}
        </span>
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-zinc-400">
        {t("trustSubtitle")}
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {TRUST_ITEMS.map((item) => (
          <li
            key={item.key}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            <div
              className={`pointer-events-none absolute -top-16 right-0 h-32 w-32 bg-gradient-to-b ${item.glow} to-transparent blur-2xl`}
            />
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
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
