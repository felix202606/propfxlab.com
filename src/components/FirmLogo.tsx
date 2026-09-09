"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { firmInitials } from "@/lib/logo";

const SIZE_PX = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 44,
} as const;

type FirmLogoProps = {
  name: string;
  src: string;
  alt: string;
  size?: keyof typeof SIZE_PX;
};

function InitialsBadge({
  name,
  px,
}: {
  name: string;
  px: number;
}) {
  const typeClass =
    px <= 28 ? "text-[9px]" : px <= 32 ? "text-[10px]" : px <= 40 ? "text-xs" : "text-[13px]";

  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: px, height: px }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-indigo-400/45 bg-gradient-to-br from-[#12182a] via-[#0B0F19] to-black font-mono font-semibold tracking-wide text-indigo-200 shadow-[0_0_18px_-6px_rgba(99,102,241,0.85)] ${typeClass}`}
    >
      {firmInitials(name)}
    </span>
  );
}

export function FirmLogo({ name, src, alt, size = "lg" }: FirmLogoProps) {
  const px = SIZE_PX[size];
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return <InitialsBadge name={name} px={px} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      unoptimized
      onError={() => setFailed(true)}
      className="shrink-0 rounded-xl border border-slate-800 bg-white object-contain p-0.5"
      style={{ width: px, height: px }}
    />
  );
}
