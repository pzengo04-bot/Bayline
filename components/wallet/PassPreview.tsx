import { isRewardReady, type Progress } from "@/lib/rewards";
import { stripSvg } from "@/lib/wallet/strip";

export type PassLook = {
  venueName: string;
  logoUrl: string | null;
  bg: string;
  fg: string;
  accent: string;
  firstName: string;
  progress: Progress;
};

const progressValue = (p: Progress) =>
  p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} / ${p.points_needed} pts`;

/** A decorative stand-in for the member QR code (the real pass encodes the customer's card ID). */
function FakeQr({ size = 88 }: { size?: number }) {
  const cells = 21;
  const on = (x: number, y: number) => {
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && !(x > cx && x < cx + 6 && y > cy && y < cy + 6 && !(x > cx + 1 && x < cx + 5 && y > cy + 1 && y < cy + 5));
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
    return ((x * 7 + y * 13 + x * y) % 5) < 2;
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

function Logo({ look, className }: { look: PassLook; className: string }) {
  return look.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={look.logoUrl} alt="" className={`${className} object-contain`} />
  ) : (
    <span className="truncate text-sm font-semibold" style={{ color: look.fg }}>
      {look.venueName}
    </span>
  );
}

/** Apple Wallet store card, roughly as it renders on an iPhone. */
export function ApplePassPreview({ look }: { look: PassLook }) {
  const p = look.progress;
  const strip = stripSvg({
    rewardType: p.reward_type,
    stamps: p.stamps,
    stampsNeeded: p.stamps_needed,
    points: p.points,
    pointsNeeded: p.points_needed,
    bg: look.bg,
    fg: look.fg,
    accent: look.accent,
  });
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[14px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex h-12 items-center justify-between gap-3 px-3">
        <div className="flex h-8 min-w-0 max-w-[60%] items-center">
          <Logo look={look} className="h-8 max-w-full" />
        </div>
        <div className="text-right leading-tight">
          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{p.reward_type === "stamps" ? "Visits" : "Points"}</p>
          <p className="text-[15px] font-semibold">{progressValue(p)}</p>
        </div>
      </div>
      <div className="w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: strip }} />
      <div className="grid grid-cols-2 gap-2 px-3 pt-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Reward</p>
          <p className="truncate text-[13px]">{isRewardReady(p) ? "Ready, show staff" : p.reward_text}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Member</p>
          <p className="truncate text-[13px]">{look.firstName}</p>
        </div>
      </div>
      <div className="flex justify-center px-3 pb-4 pt-4">
        <div className="rounded-md bg-white p-1.5">
          <FakeQr size={84} />
        </div>
      </div>
    </div>
  );
}

/** Google Wallet loyalty card, roughly as it renders on Android. */
export function GooglePassPreview({ look }: { look: PassLook }) {
  const p = look.progress;
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-[20px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]" style={{ background: look.bg, color: look.fg }}>
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
          {look.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.logoUrl} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <span className="text-xs font-bold text-[#111]">{look.venueName.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
        <span className="truncate text-sm font-medium">{look.venueName}</span>
      </div>
      <p className="px-4 pt-3 text-[22px] font-normal leading-tight">Rewards</p>
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <div>
          <p className="text-[11px] opacity-75">{p.reward_type === "stamps" ? "Visits" : "Points"}</p>
          <p className="text-lg font-medium">{progressValue(p)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] opacity-75">Reward</p>
          <p className="truncate text-sm">{isRewardReady(p) ? "Ready, show staff" : p.reward_text}</p>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-3 pt-4">
        <div className="rounded-lg bg-white p-2">
          <FakeQr size={96} />
        </div>
      </div>
      <p className="pb-4 text-center text-[11px] opacity-75">{look.firstName}</p>
    </div>
  );
}
