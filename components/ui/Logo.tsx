import { site } from "@/lib/site";

/**
 * The Bayline swirl and wordmark. `inverted` is for dark backgrounds (lime mark, light text).
 * When the official logo files arrive, swap this for a single <img> of website-logo-for-*-bg.svg.
 */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inverted ? "/brand/bayline-mark-for-dark-bg.svg" : "/brand/bayline-mark-for-light-bg.svg"}
        alt=""
        width={30}
        height={26}
        className="h-[26px] w-auto"
      />
      <span className="font-display text-[24px] font-bold leading-none tracking-wide">{site.name}</span>
    </span>
  );
}
