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

/** A venue's card design or rewards changed: refresh every customer's pass. */
export async function notifyVenuePassesChanged(venueId: string) {
  void venueId;
}
