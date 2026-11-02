import { site } from "@/lib/site";

const ASPECT = 775.5 / 304.3; // the official logo, trimmed to its drawn area (public/brand/logo-for-*-bg.svg)

/** The official Bayline logo (swirl + wordmark): blue on the dark site, or all midnight with `onLight` (print). */
export function Logo({ onLight = false, height = 40 }: { onLight?: boolean; height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onLight ? "/brand/logo-for-light-bg.svg" : "/brand/logo-for-dark-bg.svg"}
      alt={site.name}
      width={Math.round(height * ASPECT)}
      height={height}
      className="block"
      style={{ height, width: "auto" }}
    />
  );
}
