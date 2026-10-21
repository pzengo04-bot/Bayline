import "server-only";

/**
 * Tell wallets that these customers' passes changed (stamp, redeem, redesign).
 * Apple: push to registered devices. Google: patch the loyalty object.
 * Filled in by the wallet steps; safe to call before credentials exist.
 */
export async function notifyPassChanged(customerIds: string[], changeMessage?: string) {
  void customerIds;
  void changeMessage;
}
