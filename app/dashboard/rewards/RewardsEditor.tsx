"use client";

import { useActionState, useState } from "react";
import { RewardFields } from "@/components/app/RewardFields";
import { RewardReadyScreen, TapResultScreen, VenueHeading } from "@/components/checkin/screens";
import { PhoneFrame } from "@/components/customer/PhoneFrame";
import { button, card } from "@/components/ui/styles";
import { programSummary, type Progress, type RewardSettings } from "@/lib/rewards";
import { saveRewards, type SaveState } from "./actions";

type Props = { venueName: string; initial: RewardSettings };

/** Settings form beside a phone preview of what customers see after checking in. */
export function RewardsEditor({ venueName, initial }: Props) {
  const [settings, setSettings] = useState(initial);
  const [view, setView] = useState<"welcome" | "unlocked">("welcome");
  const [state, action, pending] = useActionState<SaveState, FormData>(saveRewards, { status: "idle" });

  const valid =
    settings.reward_text.trim().length > 0 &&
    (settings.reward_type === "stamps"
      ? settings.stamps_needed >= 2 && settings.stamps_needed <= 50
      : settings.points_per_dollar > 0 && settings.points_needed >= 10);
  const sample: Progress = {
    reward_type: settings.reward_type,
    reward_text: settings.reward_text || "reward",
    stamps: Math.max(1, Math.min(3, (settings.stamps_needed || 5) - 2)),
    stamps_needed: Math.max(2, settings.stamps_needed || 5),
    points: Math.round((settings.points_needed || 500) * 0.64),
    points_needed: Math.max(10, settings.points_needed || 500),
  };
  const switched = settings.reward_type !== initial.reward_type;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-10">
      <form action={action} className={`${card} space-y-5 p-4 sm:p-6`}>
        <RewardFields value={settings} onChange={setSettings} />
        {switched && (
          <p className="rounded-xl bg-paper px-3 py-2.5 text-sm">
            {settings.reward_type === "points"
              ? "Points come from the amounts staff enter on Add visit. QR check-ins still count as visits but earn no points."
              : "Stamps count every visit since a customer's last reward, including past visits."}
          </p>
        )}
        {state.status !== "idle" && (
          <p className={`rounded-xl px-3 py-2.5 text-sm ${state.status === "ok" ? "bg-accent/40" : "bg-red-50 text-red-800"}`}>
            {state.message}
          </p>
        )}
        <button type="submit" disabled={pending || !valid} className={`${button.primary} w-full sm:w-auto`}>
          {pending ? "Saving…" : "Save rewards"}
        </button>
      </form>

      <div>
        <div className="mx-auto mb-3 flex max-w-[340px] gap-1" role="tablist" aria-label="Preview">
          {(
            [
              ["welcome", "After check-in"],
              ["unlocked", "Reward unlocked"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${
                view === id ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <PhoneFrame>
          <div className="flex-1 overflow-y-auto bg-paper px-5 pb-5 pt-6">
            <VenueHeading name={venueName} />
            <p className="mt-2 text-center text-sm font-medium text-accent-strong">{programSummary(settings)}</p>
            <div className="mt-6">
              {view === "welcome" ? (
                <TapResultScreen result={{ status: "stamped", firstName: "Mike", progress: sample }} />
              ) : (
                <RewardReadyScreen firstName="Mike" progress={{ ...sample, reward_ready: true }} />
              )}
            </div>
          </div>
        </PhoneFrame>
        <p className="mt-3 text-center text-xs text-muted">Live preview with a sample customer</p>
      </div>
    </div>
  );
}
