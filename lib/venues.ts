import type { RewardSettings, RewardType } from "./rewards";

export const VENUE_TYPES = [
  { value: "golf_sim", label: "Golf simulators", reward: "free bay hour" },
  { value: "pickleball", label: "Pickleball / padel", reward: "free court hour" },
  { value: "batting_cages", label: "Batting cages", reward: "free cage session" },
  { value: "cafe", label: "Café / coffee shop", reward: "free drink" },
  { value: "barbershop", label: "Barbershop / salon", reward: "free haircut" },
  { value: "fitness", label: "Gym / fitness studio", reward: "free class" },
  { value: "pet", label: "Pet grooming", reward: "free bath" },
  { value: "car_wash", label: "Car wash", reward: "free wash" },
  { value: "dessert", label: "Ice cream / dessert", reward: "free scoop" },
  { value: "other", label: "Other", reward: "free visit" },
] as const;

export const TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
] as const;

export const venueTypeLabel = (t: string) => VENUE_TYPES.find((v) => v.value === t)?.label ?? "Other";

/** "Fairway Lounge & Bar" -> "fairway-lounge-bar" */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates reward settings from a form, matching the database's limits. */
export function parseRewardSettings(form: FormData): Parsed<RewardSettings> {
  const reward_type = String(form.get("reward_type")) as RewardType;
  const stamps_needed = Number(form.get("stamps_needed"));
  const points_per_dollar = Number(form.get("points_per_dollar"));
  const points_needed = Number(form.get("points_needed"));
  const reward_text = String(form.get("reward_text") ?? "").trim();

  if (reward_type !== "stamps" && reward_type !== "points") return { ok: false, error: "Pick a reward type." };
  if (!reward_text || reward_text.length > 60) return { ok: false, error: "Describe the reward in 60 characters or less." };
  if (reward_type === "stamps" && !(Number.isInteger(stamps_needed) && stamps_needed >= 2 && stamps_needed <= 50)) {
    return { ok: false, error: "Visits needed must be a whole number from 2 to 50." };
  }
  if (reward_type === "points") {
    if (!(points_per_dollar > 0 && points_per_dollar <= 100)) return { ok: false, error: "Points per $1 must be between 0.01 and 100." };
    if (!(Number.isInteger(points_needed) && points_needed >= 10 && points_needed <= 100000)) {
      return { ok: false, error: "Points needed must be a whole number from 10 to 100,000." };
    }
  }
  return {
    ok: true,
    value: {
      reward_type,
      reward_text,
      // Keep the other type's numbers valid so switching back later just works.
      stamps_needed: Number.isInteger(stamps_needed) && stamps_needed >= 2 && stamps_needed <= 50 ? stamps_needed : 5,
      points_per_dollar: points_per_dollar > 0 && points_per_dollar <= 100 ? Math.round(points_per_dollar * 100) / 100 : 1,
      points_needed: Number.isInteger(points_needed) && points_needed >= 10 && points_needed <= 100000 ? points_needed : 500,
    },
  };
}
