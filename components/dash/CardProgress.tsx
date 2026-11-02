"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addStamp, redeem, removeStamp, resetCard, type CardResult, type CardStatus } from "@/app/dashboard/scan/actions";
import { ConfirmDialog } from "@/components/scan/ConfirmDialog";
import { isRewardReady } from "@/lib/rewards";

type Confirm = "redeem" | "remove" | "reset" | null;

const btn = "inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";

/** Stamp dots (filled blue, the next one outlined orange), where the card stands, and its buttons. */
export function CardProgress({ card, owner }: { card: CardStatus; owner: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const p = card.progress;
  const stamps = p.reward_type === "stamps";
  const ready = isRewardReady(p);
  const first = card.name.split(" ")[0];
  const left = p.stamps_needed - p.stamps;

  const run = (action: () => Promise<CardResult>) =>
    start(async () => {
      const r = await action();
      setConfirm(null);
      setFlash(r.ok ? { ok: true, text: r.done ?? "Saved" } : { ok: false, text: r.message });
      router.refresh();
    });

  return (
    <div>
      {stamps ? (
        <div className="grid max-w-xs grid-cols-4 gap-3">
          {Array.from({ length: p.stamps_needed }, (_, i) => {
            const filled = i < p.stamps;
            const next = i === p.stamps;
            return (
              <span
                key={i}
                className={`grid aspect-square place-items-center rounded-full text-sm font-bold ${
                  filled ? "bg-blue text-midnight" : next ? "border-2 border-orange text-orange" : "border border-line text-muted"
                }`}
                aria-hidden="true"
              >
                {filled ? "✓" : i === p.stamps_needed - 1 ? "★" : i + 1}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, (p.points / p.points_needed) * 100)}%` }} />
        </div>
      )}
      <p className="mt-4 font-semibold">
        {stamps ? (
          <>
            <span className="font-mono">
              {p.stamps} of {p.stamps_needed}
            </span>
            <span className="text-muted"> · {ready ? `${p.reward_text} ready to redeem` : `${left} visit${left === 1 ? "" : "s"} from a ${p.reward_text}`}</span>
          </>
        ) : (
          <>
            <span className="font-mono">{p.points} points</span>
            <span className="text-muted"> · {ready ? `${p.reward_text} ready` : `${p.points_needed - p.points} to a ${p.reward_text}`}</span>
          </>
        )}
      </p>
      {flash && (
        <p role="status" className={`mt-3 rounded-[10px] px-3 py-2 text-sm font-semibold ${flash.ok ? "bg-blue/15 text-blue-light" : "bg-orange/10 text-orange"}`}>
          {flash.text}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || (stamps && ready) || card.stamped_today}
          onClick={() => run(() => addStamp(card.id))}
          className={`${btn} bg-blue text-midnight hover:bg-blue-hover`}
        >
          {card.stamped_today ? "Stamped today" : stamps ? "Add stamp" : "Add visit"}
        </button>
        <button type="button" disabled={pending || !ready} onClick={() => setConfirm("redeem")} className={`${btn} bg-orange text-midnight hover:bg-orange-hover`}>
          Redeem
        </button>
        {stamps && owner && (
          <>
            <button type="button" disabled={pending || p.stamps === 0} onClick={() => setConfirm("reset")} className={`${btn} border border-line hover:border-blue/60`}>
              Reset card
            </button>
            <button type="button" disabled={pending || p.stamps === 0} onClick={() => setConfirm("remove")} className={`${btn} text-muted hover:text-fg`}>
              Remove stamp
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "redeem"}
        title="Redeem reward?"
        confirmLabel={`Redeem ${p.reward_text}`}
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => redeem(card.id))}
      >
        <p>{stamps ? `Give ${first} their ${p.reward_text}. Their card goes back to 0 of ${p.stamps_needed}.` : `Give ${first} their ${p.reward_text}. This uses ${p.points_needed} points.`}</p>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "remove"} title="Remove a stamp?" tone="danger" confirmLabel="Remove stamp" busy={pending} onClose={() => setConfirm(null)} onConfirm={() => run(() => removeStamp(card.id))}>
        <p>
          {first}&apos;s card goes from {p.stamps} to {p.stamps - 1} of {p.stamps_needed}. The visit stays in their history.
        </p>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "reset"} title="Reset the card?" tone="danger" confirmLabel="Reset to 0" busy={pending} onClose={() => setConfirm(null)} onConfirm={() => run(() => resetCard(card.id))}>
        <p>
          {first}&apos;s card goes from {p.stamps} to 0 of {p.stamps_needed} without a reward. Use this to fix a mistake.
        </p>
      </ConfirmDialog>
    </div>
  );
}
