"use client";

import { useState } from "react";

export interface SubscribeTranslations {
  placeholder: string;
  button: string;
  sending: string;
  successMsg: string;
  noSpam: string;
  networkError: string;
  genericError: string;
}

interface SubscribeFormProps {
  locale?: string;
  t: SubscribeTranslations;
}

export function SubscribeForm({ locale = "en", t }: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? t.genericError);
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg(t.networkError);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">
          ✓
        </span>
        <p className="text-sm font-medium text-emerald-300">{t.successMsg}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder={t.placeholder}
            disabled={status === "loading"}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || !email.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t.sending}
              </>
            ) : (
              t.button
            )}
          </button>
        </div>

        {status === "error" && errorMsg && (
          <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
        )}
      </form>

      <p className="mt-2 text-xs text-zinc-500">{t.noSpam}</p>
    </div>
  );
}
