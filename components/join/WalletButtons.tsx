"use client";

import { useSyncExternalStore } from "react";

type Props = { slug: string; apple: boolean; google: boolean; compact?: boolean };

type Platform = "apple" | "google" | "other";
const detect = (): Platform =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    ? "apple"
    : /Android/.test(navigator.userAgent)
      ? "google"
      : "other";

/**
 * "Add to Apple Wallet" / "Add to Google Wallet". Shows the one that fits the phone, with the other
 * as a small link. Badge artwork lives in public/wallet/ (see docs/SETUP.md for the official files).
 */
export function WalletButtons({ slug, apple, google, compact = false }: Props) {
  const platform = useSyncExternalStore(() => () => {}, detect, () => "other" as Platform);
  if (!apple && !google) return null;

  const appleHref = `/api/wallet/apple/pass?venue=${encodeURIComponent(slug)}`;
  const googleHref = `/api/wallet/google/save?venue=${encodeURIComponent(slug)}`;

  // Best match for this phone first; on a computer (or if that wallet isn't available) show both.
  const enabled = (["apple", "google"] as const).filter((p) => (p === "apple" ? apple : google));
  const primary = platform !== "other" && enabled.includes(platform) ? platform : null;
  const badges = primary ? [primary] : enabled;
  const other = primary ? enabled.find((p) => p !== primary) : undefined;

  const Badge = ({ which }: { which: "apple" | "google" }) => (
    <a href={which === "apple" ? appleHref : googleHref} className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/wallet/add-to-${which}-wallet.svg`}
        alt={which === "apple" ? "Add to Apple Wallet" : "Add to Google Wallet"}
        className="h-12 w-auto"
      />
    </a>
  );

  return (
    <div className={`flex flex-col items-center gap-3 ${compact ? "mt-6" : "mt-8"}`}>
      {!compact && <p className="text-sm text-muted">Keep your card on your phone. It updates every time you tap.</p>}
      <div className="flex flex-wrap justify-center gap-3">
        {badges.map((b) => (
          <Badge key={b} which={b} />
        ))}
      </div>
      {other && (
        <a href={other === "apple" ? appleHref : googleHref} className="text-xs text-muted underline underline-offset-2">
          {other === "apple" ? "Using iPhone? Add to Apple Wallet" : "Using Android? Add to Google Wallet"}
        </a>
      )}
    </div>
  );
}
