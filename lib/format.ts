const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const formatMoney = (n: number) => currency.format(n);

export const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

/** 14 -> "2pm", 12 -> "12pm", 10 -> "10am" */
export function formatHour(h: number, compact = false) {
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return compact ? `${hour}${suffix[0]}` : `${hour}${suffix}`;
}

/** 14, 17 -> "2–5pm"; 11, 14 -> "11am–2pm" */
export function formatHourRange(start: number, end: number) {
  const sameHalf = (start >= 12) === (end >= 12);
  const s = sameHalf ? String(start % 12 === 0 ? 12 : start % 12) : formatHour(start);
  return `${s}–${formatHour(end)}`;
}

export function formatDaysAgo(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** "2026-09-14" -> "Sept 14" */
export function formatShortDate(iso: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const [, m, d] = iso.split("-").map(Number);
  return `${months[m - 1]} ${d}`;
}

/** Digits only -> "(555) 201-4417" as the user types. */
export function formatPhoneInput(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export const phoneDigits = (s: string) => s.replace(/\D/g, "");

/** Whole days since an ISO timestamp. */
export function daysSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
}

/** Calendar days between an ISO timestamp and now in a time zone: last night at 11pm is "yesterday". */
export function calendarDaysSince(iso: string, timeZone: string, now = Date.now()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone }); // YYYY-MM-DD
  return Math.max(0, Math.round((Date.parse(day.format(new Date(now))) - Date.parse(day.format(new Date(iso)))) / 86_400_000));
}

/** ISO timestamp for N days before now. */
export const isoDaysAgo = (days: number, now = Date.now()) => new Date(now - days * 86_400_000).toISOString();
