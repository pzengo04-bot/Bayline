// Reads required environment variables with a clear error when one is missing.
function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name}. See docs/SETUP.md.`);
  return value;
}

// NEXT_PUBLIC_ values must be referenced literally so Next.js can inline them.
export const supabaseUrl = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabasePublishableKey = () =>
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
