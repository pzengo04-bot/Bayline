// US/Canada phone numbers, stored as +1XXXXXXXXXX.

/** "(914) 555-0123", "914.555.0123", "1 914 555 0123" -> "+19145550123", or null if it isn't a valid number. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[2-9]/.test(digits)) return null;
  return `+1${digits}`;
}

/** "+19145550123" -> "(914) 555-0123" */
export function formatPhone(e164: string) {
  const d = e164.replace(/^\+1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
