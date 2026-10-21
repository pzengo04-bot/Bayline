"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { RewardFields } from "@/components/app/RewardFields";
import { ApplePassPreview, GooglePassPreview, type PassLook } from "@/components/wallet/PassPreview";
import { button, card } from "@/components/ui/styles";
import { formatPhone } from "@/lib/phone";
import type { Progress, RewardSettings } from "@/lib/rewards";
import { contrastRatio } from "@/lib/wallet/strip";
import { removeLogo, saveCard, uploadLogo, type SaveState } from "./actions";

type Props = {
  venueName: string;
  initial: RewardSettings & { card_bg: string; card_fg: string; card_accent: string; logo_url: string | null; phone: string | null };
};

const PRESETS = [
  { bg: "#0f1512", fg: "#ffffff", accent: "#c4f04a" },
  { bg: "#14365d", fg: "#ffffff", accent: "#f2c14e" },
  { bg: "#1f6b3a", fg: "#ffffff", accent: "#ffffff" },
  { bg: "#f6f5f0", fg: "#0f1512", accent: "#d9480f" },
  { bg: "#7a1f2b", fg: "#ffffff", accent: "#ffd6a5" },
];

function ColorField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-line bg-white pl-1.5 pr-3">
        <input type="color" name={name} value={value} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        <span className="font-mono text-sm uppercase text-muted">{value}</span>
      </span>
    </label>
  );
}

export function CardDesigner({ venueName, initial }: Props) {
  const [rewards, setRewards] = useState<RewardSettings>({
    reward_type: initial.reward_type,
    stamps_needed: initial.stamps_needed,
    points_per_dollar: initial.points_per_dollar,
    points_needed: initial.points_needed,
    reward_text: initial.reward_text,
    points_per_visit: initial.points_per_visit,
  });
  const [colors, setColors] = useState({ bg: initial.card_bg, fg: initial.card_fg, accent: initial.card_accent });
  const [logoUrl, setLogoUrl] = useState(initial.logo_url);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [view, setView] = useState<"apple" | "google">("apple");
  const [uploading, startUpload] = useTransition();
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCard, { status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const textContrast = contrastRatio(colors.fg, colors.bg);
  const accentContrast = contrastRatio(colors.accent, colors.bg);
  const sample: Progress = {
    reward_type: rewards.reward_type,
    reward_text: rewards.reward_text || "reward",
    stamps: Math.max(1, Math.min(3, (rewards.stamps_needed || 5) - 2)),
    stamps_needed: Math.max(2, rewards.stamps_needed || 5),
    points: Math.round((rewards.points_needed || 500) * 0.64),
    points_needed: Math.max(10, rewards.points_needed || 500),
  };
  const look: PassLook = { venueName, logoUrl, bg: colors.bg, fg: colors.fg, accent: colors.accent, firstName: "Mike", progress: sample };

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.set("logo", file);
    startUpload(async () => {
      setLogoMsg(null);
      const r = await uploadLogo(data);
      if (r.ok && r.url) setLogoUrl(r.url);
      else setLogoMsg(r.message ?? "Upload failed.");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-10">
      <form action={action} className="space-y-4">
        <section className={`${card} space-y-4 p-4 sm:p-5`}>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Look</h2>
          <div>
            <p className="text-sm font-semibold">Logo</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <div className="grid h-14 w-36 place-items-center overflow-hidden rounded-xl border border-line" style={{ background: colors.bg }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Current logo" className="max-h-10 max-w-[8rem] object-contain" />
                ) : (
                  <span className="text-xs" style={{ color: colors.fg }}>No logo</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml" className="sr-only" id="logo-file" onChange={(e) => onLogo(e.target.files?.[0])} />
              <label htmlFor="logo-file" className={`${button.secondary} cursor-pointer`}>
                {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload PNG or SVG"}
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => startUpload(async () => { if ((await removeLogo()).ok) setLogoUrl(null); })}
                  className="text-sm text-muted underline underline-offset-2"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted">A wide logo on a transparent background works best. Max 2 MB.</p>
            {logoMsg && <p className="mt-1 text-sm text-red-700">{logoMsg}</p>}
          </div>

          <div>
            <p className="text-sm font-semibold">Quick palettes</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.bg}
                  type="button"
                  onClick={() => setColors(p)}
                  aria-label={`Use ${p.bg} background`}
                  className="flex size-9 items-center justify-center rounded-full border border-line"
                  style={{ background: p.bg }}
                >
                  <span className="size-3 rounded-full" style={{ background: p.accent }} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField label="Background" name="card_bg" value={colors.bg} onChange={(bg) => setColors((c) => ({ ...c, bg }))} />
            <ColorField label="Text" name="card_fg" value={colors.fg} onChange={(fg) => setColors((c) => ({ ...c, fg }))} />
            <ColorField label="Stamps" name="card_accent" value={colors.accent} onChange={(accent) => setColors((c) => ({ ...c, accent }))} />
          </div>
          {textContrast < 4.5 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The text color is hard to read on this background (contrast {textContrast.toFixed(1)}:1, aim for 4.5 or more).
            </p>
          )}
          {accentContrast < 2 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Filled stamps will be hard to see on this background.</p>
          )}
        </section>

        <section className={`${card} space-y-4 p-4 sm:p-5`}>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Rewards</h2>
          <RewardFields value={rewards} onChange={setRewards} />
        </section>

        <section className={`${card} space-y-2 p-4 sm:p-5`}>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Venue</h2>
          <label className="block text-sm font-semibold">
            Venue phone
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={initial.phone ? formatPhone(initial.phone) : ""}
              placeholder="(555) 555-5555"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-base focus:border-ink focus:outline-none"
            />
          </label>
        </section>

        {state.status !== "idle" && (
          <p className={`rounded-xl px-3 py-2.5 text-sm ${state.status === "ok" ? "bg-accent/40" : "bg-red-50 text-red-800"}`}>{state.message}</p>
        )}
        <button type="submit" disabled={pending} className={`${button.primary} w-full sm:w-auto`}>
          {pending ? "Saving…" : "Save card"}
        </button>
      </form>

      <div className="lg:sticky lg:top-6">
        <div className="mx-auto mb-4 flex max-w-[320px] gap-1" role="tablist" aria-label="Preview">
          {(
            [
              ["apple", "iPhone"],
              ["google", "Android"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${view === id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex justify-center rounded-3xl bg-[#e9e8e3] px-4 py-8">
          {view === "apple" ? <ApplePassPreview look={look} /> : <GooglePassPreview look={look} />}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Live preview with a sample customer. {view === "google" ? "Google picks the text color for contrast." : ""}
        </p>
      </div>
    </div>
  );
}
