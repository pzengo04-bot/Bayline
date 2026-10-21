"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Progress } from "@/lib/rewards";
import { progressValue, type PassOffer, type PassVenue } from "@/lib/wallet/pass-content";
import { passModel, type PassModel } from "@/lib/wallet/pass-model";
import { STRIP_VERSION } from "@/lib/wallet/strip";

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
  venue: PassVenue & { type?: string | null; stamp_icon?: string | null };
  offer: PassOffer;
};

const SAMPLE_SERIAL = "5028d3c8-1004-4451-80d5-360c7f24f151";

/** The real pass model for the sample customer: the same fields, back and strip customers get. */
function model(look: PassLook, platform: "apple" | "google"): PassModel {
  return passModel(
    {
      customer_id: "sample",
      serial: SAMPLE_SERIAL,
      first_name: look.firstName,
      apple_auth_token: "",
      updated_at: "",
      venue: {
        ...look.venue,
        id: "sample",
        slug: "sample",
        name: look.venueName,
        logo_url: look.logoUrl,
        logo_text: look.logoText,
        card_bg: look.bg,
        card_fg: look.fg,
        card_accent: look.accent,
        pass_message: look.venue.pass_message ?? null,
      },
      progress: look.progress,
      offer: look.offer ? { ...look.offer, sent_at: "" } : null,
    },
    { hasLogo: Boolean(look.logoUrl), platform },
  );
}

/** The member QR code, small and square like the real pass. */
function MemberQr({ m, size = 84 }: { m: PassModel; size?: number }) {
  const qr = QRCode.create(m.barcode.message, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const rects = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(y, x)) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  return (
    <div className="rounded-md bg-white px-2 pb-1 pt-2 text-center">
      <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} aria-hidden="true" className="mx-auto block" shapeRendering="crispEdges">
        <g fill="#000">{rects}</g>
      </svg>
      <p className="mt-0.5 text-[9px] font-medium text-black/75">{m.barcode.altText}</p>
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

/** The strip image, drawn by the server with the same renderer and data as real passes. */
function Strip({ m, google = false }: { m: PassModel; google?: boolean }) {
  const s = m.strip;
  const payload = JSON.stringify({ p: s.progress, o: s.offerShort, bg: s.bg, fg: s.fg, ac: s.accent, ic: s.icon, g: google ? 1 : 0 });
  const src = useDebounced(`/api/wallet/image/preview?v=${STRIP_VERSION}&s=${base64url(payload)}`, 250);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="block w-full" style={{ aspectRatio: google ? "1032 / 336" : "375 / 144", background: s.bg }} />
  );
}

function base64url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function BackList({ m, platform }: { m: PassModel; platform: "apple" | "google" }) {
  return (
    <dl className="divide-y divide-black/10">
      {m.back.map((s) => (
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
  const m = model(look, "apple");
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-center text-[13px] font-semibold">Pass Details</p>
        <BackList m={m} platform="apple" />
      </div>
    );
  }
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex h-12 items-center gap-2 px-3">
        {look.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={look.logoUrl} alt="" className="h-[26px] max-w-[7rem] shrink-0 object-contain" />
        )}
        {m.logoText && <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{m.logoText}</span>}
        {m.header.map((f) => (
          <div key={f.key} className="ml-auto shrink-0 text-right leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{f.label}</p>
            <p className="text-[14px]">{f.value}</p>
          </div>
        ))}
      </div>
      <Strip m={m} />
      <div className="flex gap-3 px-3 pt-2.5">
        {m.fields.map((f, i) => (
          <div key={f.key} className={`min-w-0 flex-1 ${i === 1 ? "text-right" : ""}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{f.label}</p>
            <p className={`text-[14px] leading-tight ${m.fields.length === 1 ? "" : "line-clamp-2"}`}>{f.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center px-3 pb-4 pt-4">
        <MemberQr m={m} />
      </div>
    </div>
  );
}

/** Google Wallet loyalty card, front or details, as it renders on Android. */
export function GooglePassPreview({ look, side = "front" }: { look: PassLook; side?: "front" | "back" }) {
  const m = model(look, "google");
  const p = look.progress;
  const offer = m.fields.find((f) => f.key === "offer");
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-[13px] font-medium">Details</p>
        {offer && (
          <div className="border-b border-black/10 px-4 py-2.5">
            <p className="text-[10px] font-semibold text-black/50">Offer</p>
            <p className="text-[13px] leading-snug">{offer.value}</p>
          </div>
        )}
        <BackList m={m} platform="google" />
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
      <p className="px-4 pt-0.5 text-xs opacity-75">{look.firstName}</p>
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <div>
          <p className="text-[11px] opacity-75">{p.reward_type === "stamps" ? "Visits" : "Points"}</p>
          <p className="text-lg font-medium">{progressValue(p)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] opacity-75">Reward</p>
          <p className="text-sm leading-snug">{m.fields[0].value}</p>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-4 pt-4">
        <MemberQr m={m} />
      </div>
      <Strip m={m} google />
    </div>
  );
}
