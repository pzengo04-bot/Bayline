"use client";

import { useState, useTransition } from "react";
import { LabelChip } from "@/components/app/LabelChip";
import { Modal } from "@/components/ui/Modal";
import { button, card } from "@/components/ui/styles";
import { AndroidOfferPreview, IphoneOfferPreview } from "@/components/wallet/OfferPreview";
import type { Label } from "@/lib/labels";
import { OFFER_MAX, OFFER_TEMPLATES, type OfferAudience, type OfferTemplate } from "@/lib/offer-templates";
import { sendOffer, type SendResult } from "./actions";

export type AudienceSummary = {
  id: OfferAudience;
  label: string;
  hint: string;
  matched: number;
  deliver: number;
  noCard: number;
  cooldown: { name: string; label: Label; lastOfferAt: string }[];
};

type Props = {
  venue: { name: string; logoUrl: string | null; cardBg: string; cardFg: string; isDemo: boolean; cooldownDays: number };
  audiences: AudienceSummary[];
  templates: Record<OfferTemplate, string>;
  initialAudience: OfferAudience;
  initialTemplate: OfferTemplate;
  quick: boolean;
};

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function OfferComposer({ venue, audiences, templates, initialAudience, initialTemplate, quick }: Props) {
  const [audienceId, setAudienceId] = useState<OfferAudience>(initialAudience);
  const [template, setTemplate] = useState<OfferTemplate | null>(initialTemplate);
  const [message, setMessage] = useState(templates[initialTemplate]);
  const [preview, setPreview] = useState<"iphone" | "android">("iphone");
  const [confirming, setConfirming] = useState(quick);
  const [result, setResult] = useState<SendResult | null>(null);
  const [pending, start] = useTransition();
  const audience = audiences.find((a) => a.id === audienceId) ?? audiences[0];
  const tooLong = message.length > OFFER_MAX;

  const send = () =>
    start(async () => {
      const r = await sendOffer({ audience: audience.id, message });
      setResult(r);
      if (r.ok) setConfirming(false);
    });

  if (result?.ok) {
    return (
      <div className={`${card} p-6 text-center`}>
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 26 26">
            <path d="M6 13.5l4.5 4.5L20 8" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 font-display text-3xl font-bold uppercase">
          Delivered to {result.delivered} of {result.matched}
        </p>
        <p className="mt-2 text-muted">
          {[
            result.noCard ? `${result.noCard} haven't added the card` : null,
            result.cooldown ? `${result.cooldown} got an offer in the last ${venue.cooldownDays} days` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Everyone in this audience gets it."}
        </p>
        <p className="mt-1 text-sm text-muted">Phones update within a few seconds. Results show below as people come back.</p>
        <button type="button" onClick={() => setResult(null)} className={`${button.secondary} mt-5`}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className={`${card} space-y-5 p-4 sm:p-5`}>
        <fieldset>
          <legend className="font-display text-xl font-bold uppercase tracking-wide">1. Who</legend>
          <div className="mt-2 space-y-2">
            {audiences.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${
                  audience.id === a.id ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"
                }`}
              >
                <input type="radio" name="audience" checked={audience.id === a.id} onChange={() => setAudienceId(a.id)} className="sr-only" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className={`block text-xs ${audience.id === a.id ? "text-white/70" : "text-muted"}`}>{a.hint}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-2xl font-bold leading-none tabular-nums">{a.deliver}</span>
                  <span className={`block text-[11px] ${audience.id === a.id ? "text-white/70" : "text-muted"}`}>of {a.matched} get it</span>
                </span>
              </label>
            ))}
          </div>
          {(audience.noCard > 0 || audience.cooldown.length > 0) && (
            <div className="mt-3 space-y-1.5 rounded-xl bg-paper p-3 text-xs text-muted">
              {audience.noCard > 0 && (
                <p>
                  {audience.noCard} haven&apos;t added the wallet card, so they&apos;re skipped.
                </p>
              )}
              {audience.cooldown.length > 0 && (
                <details>
                  <summary className="cursor-pointer">
                    {audience.cooldown.length} got an offer in the last {venue.cooldownDays} days and will be skipped
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {audience.cooldown.map((c) => (
                      <li key={c.name + c.lastOfferAt} className="flex items-center gap-2">
                        <span className="text-ink">{c.name}</span>
                        <LabelChip label={c.label} />
                        <span>last offer {dayFormat.format(new Date(c.lastOfferAt))}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {venue.isDemo && <p className="mt-2 text-xs text-muted">Demo venue: demo guests are always included and the weekly limit is off.</p>}
        </fieldset>

        <fieldset>
          <legend className="font-display text-xl font-bold uppercase tracking-wide">2. Message</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OFFER_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplate(t.id);
                  setMessage(templates[t.id]);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  template === t.id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label htmlFor="offer-text" className="sr-only">
            Offer text
          </label>
          <textarea
            id="offer-text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setTemplate(null);
            }}
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-line bg-paper p-3 text-[15px] leading-snug focus:border-ink focus:outline-none"
          />
          <p className={`mt-1 text-right text-xs tabular-nums ${tooLong ? "font-semibold text-red-700" : "text-muted"}`}>
            {message.length} / {OFFER_MAX}
          </p>
        </fieldset>

        {result && !result.ok && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{result.message}</p>}
        <button
          type="button"
          disabled={!message.trim() || tooLong || audience.deliver === 0}
          onClick={() => setConfirming(true)}
          className={`${button.primary} h-12 w-full text-base`}
        >
          {audience.deliver === 0 ? "Nobody to send to yet" : `Send to ${audience.deliver} customer${audience.deliver === 1 ? "" : "s"}`}
        </button>
      </div>

      <div>
        <div className="mb-3 flex gap-1" role="tablist" aria-label="Preview">
          {(
            [
              ["iphone", "iPhone"],
              ["android", "Android"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={preview === id}
              onClick={() => setPreview(id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${preview === id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {preview === "iphone" ? (
          <IphoneOfferPreview venueName={venue.name} message={message} logoUrl={venue.logoUrl} cardBg={venue.cardBg} cardFg={venue.cardFg} />
        ) : (
          <AndroidOfferPreview venueName={venue.name} message={message} logoUrl={venue.logoUrl} cardBg={venue.cardBg} cardFg={venue.cardFg} />
        )}
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={quick ? "Send now?" : "Send offer?"}>
        <p className="text-lg font-semibold">
          Send to {audience.deliver} customer{audience.deliver === 1 ? "" : "s"}?
        </p>
        <p className="mt-2 rounded-xl bg-paper p-3 text-[15px] leading-snug">{message}</p>
        {!quick && (
          <p className="mt-2 text-xs text-muted">
            It appears on their wallet card and as a notification. You can&apos;t unsend it.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setConfirming(false)} className={`${button.secondary} flex-1`}>
            Cancel
          </button>
          <button type="button" disabled={pending || tooLong || audience.deliver === 0} onClick={send} className={`${button.primary} flex-[2]`}>
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {result && !result.ok && <p className="mt-3 text-sm text-red-700">{result.message}</p>}
      </Modal>
    </div>
  );
}
