// Customers are recognized on return by a long-lived, httpOnly cookie per venue holding a random token.
export const returnCookieName = (venueId: string) => `bl_${venueId.replace(/-/g, "").slice(0, 12)}`;

export const RETURN_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // browsers cap cookies at ~400 days

export const isToken = (v: string | undefined): v is string => /^[0-9a-f-]{36}$/.test(v ?? "");
