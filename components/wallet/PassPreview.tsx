"use client";

import { useEffect, useState } from "react";
import type { Progress } from "@/lib/rewards";
import { code128c } from "@/lib/wallet/code128";
import { backSections, cardFront, memberDigits, memberNumber, offerShort, progressValue, type PassOffer, type PassVenue } from "@/lib/wallet/pass-content";

export type PassLook = {
  venueName: string;
  logoUrl: string | null;
  logoText: string | null;
  bg: string;
  fg: string;
  accent: string;
  firstName: string;
  /** Includes the milestone, if any. */
  progress: Progress;
  venue: PassVenue;
  offer: PassOffer;
};

const SAMPLE_SERIAL = "5028d3c8-1004-4451-80d5-360c7f24f151";

/** The member barcode (Code 128 of the member number), as the real pass shows it. */
function Barcode({ height = 46 }: { height?: number }) {
  const bars = code128c(memberDigits(SAMPLE_SERIAL));
  const total = bars.reduce((a, b) => a + b, 0);
  const starts = bars.map((_, i) => bars.slice(0, i).reduce((a, b) => a + b, 0));
  const rects = bars.map((w, i) => (i % 2 === 0 ? <rect key={i} x={starts[i]} y={0} width={w} height={height} /> : null));
  return (
    <div className="rounded-md bg-white px-3 pb-1 pt-2.5 text-center">
      <svg width={total * 1.25} height={height * 0.8} viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" aria-hidden="true" className="mx-auto block">
        <g fill="#000">{rects}</g>
      </svg>
      <p className="mt-0.5 text-[10px] font-medium text-black/75">Member {memberNumber(SAMPLE_SERIAL)}</p>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** The strip image, rendered by the server with the same code as real passes. */
function Strip({ look, google = false }: { look: PassLook; google?: boolean }) {
  const payload = JSON.stringify({
    p: look.progress,
    o: look.offer ? offerShort(look.offer) : null,
    bg: look.bg,
    fg: look.fg,
    ac: look.accent,
    g: google ? 1 : 0,
  });
  const src = useDebounced(`/api/wallet/image/preview?s=${base64url(payload)}`, 250);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="block w-full" style={{ aspectRatio: google ? "1032 / 336" : "375 / 144", background: look.bg }} />
  );
}

function base64url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function BackList({ look, platform }: { look: PassLook; platform: "apple" | "google" }) {
  const member = { name: look.firstName, number: memberNumber(SAMPLE_SERIAL) };
  return (
    <dl className="divide-y divide-black/10">
      {backSections(look.venue, look.progress, look.offer, platform, undefined, member).map((s) => (
        <div key={s.key} className="px-4 py-2.5">
          {s.label && <dt className={`text-[10px] font-semibold ${platform === "apple" ? "uppercase tracking-wide" : ""} text-black/50`}>{s.label}</dt>}
          <dd className={`text-[13px] leading-snug ${s.key === "powered" ? "text-black/50" : "text-black"}`}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Apple Wallet store card, front or Pass Details, as it renders on an iPhone. */
export function ApplePassPreview({ look, side = "front" }: { look: PassLook; side?: "front" | "back" }) {
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-center text-[13px] font-semibold">Pass Details</p>
        <BackList look={look} platform="apple" />
      </div>
    );
  }
  const logoText = look.logoText || (!look.logoUrl ? look.venueName : null);
  const fields = cardFront(look.venue, look.progress, look.offer ? { short: offerShort(look.offer) } : null).fields;
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex h-12 items-center gap-1.5 px-3">
        {look.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={look.logoUrl} alt="" className="h-7 max-w-[7rem] object-contain" />
        )}
        {logoText && <span className="truncate text-[16px] font-semibold">{logoText}</span>}
      </div>
      <Strip look={look} />
      <div className="flex gap-3 px-3 pt-2.5">
        {fields.map((f, i) => (
          <div key={f.key} className={`min-w-0 flex-1 ${i === 1 ? "text-right" : ""}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{f.label}</p>
            <p className={`text-[14px] leading-tight ${fields.length === 1 ? "" : "line-clamp-2"}`}>{f.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center px-3 pb-4 pt-4">
        <Barcode />
      </div>
    </div>
  );
}

/** Google Wallet loyalty card, front or details, as it renders on Android. */
export function GooglePassPreview({ look, side = "front" }: { look: PassLook; side?: "front" | "back" }) {
  const p = look.progress;
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-[13px] font-medium">Details</p>
        {look.offer && (
          <div className="border-b border-black/10 px-4 py-2.5">
            <p className="text-[10px] font-semibold text-black/50">Offer</p>
            <p className="text-[13px] leading-snug">{offerShort(look.offer)}</p>
          </div>
        )}
        <BackList look={look} platform="google" />
      </div>
    );
  }
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[20px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: look.bg, boxShadow: "0 0 0 1px rgba(255,255,255,0.25)" }}>
          {look.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.logoUrl} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <span className="text-xs font-bold">{look.venueName.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
        <span className="truncate text-sm font-medium">{look.venueName}</span>
      </div>
      <p className="px-4 pt-3 text-[22px] font-normal leading-tight">{look.venueName} Rewards</p>
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <div>
          <p className="text-[11px] opacity-75">{p.reward_type === "stamps" ? "Visits" : "Points"}</p>
          <p className="text-lg font-medium">{progressValue(p)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] opacity-75">Reward</p>
          <p className="text-sm leading-snug">{cardFront(look.venue, p).fields[0].value}</p>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-4 pt-4">
        <Barcode />
      </div>
      <Strip look={look} google />
    </div>
  );
}
