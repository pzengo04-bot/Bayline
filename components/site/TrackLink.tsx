"use client";

import type { AnchorHTMLAttributes } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { event: "try_it_click" | "book_call_click" };

/** A plain link that also records a click (sendBeacon, so it never delays navigation). */
export function TrackLink({ event, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        try {
          navigator.sendBeacon("/api/events", JSON.stringify({ event, path: location.pathname }));
        } catch {
          // Analytics must never break the link.
        }
        onClick?.(e);
      }}
    />
  );
}
