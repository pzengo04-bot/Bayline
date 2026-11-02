"use client";

import { useState, useTransition } from "react";
import { sendOffer } from "@/app/dashboard/messages/actions";
import { Modal } from "@/components/ui/Modal";
import { button } from "@/components/ui/styles";
import { IphoneOfferPreview } from "@/components/wallet/OfferPreview";
import { OFFER_MAX, type OfferAudience } from "@/lib/offer-templates";

export type OfferDraft = {
  audience: OfferAudience;
  message: string;
  short: string;
  /** Narrow the audience to these customers (one slipping regular). */
  customerIds?: string[];
  /** First names of who gets it. */
  recipients: string[];
  noCard: number;
  cooldown: number;
};

type Props = {
  draft: OfferDraft;
  venue: { name: string; logoUrl: string | null; cardBg: string; cardFg: string; cooldownDays: number };
  label?: string;
  /** large: blue. orange: the page's main action. medium: a row of profile buttons. small: a list row. outline: a table row. */
  size?: "large" | "orange" | "medium" | "small" | "outline";
  /** Let the owner change the words before sending (the customer profile). */
  editable?: boolean;
};

/** "Send offer": a preview of the message and who gets it, then Send. */
export function SendOfferButton({ draft, venue, label = "Send offer", size = "large", editable = false }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(draft.message);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = draft.recipients.length;
  const names = n > 6 ? `${draft.recipients.slice(0, 5).join(", ")} and ${n - 5} more` : draft.recipients.join(", ");

  const send = () =>
    start(async () => {
      setError(null);
      // Edited words get their card line from the message itself.
      const short = message === draft.message ? draft.short : undefined;
      const r = await sendOffer({ audience: draft.audience, message, short, customerIds: draft.customerIds });
      if (r.ok) setResult(`Sent to ${r.delivered} ${r.delivered === 1 ? "card" : "cards"}. It shows up on their lock screen in a few seconds.`);
      else setError(r.message);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setError(null);
          setOpen(true);
        }}
        className={
          size === "orange"
            ? "inline-flex h-11 items-center justify-center rounded-[10px] bg-orange px-5 text-sm font-bold text-midnight hover:bg-orange-hover"
            : size === "outline"
              ? "inline-flex h-9 shrink-0 items-center rounded-[10px] border border-blue/60 px-3 text-sm font-semibold text-blue-light hover:bg-blue/10"
              : size === "large"
            ? `${button.accent} h-12 px-6 text-base`
            : `shrink-0 rounded-full bg-blue/15 text-sm font-semibold text-blue hover:bg-blue/25 ${size === "medium" ? "flex h-12 items-center justify-center px-4" : "px-3.5 py-2"}`
        }
      >
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={result ? "Sent" : "Send offer"}>
        {result ? (
          <>
            <p className="text-lg font-semibold">{result}</p>
            <button type="button" onClick={() => setOpen(false)} className={`${button.accent} mt-5 h-12 w-full text-base`}>
              Done
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <IphoneOfferPreview venueName={venue.name} message={message} logoUrl={venue.logoUrl} cardBg={venue.cardBg} cardFg={venue.cardFg} />
            {editable && (
              <label className="block">
                <span className="text-sm text-muted">Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={OFFER_MAX}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2"
                />
              </label>
            )}
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">Goes to</p>
              {n ? (
                <p className="mt-1">
                  <span className="font-semibold">
                    {n} {n === 1 ? "person" : "people"}:
                  </span>{" "}
                  {names}
                </p>
              ) : (
                <p className="mt-1 text-muted">Nobody can get this right now.</p>
              )}
              {(draft.noCard > 0 || draft.cooldown > 0) && (
                <p className="mt-1 text-sm text-muted">
                  {[
                    draft.noCard ? `${draft.noCard} without the wallet card` : null,
                    draft.cooldown ? `${draft.cooldown} already got an offer in the last ${venue.cooldownDays} days` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  won&apos;t get it.
                </p>
              )}
            </div>
            {error && <p className="rounded-xl bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{error}</p>}
            <button type="button" onClick={send} disabled={pending || n === 0} className={`${button.accent} h-12 w-full text-base`}>
              {pending ? "Sending…" : `Send to ${n} ${n === 1 ? "person" : "people"}`}
            </button>
            {!editable && (
              <p className="text-center text-xs text-muted">
                Want different words?{" "}
                <a href={`/dashboard/messages?audience=${draft.audience}`} className="font-semibold text-fg underline underline-offset-2">
                  Write your own
                </a>
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
