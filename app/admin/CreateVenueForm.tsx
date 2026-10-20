"use client";

import { startTransition, useActionState, useState } from "react";
import { RewardFields } from "@/components/app/RewardFields";
import { button } from "@/components/ui/styles";
import type { RewardSettings } from "@/lib/rewards";
import { slugify, TIMEZONES, VENUE_TYPES } from "@/lib/venues";
import { createVenue, type FormState } from "./actions";

const input = "mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-base focus:border-ink focus:outline-none";

export function CreateVenueForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createVenue, { status: "idle" });
  // A new key after each successful create gives the next venue a fresh, empty form.
  const formKey = state.status === "ok" ? state.message : "draft";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        // Submit by hand so React doesn't auto-reset the fields (that would desync the dropdowns on errors).
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <VenueFields key={formKey} />
      {state.status !== "idle" && (
        <p className={`rounded-xl px-3 py-2.5 text-sm ${state.status === "ok" ? "bg-accent/40" : "bg-red-50 text-red-800"}`}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${button.primary} w-full sm:w-auto`}>
        {pending ? "Creating…" : "Create venue"}
      </button>
    </form>
  );
}

function VenueFields() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [type, setType] = useState<string>("golf_sim");
  const [rewards, setRewards] = useState<RewardSettings>({
    reward_type: "stamps",
    stamps_needed: 5,
    points_per_dollar: 1,
    points_needed: 500,
    reward_text: "free bay hour",
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Venue name
          <input
            name="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            className={input}
          />
        </label>
        <label className="block text-sm font-semibold">
          Check-in address
          <div className="mt-1.5 flex h-11 items-center rounded-xl border border-line bg-white pl-3 focus-within:border-ink">
            <span className="shrink-0 text-sm text-muted">/v/</span>
            <input
              name="slug"
              required
              maxLength={50}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              className="h-full min-w-0 flex-1 bg-transparent pr-3 text-base focus:outline-none"
            />
          </div>
        </label>
        <label className="block text-sm font-semibold">
          Venue type
          <select
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              const reward = VENUE_TYPES.find((t) => t.value === e.target.value)?.reward;
              if (reward) setRewards((r) => ({ ...r, reward_text: reward }));
            }}
            className={input}
          >
            {VENUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Time zone
          <select name="timezone" defaultValue="America/New_York" className={input}>
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <RewardFields value={rewards} onChange={setRewards} />

      <label className="block text-sm font-semibold">
        Owner email <span className="font-normal text-muted">(they&apos;ll get an invite)</span>
        <input name="owner_email" type="email" autoComplete="off" className={input} />
      </label>
    </>
  );
}
