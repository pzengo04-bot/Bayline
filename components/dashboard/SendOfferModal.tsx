"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { button } from "@/components/ui/styles";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  recipientCount: number;
  recipientNote?: string;
  defaultMessage: string;
};

/** Compose → send → success. Simulated: nothing leaves the browser. */
export function SendOfferModal({ open, onClose, title, recipientCount, recipientNote, defaultMessage }: Props) {
  const [message, setMessage] = useState(defaultMessage);
  const [stage, setStage] = useState<"compose" | "sending" | "sent">("compose");

  const close = () => {
    onClose();
    // Reset after the close animation so the next open starts fresh.
    setTimeout(() => {
      setStage("compose");
      setMessage(defaultMessage);
    }, 150);
  };

  const send = () => {
    setStage("sending");
    setTimeout(() => setStage("sent"), 900);
  };

  return (
    <Modal open={open} onClose={close} title={stage === "sent" ? "Sent" : title}>
      {stage === "sent" ? (
        <div className="py-4 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <path d="M6 13.5l4.5 4.5L20 8" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-4 font-display text-3xl font-bold uppercase">Offer sent to {recipientCount} customers</p>
          <p className="mt-2 text-sm text-muted">
            You&apos;ll see who comes back, and what they spend, in Results.
          </p>
          <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-muted">Demo only: no texts were actually sent.</p>
          <button type="button" onClick={close} className={`${button.primary} mt-5 w-full`}>
            Done
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">
              To: {recipientCount} customers
            </p>
            <p className="text-xs text-muted">{message.length} characters</p>
          </div>
          {recipientNote && <p className="mt-1 text-xs text-muted">{recipientNote}</p>}
          <label htmlFor="offer-message" className="sr-only">
            Message
          </label>
          <textarea
            id="offer-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="mt-3 w-full resize-none rounded-xl border border-line bg-paper p-3 text-[15px] leading-snug focus:border-ink focus:outline-none"
          />
          <p className="mt-2 text-xs text-muted">
            Only customers who opted in to texts receive offers. Every message includes opt-out instructions.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={close} className={`${button.secondary} flex-1`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={stage === "sending" || !message.trim()}
              className={`${button.primary} flex-[2]`}
            >
              {stage === "sending" ? "Sending…" : `Send to ${recipientCount}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
