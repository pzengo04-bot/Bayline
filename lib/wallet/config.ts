import "server-only";

// Wallet credentials come from environment variables (see docs/SETUP.md). Each platform switches
// on only when all of its settings are present, so the rest of the app works before approvals land.

const b64 = (name: string) => {
  const v = process.env[name];
  return v ? Buffer.from(v, "base64").toString("utf8") : null;
};

export function appleConfig() {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const cert = b64("APPLE_PASS_CERT_BASE64");
  const key = b64("APPLE_PASS_KEY_BASE64");
  const wwdr = b64("APPLE_WWDR_CERT_BASE64");
  if (!passTypeId || !teamId || !cert || !key || !wwdr) return null;
  return { passTypeId, teamId, cert, key, wwdr, keyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE };
}

export function googleConfig() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  // Accept the key as base64 (as documented) or as the raw JSON file contents.
  const value = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64?.trim();
  const raw = value?.startsWith("{") ? value : b64("GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64");
  if (!issuerId || !raw) return null;
  try {
    const sa = JSON.parse(raw) as { client_email: string; private_key: string };
    return { issuerId, clientEmail: sa.client_email, privateKey: sa.private_key };
  } catch {
    return null;
  }
}

export const walletAvailability = () => ({ apple: Boolean(appleConfig()), google: Boolean(googleConfig()) });
