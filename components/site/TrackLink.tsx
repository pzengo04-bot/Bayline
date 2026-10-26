"use client";

import type { AnchorHTMLAttributes } from "react";

export type SiteEvent = "try_it_click" | "book_call_click" | "demo_view" | "demo_button_click";
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { event: SiteEvent };

/** Record a marketing-site event (sendBeacon, so it never delays anything). */
export function track(event: SiteEvent) {
  try {
    navigator.sendBeacon("/api/events", JSON.stringify({ event, path: location.pathname }));
  } catch {
    // Analytics must never break the page.
  }
}

/** A plain link that also records a click (sendBeacon, so it never delays navigation). */
export function TrackLink({ event, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
    />
  );
}
