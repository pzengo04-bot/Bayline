/** How an offer lands: iPhone lock-screen notification + card back, or an Android notification. */

type Props = { venueName: string; message: string; logoUrl: string | null; cardBg: string; cardFg: string };

function Icon({ venueName, logoUrl, cardBg, cardFg, size }: Omit<Props, "message"> & { size: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-[22%]" style={{ width: size, height: size, background: cardBg }}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-[70%] w-[70%] object-contain" />
      ) : (
        <span className="text-[10px] font-bold" style={{ color: cardFg }}>
          {venueName.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function IphoneOfferPreview(p: Props) {
  const text = p.message || "Your message";
  return (
    <div className="space-y-3">
      <div className="rounded-[28px] bg-[linear-gradient(160deg,#1d3557,#457b9d_55%,#a8dadc)] px-3 pb-5 pt-4">
        <p className="text-center font-display text-5xl font-semibold leading-none text-white/90">9:41</p>
        <p className="mt-1 text-center text-xs text-white/70">Tuesday, October 21</p>
        <div className="mt-5 flex gap-2.5 rounded-2xl bg-white/80 p-3 backdrop-blur">
          <Icon {...p} size={34} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[13px] font-semibold text-black">{p.venueName}</p>
              <p className="shrink-0 text-[11px] text-black/50">now</p>
            </div>
            <p className="text-[13px] leading-snug text-black/85">{text}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Back of the card</p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-black/50">Latest offer</p>
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

export function AndroidOfferPreview(p: Props) {
  const text = p.message || "Your message";
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] bg-[#1b1b1f] px-3 pb-4 pt-3">
        <p className="px-1 text-xs text-white/60">9:41 · Tue, Oct 21</p>
        <div className="mt-3 rounded-[20px] bg-[#2b2b30] p-3">
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="grid size-4 place-items-center rounded-full bg-[#4285f4] text-[8px] font-bold text-white">W</span>
            Google Wallet · now
          </div>
          <div className="mt-2 flex gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white">{p.venueName}</p>
              <p className="text-[13px] leading-snug text-white/80">{text}</p>
            </div>
            <Icon {...p} size={36} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">On the card</p>
        <p className="mt-2 text-sm font-medium">{p.venueName}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}
