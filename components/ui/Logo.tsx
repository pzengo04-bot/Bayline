import { site } from "@/lib/site";

const ASPECT = 775.5 / 304.3; // the official logo, trimmed to its drawn area (public/brand/logo-for-*-bg.svg)

/** The official Bayline logo (swirl + wordmark). `inverted` is the version for dark backgrounds. */
export function Logo({ inverted = false, height = 40 }: { inverted?: boolean; height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inverted ? "/brand/logo-for-dark-bg.svg" : "/brand/logo-for-light-bg.svg"}
      alt={site.name}
      width={Math.round(height * ASPECT)}
      height={height}
      className="block"
      style={{ height, width: "auto" }}
    />
  );
}
