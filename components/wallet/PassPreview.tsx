import type { Progress } from "@/lib/rewards";
import { backSections, memberNumber, progressValue, rewardValue, type PassOffer, type PassVenue } from "@/lib/wallet/pass-content";
import { stripSvg } from "@/lib/wallet/strip";

export type PassLook = {
  venueName: string;
  logoUrl: string | null;
  logoText: string | null;
  bg: string;
  fg: string;
  accent: string;
  firstName: string;
  progress: Progress;
  venue: PassVenue;
  offer: PassOffer;
};

const SAMPLE_SERIAL = "5028d3c8-1004-4451-80d5-360c7f24f151";

/** A decorative stand-in for the member QR code (the real pass encodes the customer's card ID). */
function FakeQr({ size = 88 }: { size?: number }) {
  const cells = 21;
  const on = (x: number, y: number) => {
    const finder = (cx: number, cy: number) =>
      x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && !(x > cx && x < cx + 6 && y > cy && y < cy + 6 && !(x > cx + 1 && x < cx + 5 && y > cy + 1 && y < cy + 5));
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
    return (x * 7 + y * 13 + x * y) % 5 < 2;
  };
  const rects = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) if (on(x, y)) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${cells + 2} ${cells + 2}`} aria-hidden="true">
      <rect x="-1" y="-1" width={cells + 2} height={cells + 2} fill="#fff" />
      <g fill="#111">{rects}</g>
    </svg>
  );
}

function Strip({ look }: { look: PassLook }) {
  const p = look.progress;
  const svg = stripSvg({
    rewardType: p.reward_type,
    stamps: p.stamps,
    stampsNeeded: p.stamps_needed,
    points: p.points,
    pointsNeeded: p.points_needed,
    bg: look.bg,
    fg: look.fg,
    accent: look.accent,
  });
  return <div className="w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function BackList({ look, platform }: { look: PassLook; platform: "apple" | "google" }) {
  return (
    <dl className="divide-y divide-black/10">
      {backSections(look.venue, look.progress, look.offer, platform).map((s) => (
        <div key={s.key} className="px-4 py-2.5">
          {s.label && <dt className={`text-[10px] font-semibold ${platform === "apple" ? "uppercase tracking-wide" : ""} text-black/50`}>{s.label}</dt>}
          <dd className={`text-[13px] leading-snug ${s.key === "powered" ? "text-black/50" : "text-black"}`}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Apple Wallet store card, front or back, roughly as it renders on an iPhone. */
export function ApplePassPreview({ look, side = "front" }: { look: PassLook; side?: "front" | "back" }) {
  const p = look.progress;
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-center text-[13px] font-semibold">Pass Details</p>
        <BackList look={look} platform="apple" />
      </div>
    );
  }
  const logoText = look.logoText || (!look.logoUrl ? look.venueName : null);
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex h-12 items-center justify-between gap-2 px-3">
        <div className="flex h-8 min-w-0 items-center gap-1.5">
          {look.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.logoUrl} alt="" className="h-7 max-w-[7rem] object-contain" />
          )}
          {logoText && <span className="truncate text-[15px] font-semibold">{logoText}</span>}
        </div>
        <div className="flex shrink-0 items-start gap-3 text-right leading-tight">
          {look.offer && <p className="self-center rounded px-1 text-[11px] font-bold tracking-wide" style={{ color: look.accent }}>NEW OFFER</p>}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{p.reward_type === "stamps" ? "Visits" : "Points"}</p>
            <p className="text-[15px] font-semibold">{progressValue(p)}</p>
          </div>
        </div>
      </div>
      <Strip look={look} />
      <div className="grid grid-cols-2 gap-2 px-3 pt-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Reward</p>
          <p className="truncate text-[14px]">{rewardValue(p, look.venue.reward_text)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Member</p>
          <p className="truncate text-[14px]">{look.firstName}</p>
        </div>
      </div>
      <div className="flex justify-center px-3 pb-4 pt-4">
        <div className="rounded-md bg-white px-2 pb-1 pt-2 text-center">
          <FakeQr size={84} />
          <p className="mt-0.5 text-[9px] text-black/70">Member {memberNumber(SAMPLE_SERIAL)}</p>
        </div>
      </div>
    </div>
  );
}

/** Google Wallet loyalty card, front or details, roughly as it renders on Android. */
export function GooglePassPreview({ look, side = "front" }: { look: PassLook; side?: "front" | "back" }) {
  const p = look.progress;
  if (side === "back") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]">
        <p className="border-b border-black/10 px-4 py-3 text-[13px] font-medium">Details</p>
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
          <p className="truncate text-sm">{rewardValue(p, look.venue.reward_text)}</p>
        </div>
      </div>
      {look.offer && (
        <p className="mx-4 mt-3 rounded-xl bg-white/15 px-3 py-2 text-[13px] leading-snug">{look.offer.text}</p>
      )}
      <div className="flex justify-center px-4 pb-3 pt-4">
        <div className="rounded-lg bg-white px-2 pb-1 pt-2 text-center">
          <FakeQr size={96} />
          <p className="mt-0.5 text-[10px] text-black/70">Member {memberNumber(SAMPLE_SERIAL)}</p>
        </div>
      </div>
      <Strip look={look} />
    </div>
  );
}
