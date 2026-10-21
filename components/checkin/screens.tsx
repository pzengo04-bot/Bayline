import type { ReactNode } from "react";
import { isRewardReady, type Progress } from "@/lib/rewards";
import { ProgressCard } from "./ProgressCard";

// Presentational join/tap screens. The live page and the card designer preview both render these.

export function VenueHeading({ name, logoUrl, cardBg }: { name: string; logoUrl?: string | null; cardBg?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {logoUrl ? (
        // Logos are designed for the wallet card, so show them on the card color.
        <span className="inline-flex max-w-[80%] items-center justify-center rounded-2xl px-5 py-3" style={{ background: cardBg ?? "var(--ink)" }}>
          {/* Small uploaded PNGs from our own storage; a plain <img> keeps the page light. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="h-10 w-auto max-w-full object-contain" />
        </span>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Rewards</p>
      )}
      <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none">{name}</h1>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-accent-strong">
      <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-ink" aria-hidden="true">
        ✓
      </span>
      {children}
    </p>
  );
}

type Result = { status: "joined" | "stamped" | "limit_reached"; firstName: string; progress: Progress };

const progressLine = (p: Progress) =>
  p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} / ${p.points_needed} pts`;

export function TapResultScreen({ result }: { result: Result }) {
  const { status, firstName, progress } = result;
  if (isRewardReady(progress) && status !== "limit_reached") return <RewardReadyScreen firstName={firstName} progress={progress} />;

  const heading =
    status === "joined" ? `You're in, ${firstName}!` : status === "stamped" ? `Welcome back, ${firstName}!` : `Hi again, ${firstName}!`;
  const badge =
    status === "limit_reached"
      ? "Already earned today"
      : progress.reward_type === "stamps"
        ? `Stamp added: ${progressLine(progress)}`
        : `Points added: ${progressLine(progress)}`;

  return (
    <div className="text-center">
      <Badge>{badge}</Badge>
      <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-none">{heading}</h2>
      {status === "limit_reached" && (
        <p className="mt-3 text-muted">You&apos;ve already earned today&apos;s stamp. See you next time.</p>
      )}
      <div className="mt-6 text-left">
        <ProgressCard progress={progress} />
      </div>
      {isRewardReady(progress) && (
        <p className="mt-4 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold">Reward ready: show staff.</p>
      )}
    </div>
  );
}

export function RewardReadyScreen({ firstName, progress }: { firstName: string; progress: Progress }) {
  return (
    <div className="rounded-3xl bg-accent px-5 py-8 text-center text-ink">
      <p className="text-sm font-semibold uppercase tracking-widest">Reward ready</p>
      <p className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.9]">{progress.reward_text}</p>
      <p className="mt-4 text-lg font-semibold">Show this screen to staff</p>
      <p className="mt-1 text-sm">Nice one, {firstName}! Staff will redeem it and your card starts fresh.</p>
    </div>
  );
}
