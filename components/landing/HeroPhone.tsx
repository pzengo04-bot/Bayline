import Image from "next/image";
import golfCard from "@/public/marketing/cards/golf-in-progress-offer.png";

/**
 * Hero visual: an iPhone showing a real card render, a lock-screen offer notification overlapping
 * it, and a small chip from the owner's side.
 */
export function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[22rem] pb-10 pt-12 lg:max-w-[24rem]">
      {/* Phone */}
      <div className="relative rounded-[3rem] bg-ink p-3 shadow-[0_40px_80px_-30px_rgba(15,21,18,0.55)]">
        <div className="absolute left-1/2 top-5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
        <div className="overflow-hidden rounded-[2.4rem] bg-[#e9e8e3] px-3 pb-6 pt-14">
          <Image
            src={golfCard}
            alt="A Back Nine Golf rewards card in Apple Wallet: six of ten golf-ball stamps filled, a trophy on the last stamp, and a banner reading Bonus stamp on any visit this week."
            sizes="(min-width: 1024px) 22rem, 20rem"
            priority
            className="h-auto w-full rounded-[14px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>

      {/* Lock-screen notification */}
      <div className="absolute inset-x-2 top-0 flex gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-[0_18px_40px_-18px_rgba(15,21,18,0.5)] backdrop-blur sm:-left-6 sm:right-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-[22%] bg-ink text-[11px] font-bold text-accent" aria-hidden="true">
          BN
        </span>
        <div className="min-w-0 text-[13px] leading-snug">
          <p className="flex justify-between gap-2">
            <span className="font-semibold">Back Nine Golf</span>
            <span className="text-muted">now</span>
          </p>
          <p className="text-ink/80">Bonus stamp on any visit this week. See you on the course!</p>
        </div>
      </div>

      {/* Owner's side */}
      <div className="absolute -right-1 bottom-0 flex items-center gap-2 rounded-full bg-ink py-2 pl-3 pr-2 text-sm text-white shadow-lg sm:-right-8">
        <span className="size-2 rounded-full bg-[#f59e0b]" aria-hidden="true" />
        <span className="whitespace-nowrap">6 regulars slipping</span>
        <span className="whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-ink">Send offer</span>
      </div>
    </div>
  );
}
