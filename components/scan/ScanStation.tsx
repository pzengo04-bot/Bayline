"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  addNewCustomer,
  addStamp,
  findCard,
  getCard,
  redeem,
  searchCustomers,
  type CardResult,
  type CardStatus,
  type SearchHit,
} from "@/app/dashboard/scan/actions";
import { ProgressCard } from "@/components/checkin/ProgressCard";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { isRewardReady } from "@/lib/rewards";
import { ConfirmDialog } from "./ConfirmDialog";
import { QrScanner } from "./QrScanner";

type Mode = "idle" | "camera" | "search" | "card";
type Flash = { tone: "ok" | "error"; text: string; sub?: string } | null;

const big = "flex h-16 w-full items-center justify-center gap-2 rounded-full text-lg font-semibold transition-colors disabled:opacity-50";

/**
 * The counter screen: scan a card (or search), see where it stands, add a stamp or redeem, and
 * land back on the scan button with what just happened.
 */
export function ScanStation() {
  const [mode, setMode] = useState<Mode>("idle");
  const [card, setCard] = useState<CardStatus | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [pending, start] = useTransition();

  const back = (f: Flash) => {
    setFlash(f);
    setCard(null);
    setMode("idle");
  };
  const open = (r: CardResult) => {
    if (r.ok && r.done) back({ tone: "ok", text: r.done, sub: r.card.name }); // added a new customer
    else if (r.ok) {
      setCard(r.card);
      setFlash(null);
      setMode("card");
    } else back({ tone: "error", text: r.message });
  };

  if (mode === "camera") {
    return (
      <QrScanner
        onCancel={() => setMode("idle")}
        onCode={(code) => start(async () => open(await findCard(code)))}
      />
    );
  }
  if (mode === "search") return <Search onCancel={() => setMode("idle")} onOpen={open} />;
  if (mode === "card" && card) {
    return <CardScreen card={card} onDone={back} onBack={() => back(null)} />;
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div
          role="status"
          className={`rounded-2xl p-4 text-center ${flash.tone === "ok" ? "bg-blue/15 text-fg ring-1 ring-blue/40" : "bg-red-400/10 text-red-300 ring-1 ring-red-400/30"}`}
        >
          <p className="text-lg font-semibold">{flash.text}</p>
          {flash.sub && <p className="mt-0.5 text-sm text-muted">{flash.sub}</p>}
        </div>
      )}
      <button type="button" onClick={() => setMode("camera")} disabled={pending} className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-blue text-2xl font-semibold text-midnight transition-colors hover:bg-blue-hover disabled:opacity-50">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="4" height="4" rx="0.5" />
          <rect x="13" y="13" width="4" height="4" rx="0.5" />
          <path d="M13 7h4v2M7 15v2h2" />
        </svg>
        {pending ? "Looking up…" : "Scan card"}
      </button>
      <button type="button" onClick={() => setMode("search")} className="h-14 w-full rounded-full text-base font-semibold text-blue underline-offset-4 hover:underline">
        Can&apos;t scan? Search by name or phone
      </button>
    </div>
  );
}

function CardScreen({ card: initial, onDone, onBack }: { card: CardStatus; onDone: (f: Flash) => void; onBack: () => void }) {
  const [card, setCard] = useState(initial);
  const [confirm, setConfirm] = useState<"main" | "milestone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const p = card.progress;
  const ready = isRewardReady(p);
  const milestone = p.milestone?.ready ? p.milestone : null;
  const first = card.name.split(" ")[0];

  const run = (action: () => Promise<CardResult>) =>
    start(async () => {
      setError(null);
      const r = await action();
      setConfirm(null);
      if (r.ok) onDone({ tone: "ok", text: r.done ?? "Saved", sub: card.name });
      else {
        setError(r.message);
        const fresh = await getCard(card.id);
        if (fresh.ok) setCard(fresh.card);
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-4xl font-bold uppercase leading-none">{card.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {formatPhone(card.phone)} · {card.visits} visit{card.visits === 1 ? "" : "s"}
          </p>
        </div>
        <p className="shrink-0 text-right font-display text-4xl font-bold tabular-nums leading-none text-blue">
          {p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points}`}
          <span className="block font-sans text-xs font-medium text-muted">{p.reward_type === "stamps" ? "stamps" : `of ${p.points_needed} points`}</span>
        </p>
      </div>

      <ProgressCard progress={p} />

      {error && <p className="rounded-xl bg-red-400/10 px-4 py-3 text-center font-semibold text-red-300">{error}</p>}

      {ready ? (
        <>
          <p className="text-center font-semibold text-orange">Reward ready: {p.reward_text}</p>
          <button type="button" onClick={() => setConfirm("main")} disabled={pending} className={`${big} bg-orange text-midnight hover:bg-orange-hover`}>
            Redeem {p.reward_text}
          </button>
        </>
      ) : card.stamped_today ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-5 text-center text-lg font-semibold text-muted ring-1 ring-line">Already stamped today</p>
      ) : (
        <>
          {p.reward_type === "points" && (
            <label className="block">
              <span className="text-sm text-muted">Amount spent (optional)</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$0.00"
                className="mt-1 h-14 w-full rounded-2xl border border-line bg-surface-2 px-4 text-lg"
              />
            </label>
          )}
          <button type="button" onClick={() => run(() => addStamp(card.id, amount))} disabled={pending} className={`${big} bg-blue text-midnight hover:bg-blue-hover`}>
            {pending ? "Adding…" : p.reward_type === "stamps" ? "Add stamp" : "Add visit"}
          </button>
        </>
      )}
      {milestone && (
        <button type="button" onClick={() => setConfirm("milestone")} disabled={pending} className={`${big} border-2 border-orange text-orange hover:bg-orange/10`}>
          Redeem {milestone.text}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onBack} className="h-14 rounded-full border border-line bg-surface-2 font-semibold">
          Done
        </button>
        <Link href={`/dashboard/customers/${card.id}`} className="grid h-14 place-items-center rounded-full border border-line bg-surface-2 font-semibold">
          Profile
        </Link>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title="Redeem reward?"
        confirmLabel={confirm === "milestone" ? `Redeem ${milestone?.text ?? ""}` : `Redeem ${p.reward_text}`}
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => redeem(card.id, confirm ?? "main"))}
      >
        {confirm === "milestone" ? (
          <p>Give {first} their {milestone?.text}. Their stamps stay as they are.</p>
        ) : p.reward_type === "stamps" ? (
          <p>
            Give {first} their {p.reward_text}. Their card goes back to 0 of {p.stamps_needed}, and today&apos;s visit doesn&apos;t earn a new stamp.
          </p>
        ) : (
          <p>
            Give {first} their {p.reward_text}. This uses {p.points_needed} of their {p.points} points.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function Search({ onCancel, onOpen }: { onCancel: () => void; onOpen: (r: CardResult) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => setHits(await searchCustomers(q)), 250);
    return () => clearTimeout(t);
  }, [q]);

  const shown = q.trim().length < 2 ? null : hits;
  const phone = normalizePhone(q);

  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name or phone number"
        aria-label="Search by name or phone"
        className="h-14 w-full rounded-2xl border border-line bg-surface-2 px-4 text-lg"
      />
      {shown && shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => onOpen(await getCard(h.id)))}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
              >
                <span className="font-semibold">{h.name}</span>
                <span className="text-sm text-muted">{formatPhone(h.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown && shown.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-muted">Nobody found.</p>
          {phone && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => onOpen(await addNewCustomer(phone, name)));
              }}
            >
              <p className="font-semibold">Add {formatPhone(phone)} as a new customer</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                aria-label="First name"
                className="h-14 w-full rounded-2xl border border-line bg-surface-2 px-4 text-lg"
              />
              <button type="submit" disabled={pending || !name.trim()} className={`${big} bg-blue text-midnight hover:bg-blue-hover`}>
                Add with first stamp
              </button>
            </form>
          )}
        </div>
      )}
      <button type="button" onClick={onCancel} className="h-14 w-full rounded-full border border-line bg-surface-2 text-base font-semibold">
        Back to scan
      </button>
    </div>
  );
}
