"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { addStamp, redeem, removeStamp, resetCard, type CardResult, type CardStatus } from "@/app/dashboard/scan/actions";
import { ConfirmDialog } from "@/components/scan/ConfirmDialog";
import { isRewardReady } from "@/lib/rewards";

type Confirm = "redeem" | "milestone" | "remove" | "reset" | null;

const btn = "flex h-12 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none";

/** Add stamp, Remove stamp, Redeem reward, Reset card (and Send message, passed in for owners). */
export function ProfileActions({ card, message }: { card: CardStatus; message?: ReactNode }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const p = card.progress;
  const stamps = p.reward_type === "stamps";
  const ready = isRewardReady(p);
  const first = card.name.split(" ")[0];

  const run = (action: () => Promise<CardResult>) =>
    start(async () => {
      const r = await action();
      setConfirm(null);
      setFlash(r.ok ? { ok: true, text: r.done ?? "Saved" } : { ok: false, text: r.message });
      router.refresh();
    });

  return (
    <div>
      {flash && (
        <p role="status" className={`mb-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${flash.ok ? "bg-blue/15 text-blue" : "bg-red-400/10 text-red-300"}`}>
          {flash.text}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          disabled={pending || (stamps && ready) || card.stamped_today}
          onClick={() => run(() => addStamp(card.id))}
          className={`${btn} bg-blue text-midnight hover:bg-blue-hover`}
          title={card.stamped_today ? "Already stamped today" : undefined}
        >
          {card.stamped_today ? "Stamped today" : stamps ? "Add stamp" : "Add visit"}
        </button>
        <button type="button" disabled={pending || !ready} onClick={() => setConfirm("redeem")} className={`${btn} bg-orange text-midnight hover:bg-orange-hover`}>
          Redeem reward
        </button>
        {p.milestone?.ready && (
          <button type="button" disabled={pending} onClick={() => setConfirm("milestone")} className={`${btn} border-2 border-orange text-orange hover:bg-orange/10`}>
            Redeem {p.milestone.text}
          </button>
        )}
        {stamps && (
          <>
            <button type="button" disabled={pending || p.stamps === 0} onClick={() => setConfirm("remove")} className={`${btn} border border-line bg-surface-2 hover:border-blue/60`}>
              Remove stamp
            </button>
            <button type="button" disabled={pending || p.stamps === 0} onClick={() => setConfirm("reset")} className={`${btn} border border-line bg-surface-2 hover:border-blue/60`}>
              Reset card
            </button>
          </>
        )}
        {message}
      </div>

      <ConfirmDialog
        open={confirm === "redeem" || confirm === "milestone"}
        title="Redeem reward?"
        confirmLabel={`Redeem ${confirm === "milestone" ? (p.milestone?.text ?? "") : p.reward_text}`}
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => redeem(card.id, confirm === "milestone" ? "milestone" : "main"))}
      >
        {confirm === "milestone" ? (
          <p>Give {first} their {p.milestone?.text}. Their stamps stay as they are.</p>
        ) : stamps ? (
          <p>Give {first} their {p.reward_text}. Their card goes back to 0 of {p.stamps_needed}.</p>
        ) : (
          <p>Give {first} their {p.reward_text}. This uses {p.points_needed} of their {p.points} points.</p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "remove"}
        title="Remove a stamp?"
        tone="danger"
        confirmLabel="Remove stamp"
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => removeStamp(card.id))}
      >
        <p>
          {first}&apos;s card goes from {p.stamps} to {p.stamps - 1} of {p.stamps_needed}. The visit stays in their history.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "reset"}
        title="Reset the card?"
        tone="danger"
        confirmLabel="Reset to 0"
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => resetCard(card.id))}
      >
        <p>
          {first}&apos;s card goes from {p.stamps} to 0 of {p.stamps_needed} without a reward. Use this to fix a mistake.
        </p>
      </ConfirmDialog>
    </div>
  );
}
