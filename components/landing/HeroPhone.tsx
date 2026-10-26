import Image from "next/image";
import golfCard from "@/public/marketing/cards/golf-in-progress-offer.png";
import { PhoneFrame } from "./PhoneFrame";

/**
 * Hero visual: an iPhone (real 9:19.5 proportions) open to Wallet with a real card render, a
 * lock-screen offer notification overlapping it, and a small chip from the owner's side.
 */
export function HeroPhone() {
  return (
    <div className="flex justify-center pb-8 pt-10">
      <div className="relative">
        <PhoneFrame className="w-[15rem] sm:w-[16.5rem] lg:w-[14.5rem] xl:w-[15.5rem]">
          <p className="px-4 pt-1 font-display text-[1.6rem] font-bold leading-none">Wallet</p>
          <div className="px-2.5 pt-3">
            <Image
              src={golfCard}
              alt="A Back Nine Golf rewards card in Apple Wallet: six of ten golf-ball stamps filled, a trophy on the last stamp, and a banner reading Bonus stamp on any visit this week."
              sizes="(min-width: 640px) 16rem, 15rem"
              priority
              className="h-auto w-full rounded-[10px] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)]"
            />
            {/* The next cards in the wallet stack, peeking out below. */}
            <div className="mx-1 -mt-1 h-5 rounded-b-[10px] bg-[#1d3a5f]" aria-hidden="true" />
            <div className="mx-2.5 h-4 rounded-b-[10px] bg-[#f6efe4] shadow-sm" aria-hidden="true" />
          </div>
        </PhoneFrame>

        {/* Lock-screen notification, overlapping the top of the phone */}
        <div className="absolute left-1/2 top-0 z-20 flex w-[min(19.5rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-6 gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-[0_18px_40px_-18px_rgba(15,21,18,0.5)] backdrop-blur">
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
        <div className="absolute -bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink py-2 pl-3 pr-2 text-sm text-white shadow-lg sm:left-auto sm:right-[-3.5rem] sm:translate-x-0">
          <span className="size-2 rounded-full bg-[#f59e0b]" aria-hidden="true" />
          6 regulars slipping
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-ink">Send offer</span>
        </div>
      </div>
    </div>
  );
}
