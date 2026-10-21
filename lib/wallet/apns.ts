import "server-only";
import http2 from "node:http2";
import { appleConfig } from "./config";

/**
 * Wake registered iPhones so Wallet fetches the latest pass. Pass updates use the Pass Type ID
 * certificate over APNs with an empty payload; the device then calls our web service.
 * Returns the push tokens Apple says are no longer valid, so their registrations can be removed.
 */
export async function pushPassUpdates(pushTokens: string[]): Promise<string[]> {
  const cfg = appleConfig();
  if (!cfg || pushTokens.length === 0) return [];

  const client = http2.connect("https://api.push.apple.com", {
    cert: cfg.cert,
    key: cfg.key,
    passphrase: cfg.keyPassphrase,
  });
  // Without a listener, a failed connection would throw an unhandled 'error' and crash the function.
  client.on("error", (e) => console.warn("APNs connection error", e.message));
  const dead: string[] = [];
  try {
    await Promise.all(
      [...new Set(pushTokens)].map(
        (token) =>
          new Promise<void>((resolve) => {
            const req = client.request({
              ":method": "POST",
              ":path": `/3/device/${token}`,
              "apns-topic": cfg.passTypeId,
              "content-type": "application/json",
            });
            req.setTimeout(10_000, () => req.close());
            req.on("response", (headers) => {
              const status = Number(headers[":status"]);
              if (status === 410 || status === 400) dead.push(token);
              if (status !== 200) console.warn("APNs push", status, token.slice(0, 8));
            });
            req.on("error", (e) => console.warn("APNs error", e.message));
            req.on("close", () => resolve());
            req.end("{}");
          }),
      ),
    );
  } finally {
    client.close();
  }
  return dead;
}
