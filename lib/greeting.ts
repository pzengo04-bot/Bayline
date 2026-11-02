/** "Good evening, Peter": the time of day where the venue is, and the signed-in person's first name. */
export function greetingFor(user: { email: string; name?: string | null }, timeZone: string, now = Date.now()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date(now)));
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const raw = user.name?.trim().split(/\s+/)[0] || user.email.split("@")[0].split(/[._+-]/)[0].replace(/\d+$/, "");
  const first = raw ? raw[0].toUpperCase() + raw.slice(1) : "";
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}
