"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { RewardFields } from "@/components/app/RewardFields";
import { ApplePassPreview, GooglePassPreview, type PassLook } from "@/components/wallet/PassPreview";
import { button, card } from "@/components/ui/styles";
import { formatHour } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { milestoneAt, type Progress, type RewardSettings } from "@/lib/rewards";
import { contrastRatio } from "@/lib/wallet/strip";
import { iconSvg, STAMP_ICONS, stampIconFor, type StampIcon } from "@/lib/wallet/stamp-icons";
import { removeLogo, saveCard, uploadLogo, type SaveState } from "./actions";

type Props = {
  venueName: string;
  initial: RewardSettings & {
    card_bg: string;
    card_fg: string;
    card_accent: string;
    logo_url: string | null;
    phone: string | null;
    open_hour: number | null;
    close_hour: number | null;
    offer_cooldown_days: number;
    logo_text: string | null;
    address: string | null;
    website: string | null;
    milestone_text: string | null;
    milestone_at: number | null;
    head_start_stamps: number;
    stamp_icon: string | null;
    type: string;
  };
};

const SAMPLE_OFFER_END = "2026-10-28T23:59:00-04:00";

const PRESETS = [
  { bg: "#0f1512", fg: "#ffffff", accent: "#c4f04a" },
  { bg: "#14365d", fg: "#ffffff", accent: "#f2c14e" },
  { bg: "#1f6b3a", fg: "#ffffff", accent: "#ffffff" },
  { bg: "#f6f5f0", fg: "#0f1512", accent: "#d9480f" },
  { bg: "#7a1f2b", fg: "#ffffff", accent: "#ffd6a5" },
];

const pickerPaths = (key: StampIcon) => {
  const def: { paths: string[]; outline?: string } = STAMP_ICONS[key];
  return def.outline ? [def.outline, ...def.paths] : def.paths;
};

/** "a free pitcher" → "free pitcher" (for "1 free pitcher"). */
const stripArticle = (s: string) => s.trim().replace(/^(a|an|the)\s+/i, "");

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
  const [side, setSide] = useState<"front" | "back">("front");
  const [withOffer, setWithOffer] = useState(false);
  const [sampleState, setSampleState] = useState<"progress" | "milestone" | "ready">("progress");
  const [milestone, setMilestone] = useState({
    on: Boolean(initial.milestone_text),
    text: initial.milestone_text ?? "",
    at: initial.milestone_at ?? 0,
  });
  const [stampIcon, setStampIcon] = useState<StampIcon>(stampIconFor(initial));
  const [headStart, setHeadStart] = useState({ on: initial.head_start_stamps > 0, n: initial.head_start_stamps || 1 });
  const [details, setDetails] = useState({
    logoText: initial.logo_text ?? "",
    address: initial.address ?? "",
    website: initial.website ?? "",
    phone: initial.phone ? formatPhone(initial.phone) : "",
  });
  const [uploading, startUpload] = useTransition();
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCard, { status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const textContrast = contrastRatio(colors.fg, colors.bg);
  const accentContrast = contrastRatio(colors.accent, colors.bg);
  const stampsGoal = Math.max(2, rewards.stamps_needed || 5);
  const pointsGoal = Math.max(10, rewards.points_needed || 500);
  const goal = rewards.reward_type === "stamps" ? stampsGoal : pointsGoal;
  // Default: halfway, rounded down; kept inside the allowed range when the goal changes.
  const milestonePos = milestoneAt(rewards.reward_type, goal, milestone.at);
  const milestoneOn = milestone.on && milestonePos !== null;
  const msAt = milestonePos ?? 2;
  const milestoneText = milestone.text.trim() || "free drink";
  const sampleHave =
    sampleState === "ready" ? goal : sampleState === "milestone" && milestoneOn ? msAt : Math.max(1, Math.round(goal * 0.3));
  const sample: Progress = {
    reward_type: rewards.reward_type,
    reward_text: rewards.reward_text || "reward",
    stamps: Math.min(stampsGoal, sampleHave),
    stamps_needed: stampsGoal,
    points: Math.min(pointsGoal, sampleHave),
    points_needed: pointsGoal,
    reward_ready: sampleState === "ready",
    milestone: milestoneOn
      ? { at: msAt, text: milestoneText, ready: sampleState === "milestone" }
      : null,
  };
  const costLine =
    rewards.reward_type === "stamps"
      ? `You'll give ${milestoneOn ? `1 ${stripArticle(milestoneText)} + ` : ""}1 ${stripArticle(rewards.reward_text || "reward")} every ${stampsGoal} visits.`
      : `You'll give ${milestoneOn ? `1 ${stripArticle(milestoneText)} + ` : ""}1 ${stripArticle(rewards.reward_text || "reward")} every ${pointsGoal} points.`;
  const look: PassLook = {
    venueName,
    logoUrl,
    logoText: details.logoText.trim() || null,
    bg: colors.bg,
    fg: colors.fg,
    accent: colors.accent,
    firstName: "Mike",
    progress: sample,
    venue: {
      name: venueName,
      reward_type: rewards.reward_type,
      reward_text: rewards.reward_text || "reward",
      address: details.address.trim() || null,
      phone: details.phone.trim() ? `+1${details.phone.replace(/\D/g, "").slice(-10)}` : null,
      website: details.website.trim() || null,
      type: initial.type,
      stamp_icon: stampIcon,
    },
    offer: withOffer
      ? { text: `We miss you at ${venueName}! Come back this week for a bonus stamp on any visit.`, short: "Bonus stamp on any visit this week", expires_at: SAMPLE_OFFER_END }
      : null,
  };

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
            <label className="mt-3 block text-sm font-semibold">
              Text next to logo <span className="font-normal text-muted">(optional, iPhone; e.g. your name beside a symbol)</span>
              <input
                name="logo_text"
                maxLength={24}
                value={details.logoText}
                onChange={(e) => setDetails((d) => ({ ...d, logoText: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-base font-normal focus:border-ink focus:outline-none"
              />
            </label>
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
          <fieldset>
            <legend className="text-sm font-semibold">Stamp icon</legend>
            <input type="hidden" name="stamp_icon" value={stampIcon} />
            <div className="mt-1.5 grid grid-cols-6 gap-2 sm:grid-cols-11">
              {(Object.keys(STAMP_ICONS) as StampIcon[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={stampIcon === key}
                  aria-label={STAMP_ICONS[key].label}
                  title={STAMP_ICONS[key].label}
                  onClick={() => setStampIcon(key)}
                  className={`grid aspect-square place-items-center rounded-xl border ${stampIcon === key ? "border-ink bg-ink" : "border-line bg-white hover:border-ink/40"}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: iconSvg(pickerPaths(key), 12, 12, 24, stampIcon === key ? "#ffffff" : "#0f1512") }}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Each visit fills one in. The milestone shows a gift and the last stamp a trophy.</p>
          </fieldset>
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

          <div className="rounded-xl border border-line p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="milestone_on"
                checked={milestone.on}
                onChange={(e) => setMilestone((m) => ({ ...m, on: e.target.checked }))}
                className="size-4 accent-[var(--ink)]"
              />
              Add a milestone reward
            </label>
            <p className="mt-1 text-xs text-muted">A smaller reward partway through the card keeps people coming back.</p>
            {milestone.on && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <label className="block text-xs text-muted">
                  Milestone reward
                  <input
                    name="milestone_text"
                    maxLength={40}
                    value={milestone.text}
                    onChange={(e) => setMilestone((m) => ({ ...m, text: e.target.value }))}
                    placeholder="free pitcher"
                    className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-ink focus:outline-none"
                  />
                </label>
                <label className="block text-xs text-muted">
                  {rewards.reward_type === "stamps" ? "Unlocks at stamp" : "Unlocks at points"}
                  {rewards.reward_type === "stamps" ? (
                    <select
                      name="milestone_at"
                      value={msAt}
                      onChange={(e) => setMilestone((m) => ({ ...m, at: Number(e.target.value) }))}
                      className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink"
                    >
                      {Array.from({ length: Math.max(0, stampsGoal - 2) }, (_, i) => i + 2).map((n) => (
                        <option key={n} value={n}>
                          {n} of {stampsGoal}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="milestone_at"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={pointsGoal - 1}
                      value={msAt}
                      onChange={(e) => setMilestone((m) => ({ ...m, at: Number(e.target.value) }))}
                      className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-ink focus:outline-none"
                    />
                  )}
                </label>
              </div>
            )}
            <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm">{costLine}</p>
          </div>

          {rewards.reward_type === "stamps" && (
            <div className="rounded-xl border border-line p-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="head_start_on"
                  checked={headStart.on}
                  onChange={(e) => setHeadStart((h) => ({ ...h, on: e.target.checked }))}
                  className="size-4 accent-[var(--ink)]"
                />
                Give new members a head start
              </label>
              <p className="mt-1 text-xs text-muted">Free stamps on joining. They don&apos;t count as visits in your insights.</p>
              {headStart.on && (
                <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Head start stamps">
                  {[1, 2].map((n) => (
                    <label
                      key={n}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold ${headStart.n === n ? "bg-ink text-white" : "bg-ink/[0.06] text-muted"}`}
                    >
                      <input type="radio" name="head_start_stamps" value={n} checked={headStart.n === n} onChange={() => setHeadStart({ on: true, n })} className="sr-only" />
                      {n} free stamp{n === 1 ? "" : "s"}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`${card} space-y-4 p-4 sm:p-5`}>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Venue</h2>
          <fieldset>
            <legend className="text-sm font-semibold">
              Opening hours <span className="font-normal text-muted">(optional: quiet-hour tips stay inside them)</span>
            </legend>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {(
                [
                  ["open_hour", "Opens", initial.open_hour, Array.from({ length: 24 }, (_, h) => h)],
                  ["close_hour", "Closes", initial.close_hour, Array.from({ length: 24 }, (_, h) => h + 1)],
                ] as const
              ).map(([name, label, value, hours]) => (
                <label key={name} className="block text-xs text-muted">
                  {label}
                  <select
                    name={name}
                    defaultValue={value ?? ""}
                    className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink"
                  >
                    <option value="">Not set</option>
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h === 24 ? "Midnight" : h === 12 ? "Noon" : formatHour(h)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">
            Offers per customer
            <span className="mt-1.5 flex items-center gap-2 text-sm font-normal text-muted">
              At most one every
              <input
                name="offer_cooldown_days"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                defaultValue={initial.offer_cooldown_days}
                className="h-11 w-20 rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-ink focus:outline-none"
              />
              days
            </span>
          </label>
          {(
            [
              ["phone", "Venue phone", "(555) 555-5555", "tel"],
              ["address", "Address", "123 Main St, Springfield", "text"],
              ["website", "Website", "https://example.com", "url"],
            ] as const
          ).map(([name, label, placeholder, type]) => (
            <label key={name} className="block text-sm font-semibold">
              {label} <span className="font-normal text-muted">(shown on the back of the card)</span>
              <input
                name={name}
                type={type}
                inputMode={type === "tel" ? "tel" : undefined}
                value={details[name]}
                onChange={(e) => setDetails((d) => ({ ...d, [name]: e.target.value }))}
                placeholder={placeholder}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-base font-normal focus:border-ink focus:outline-none"
              />
            </label>
          ))}
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
        <div className="mx-auto mb-3 flex max-w-[320px] items-center justify-between gap-2">
          <div className="flex gap-1" role="group" aria-label="Side">
            {(["front", "back"] as const).map((sd) => (
              <button
                key={sd}
                type="button"
                aria-pressed={side === sd}
                onClick={() => setSide(sd)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${side === sd ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"}`}
              >
                {sd}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={withOffer} onChange={(e) => setWithOffer(e.target.checked)} className="accent-[var(--ink)]" />
            Show with an offer
          </label>
        </div>
        <div className="mx-auto mb-3 flex max-w-[320px] gap-1" role="group" aria-label="Sample customer">
          {(
            [
              ["progress", "In progress"],
              ...(milestoneOn ? ([["milestone", "Milestone"]] as const) : []),
              ["ready", "Reward ready"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sampleState === id}
              onClick={() => setSampleState(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${sampleState === id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex justify-center rounded-3xl bg-[#e9e8e3] px-4 py-8">
          {view === "apple" ? <ApplePassPreview look={look} side={side} /> : <GooglePassPreview look={look} side={side} />}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Live preview with a sample customer. {view === "google" ? "Google picks the text color for contrast." : ""}
        </p>
      </div>
    </div>
  );
}
