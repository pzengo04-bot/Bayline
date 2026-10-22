"use client";

import { useState, useTransition } from "react";
import { ProgressCard } from "@/components/checkin/ProgressCard";
import { button, card } from "@/components/ui/styles";
import { daysSince, formatDaysAgo, formatPhoneInput, phoneDigits } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { isRewardReady, type Progress, type RewardType } from "@/lib/rewards";
import { lookupCustomer, redeemReward, saveVisit, type LookupResult, type SaveVisitResult } from "./actions";

type Props = { rewardType: RewardType; pointsPerDollar: number; rewardText: string };

const input = "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-lg focus:border-ink focus:outline-none";

function lastVisitLabel(iso: string | null) {
  if (!iso) return "No visits yet";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 120) return `Last visit ${mins} min ago`;
  return `Last visit ${formatDaysAgo(daysSince(iso))}`;
}

export function AddVisitForm({ rewardType, pointsPerDollar, rewardText }: Props) {
  const [digits, setDigits] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState<Extract<SaveVisitResult, { status: "saved" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<"main" | "milestone" | null>(null);
  const [pending, start] = useTransition();
  const points = rewardType === "points";
  const preview = Number(amount.replace(/[$,\s]/g, ""));

  const reset = () => {
    setDigits("");
    setLookup(null);
    setName("");
    setAmount("");
    setSaved(null);
    setError(null);
    setRedeemed(null);
  };

  const find = () =>
    start(async () => {
      setError(null);
      const r = await lookupCustomer(digits);
      if (r.status === "error") setError(r.message);
      else setLookup(r);
    });

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveVisit({ phone: digits, amount, name: lookup?.status === "new" ? name : undefined });
      if (r.status === "error") setError(r.message);
      else setSaved(r);
    });

  const redeem = (customerId: string, kind: "main" | "milestone") =>
    start(async () => {
      const r = await redeemReward(customerId, kind);
      if (!r.ok || !r.progress) return setError(r.message ?? "Couldn't redeem.");
      const progress = r.progress;
      setSaved((s) => (s ? { ...s, progress } : s));
      setLookup((l) => (l?.status === "found" ? { ...l, customer: { ...l.customer, progress } } : l));
      setRedeemed(kind);
    });

  /** Separate buttons for the milestone and the main reward; each is given once per card. */
  const redeemButtons = (customerId: string, progress: Progress, className: string) => (
    <>
      {progress.milestone?.ready && (
        <button type="button" disabled={pending} onClick={() => redeem(customerId, "milestone")} className={`${button.accent} ${className}`}>
          Redeem {progress.milestone.text}
        </button>
      )}
      {isRewardReady(progress) && (
        <button type="button" disabled={pending} onClick={() => redeem(customerId, "main")} className={`${button.accent} ${className}`}>
          Redeem {progress.reward_text}
        </button>
      )}
    </>
  );
  const redeemedNote = redeemed && (
    <p className="mt-3 rounded-xl bg-accent/40 px-3 py-2 text-sm">
      {redeemed === "main" ? "Reward redeemed. Their card starts over." : "Milestone reward redeemed. Their stamps keep counting."}
    </p>
  );

  if (saved) {
    const p = saved.progress;
    const ready = isRewardReady(p) ? p.reward_text : p.milestone?.ready ? p.milestone.text : null;
    return (
      <div className={`${card} p-5 sm:p-6`}>
        {ready && !redeemed ? (
          <div className="rounded-2xl bg-accent p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest">Reward ready</p>
            <p className="mt-1 font-display text-3xl font-bold uppercase">{ready}</p>
            <p className="mt-1 text-sm">Give {saved.name.split(" ")[0]} their reward, then tap Redeem.</p>
          </div>
        ) : (
          <p className="flex items-center gap-2 font-semibold text-accent-strong">
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-ink">✓</span>
            Visit saved for {saved.name}
          </p>
        )}
        <div className="mt-4">
          <ProgressCard progress={p} />
        </div>
        {redeemedNote}
        {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {redeemButtons(saved.customerId, p, "sm:flex-1")}
          <button type="button" onClick={reset} className={`${button.primary} sm:flex-1`}>
            Add another visit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`${card} p-5 sm:p-6`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!lookup) find();
        else save();
      }}
    >
      <label htmlFor="desk-phone" className="block text-sm font-semibold">
        Customer phone number
      </label>
      <div className="flex gap-2">
        <input
          id="desk-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          autoFocus
          value={formatPhoneInput(digits)}
          onChange={(e) => {
            setDigits(phoneDigits(e.target.value).replace(/^1(?=\d{10})/, "").slice(0, 10));
            setLookup(null);
            setError(null);
          }}
          placeholder="(555) 555-5555"
          className={`${input} font-mono tracking-wide`}
        />
        {!lookup && (
          <button type="submit" disabled={pending || digits.length !== 10} className={`${button.primary} mt-1.5 h-12 shrink-0`}>
            {pending ? "…" : "Find"}
          </button>
        )}
      </div>

      {lookup?.status === "found" && (
        <div className="mt-4 rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{lookup.customer.name}</p>
              <p className="text-sm text-muted">
                {formatPhone(lookup.customer.phone)} · {lookup.customer.visits} visit{lookup.customer.visits === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted">{lastVisitLabel(lookup.customer.last_visit_at)}</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressCard progress={lookup.customer.progress} />
          </div>
          <div className="mt-3 flex flex-col gap-2">{redeemButtons(lookup.customer.id, lookup.customer.progress, "w-full")}</div>
          {redeemedNote}
        </div>
      )}

      {lookup?.status === "new" && (
        <div className="mt-4 rounded-xl bg-paper p-4">
          <p className="text-sm font-semibold">New customer</p>
          <p className="text-sm text-muted">This number isn&apos;t in your rewards yet. Add their first name to sign them up.</p>
          <label htmlFor="desk-name" className="mt-3 block text-sm font-semibold">
            First name
          </label>
          <input id="desk-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className={input} />
        </div>
      )}

      {lookup && lookup.status !== "error" && (
        <>
          <label htmlFor="desk-amount" className="mt-4 block text-sm font-semibold">
            Amount spent {points ? "" : <span className="font-normal text-muted">(optional)</span>}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-lg text-muted">$</span>
            <input
              id="desk-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required={points}
              placeholder="0.00"
              className={`${input} pl-7 tabular-nums`}
            />
          </div>
          {points && preview > 0 && (
            <p className="mt-1.5 text-sm text-accent-strong">+{Math.floor(preview * pointsPerDollar)} points toward a {rewardText}</p>
          )}
        </>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}

      {lookup && lookup.status !== "error" && (
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={reset} className={`${button.secondary} flex-1`}>
            Cancel
          </button>
          <button type="submit" disabled={pending || (lookup.status === "new" && !name.trim())} className={`${button.primary} flex-[2]`}>
            {pending ? "Saving…" : "Save visit"}
          </button>
        </div>
      )}
    </form>
  );
}
