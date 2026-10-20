// Shared reward types and wording, used by the check-in page, the dashboard and the settings preview.

export type RewardType = "stamps" | "points";

export type RewardSettings = {
  reward_type: RewardType;
  stamps_needed: number;
  points_per_dollar: number;
  points_needed: number;
  reward_text: string;
};

export type Progress = {
  reward_type: RewardType;
  reward_text: string;
  stamps: number;
  stamps_needed: number;
  points: number;
  points_needed: number;
};

/** "3 of 5 visits, 2 more for a free bay hour" or "320 of 500 points" */
export function progressText(p: Progress) {
  if (p.reward_type === "points") {
    return p.points >= p.points_needed
      ? `${p.points} points, enough for a ${p.reward_text}`
      : `${p.points} of ${p.points_needed} points`;
  }
  const left = p.stamps_needed - p.stamps;
  return `${p.stamps} of ${p.stamps_needed} visits, ${left} more for a ${p.reward_text}`;
}

/** One-line description of the program, e.g. "5 visits = free bay hour". */
export function programSummary(s: RewardSettings) {
  return s.reward_type === "stamps"
    ? `${s.stamps_needed} visits = ${s.reward_text}`
    : `${formatRate(s.points_per_dollar)} per $1 · ${s.points_needed} points = ${s.reward_text}`;
}

const formatRate = (n: number) => `${Number(n)} point${Number(n) === 1 ? "" : "s"}`;
