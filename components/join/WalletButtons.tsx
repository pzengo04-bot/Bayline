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
  const primary = platform === "google" ? "google" : platform === "apple" ? "apple" : null;

  const AppleBadge = (
    <a href={appleHref} className="inline-block" aria-label="Add to Apple Wallet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wallet/add-to-apple-wallet.svg" alt="Add to Apple Wallet" className="h-12 w-auto" />
    </a>
  );
  const GoogleBadge = (
    <a href={googleHref} className="inline-block" aria-label="Add to Google Wallet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wallet/add-to-google-wallet.svg" alt="Add to Google Wallet" className="h-12 w-auto" />
    </a>
  );

  return (
    <div className={`flex flex-col items-center gap-3 ${compact ? "mt-6" : "mt-8"}`}>
      {!compact && <p className="text-sm text-muted">Keep your card on your phone. It updates every time you tap.</p>}
      {primary === "apple" && apple ? AppleBadge : primary === "google" && google ? GoogleBadge : null}
      {primary === null && (
        <div className="flex flex-wrap justify-center gap-3">
          {apple && AppleBadge}
          {google && GoogleBadge}
        </div>
      )}
      {primary === "apple" && google && (
        <a href={googleHref} className="text-xs text-muted underline underline-offset-2">
          Using Android? Add to Google Wallet
        </a>
      )}
      {primary === "google" && apple && (
        <a href={appleHref} className="text-xs text-muted underline underline-offset-2">
          Using iPhone? Add to Apple Wallet
        </a>
      )}
      {primary === "apple" && !apple && google && GoogleBadge}
      {primary === "google" && !google && apple && AppleBadge}
    </div>
  );
}
