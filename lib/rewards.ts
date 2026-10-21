// Shared reward types and wording, used by the join page, wallet passes, the dashboard and the settings preview.

export type RewardType = "stamps" | "points";

export type RewardSettings = {
  reward_type: RewardType;
  stamps_needed: number;
  points_per_dollar: number;
  points_needed: number;
  reward_text: string;
  points_per_visit?: number;
};

/** An optional reward partway through the card (e.g. a free pitcher at stamp 5). */
export type Milestone = {
  /** The stamp (or points total) that unlocks it. */
  at: number;
  text: string;
  /** Reached this card cycle and not redeemed yet. */
  ready: boolean;
  redeemed?: boolean;
};

export type Progress = {
  reward_type: RewardType;
  reward_text: string;
  stamps: number;
  stamps_needed: number;
  points: number;
  points_needed: number;
  /** The card is full (stamps) or has enough points: staff can redeem. */
  reward_ready?: boolean;
  milestone?: Milestone | null;
};

export const isRewardReady = (p: Progress) =>
  p.reward_ready ?? (p.reward_type === "stamps" ? p.stamps >= p.stamps_needed : p.points >= p.points_needed);

/** "3 of 5 visits, 2 more for a free bay hour" or "320 of 500 points" */
export function progressText(p: Progress) {
  if (isRewardReady(p)) return `Reward ready: ${p.reward_text}`;
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
    : s.points_per_visit
      ? `${formatRate(s.points_per_visit)} per visit · ${s.points_needed} points = ${s.reward_text}`
      : `${formatRate(s.points_per_dollar)} per $1 · ${s.points_needed} points = ${s.reward_text}`;
}

const formatRate = (n: number) => `${Number(n)} point${Number(n) === 1 ? "" : "s"}`;

/**
 * Where the milestone sits: the venue's choice if it's valid, else halfway (rounded down). Stamp
 * cards allow stamp 2 up to one before the last; points allow 1 up to one below the goal.
 */
export function milestoneAt(type: RewardType, goal: number, chosen?: number | null) {
  const min = type === "stamps" ? 2 : 1;
  const max = goal - 1;
  if (max < min) return null;
  const at = chosen && Number.isFinite(chosen) ? Math.round(chosen) : Math.floor(goal / 2);
  return Math.min(max, Math.max(min, at));
}
