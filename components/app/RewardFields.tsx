"use client";

import type { RewardSettings } from "@/lib/rewards";

type Props = {
  value: RewardSettings;
  onChange: (next: RewardSettings) => void;
};

const input =
  "mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-base focus:border-ink focus:outline-none";

/** Reward type + numbers. Controlled, and also posts as regular form fields. */
export function RewardFields({ value, onChange }: Props) {
  const set = <K extends keyof RewardSettings>(key: K, v: RewardSettings[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">Reward type</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              ["stamps", "Visit stamps", "Every check-in earns a stamp"],
              ["points", "Points per dollar", "Staff enter the amount spent"],
            ] as const
          ).map(([type, label, hint]) => (
            <label
              key={type}
              className={`cursor-pointer rounded-xl border p-3 text-sm ${
                value.reward_type === type ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"
              }`}
            >
              <input
                type="radio"
                name="reward_type"
                value={type}
                checked={value.reward_type === type}
                onChange={() => set("reward_type", type)}
                className="sr-only"
              />
              <span className="block font-semibold">{label}</span>
              <span className={`mt-0.5 block text-xs ${value.reward_type === type ? "text-white/70" : "text-muted"}`}>{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {value.reward_type === "stamps" ? (
        <label className="block text-sm font-semibold">
          Visits needed for a reward
          <input
            name="stamps_needed"
            type="number"
            inputMode="numeric"
            min={2}
            max={50}
            required
            value={value.stamps_needed}
            onChange={(e) => set("stamps_needed", Number(e.target.value))}
            className={input}
          />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Points per $1
            <input
              name="points_per_dollar"
              type="number"
              inputMode="decimal"
              min={0.01}
              max={100}
              step={0.01}
              required
              value={value.points_per_dollar}
              onChange={(e) => set("points_per_dollar", Number(e.target.value))}
              className={input}
            />
          </label>
          <label className="block text-sm font-semibold">
            Points for a reward
            <input
              name="points_needed"
              type="number"
              inputMode="numeric"
              min={10}
              max={100000}
              required
              value={value.points_needed}
              onChange={(e) => set("points_needed", Number(e.target.value))}
              className={input}
            />
          </label>
        </div>
      )}
      {/* Keep the other type's numbers in the form so they're saved unchanged. */}
      {value.reward_type === "stamps" ? (
        <>
          <input type="hidden" name="points_per_dollar" value={value.points_per_dollar} />
          <input type="hidden" name="points_needed" value={value.points_needed} />
        </>
      ) : (
        <input type="hidden" name="stamps_needed" value={value.stamps_needed} />
      )}

      <label className="block text-sm font-semibold">
        Reward
        <input
          name="reward_text"
          maxLength={60}
          required
          value={value.reward_text}
          onChange={(e) => set("reward_text", e.target.value)}
          placeholder="free bay hour"
          className={input}
        />
        <span className="mt-1 block text-xs font-normal text-muted">Shown as &ldquo;2 more for a {value.reward_text || "…"}&rdquo;</span>
      </label>
    </div>
  );
}
