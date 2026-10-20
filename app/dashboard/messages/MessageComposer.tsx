"use client";

import { useState } from "react";
import { button, card } from "@/components/ui/styles";
import { AUDIENCES, smsSegments, STOP_LINE, TEMPLATES, withStopLine, type AudienceId, type TemplateId } from "@/lib/messages";

type Props = {
  counts: Record<AudienceId, { optedIn: number; total: number }>;
  templates: Record<TemplateId, string>;
  initialAudience: AudienceId;
  initialTemplate: TemplateId;
};

export function MessageComposer({ counts, templates, initialAudience, initialTemplate }: Props) {
  const [audience, setAudience] = useState<AudienceId>(initialAudience);
  const [template, setTemplate] = useState<TemplateId>(initialTemplate);
  const [body, setBody] = useState(templates[initialTemplate]);
  const [copied, setCopied] = useState(false);
  const full = withStopLine(body);
  const segments = smsSegments(full);
  const count = counts[audience];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text is selectable in the preview below.
    }
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={`${card} space-y-5 p-4 sm:p-5`}>
        <fieldset>
          <legend className="font-display text-xl font-bold uppercase tracking-wide">1. Audience</legend>
          <div className="mt-2 space-y-2">
            {AUDIENCES.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${
                  audience === a.id ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"
                }`}
              >
                <input type="radio" name="audience" value={a.id} checked={audience === a.id} onChange={() => setAudience(a.id)} className="sr-only" />
                <span>
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className={`block text-xs ${audience === a.id ? "text-white/70" : "text-muted"}`}>{a.hint}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-2xl font-bold leading-none tabular-nums">{counts[a.id].optedIn}</span>
                  <span className={`block text-[11px] ${audience === a.id ? "text-white/70" : "text-muted"}`}>
                    of {counts[a.id].total} opted in
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-xl font-bold uppercase tracking-wide">2. Message</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplate(t.id);
                  setBody(templates[t.id]);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  template === t.id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label htmlFor="message-body" className="sr-only">
            Message text
          </label>
          <textarea
            id="message-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="mt-3 w-full resize-y rounded-xl border border-line bg-paper p-3 text-[15px] leading-snug focus:border-ink focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">
            &ldquo;{STOP_LINE}&rdquo; is always added at the end.
          </p>
        </fieldset>
      </div>

      <div className={`${card} p-4 sm:p-5`}>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">3. Copy and send</h2>
        <div className="mt-3 rounded-2xl bg-[#f2f2f4] p-3">
          <div className="max-w-[90%] select-all whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-snug shadow-sm">
            {full}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {full.length} characters · {segments} text message{segments === 1 ? "" : "s"} per person
          {segments > 1 ? " (shorter is cheaper)" : ""}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={copy} className={`${button.primary} flex-1`}>
            {copied ? "Copied!" : "Copy message"}
          </button>
          <a
            href={count.optedIn ? `/dashboard/messages/export?audience=${audience}` : undefined}
            aria-disabled={!count.optedIn}
            className={`${button.secondary} flex-1 ${count.optedIn ? "" : "pointer-events-none opacity-50"}`}
          >
            Export list ({count.optedIn}) CSV
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          The list only includes customers who agreed to texts. Send from your own texting tool, and if anyone replies
          STOP, mark them as opted out in Customers on the dashboard.
        </p>
        <p className="mt-4 rounded-xl bg-accent/30 px-3 py-2.5 text-sm font-medium">Sending directly from Bayline is coming soon.</p>
      </div>
    </div>
  );
}
