import Image from "next/image";

type SiteLogoProps = {
  size?: number;
  priority?: boolean;
};

export function SiteLogo({ size = 32, priority = false }: SiteLogoProps) {
  const frame =
    "absolute inset-0 rounded-lg object-contain";
  const box = { width: size, height: size };

  return (
    <span className="relative inline-block shrink-0" style={box}>
      <Image
        src="/logo-on-dark.png"
        alt="PropFXLab"
        width={size}
        height={size}
        priority={priority}
        className={`${frame} hidden dark:block`}
      />
      <Image
        src="/logo-on-light.png"
        alt=""
        width={size}
        height={size}
        priority={priority}
        className={`${frame} block dark:hidden`}
        aria-hidden
      />
    </span>
  );
}
