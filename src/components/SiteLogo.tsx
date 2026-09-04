import Image from "next/image";

type SiteLogoProps = {
  size?: number;
  priority?: boolean;
};

export function SiteLogo({ size = 32, priority = false }: SiteLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="PropFXLab"
      width={size}
      height={size}
      priority={priority}
      className="shrink-0 rounded-lg border border-white/10 bg-[#09090b] object-cover shadow-[0_0_20px_-6px_rgba(52,211,153,0.7)]"
      style={{ width: size, height: size }}
    />
  );
}
