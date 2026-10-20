import type { ReactNode } from "react";

type Name = "golf" | "paddle" | "bat" | "clock";

/** Simple line icons for the venue types. */
export function VenueIcon({ name }: { name: Name }) {
  const paths: Record<Name, ReactNode> = {
    golf: (
      <>
        <path d="M9 21V4l9 4-9 4" />
        <ellipse cx="12" cy="21" rx="7" ry="1.5" />
      </>
    ),
    paddle: (
      <>
        <rect x="5" y="3" width="11" height="13" rx="5.5" transform="rotate(-35 10.5 9.5)" />
        <path d="M13.5 15.5l5 5" />
        <circle cx="18.5" cy="6" r="1.6" />
      </>
    ),
    bat: (
      <>
        <path d="M19.5 3.5c1 1 1 2.5 0 3.5L9 17.5 6.5 15 17 4.5c.8-.9 1.8-1.5 2.5-1z" />
        <path d="M6.5 15L4 17.5M5 19l-1.5 1.5" />
        <circle cx="17" cy="17" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  };
  return (
    <span className="grid size-11 place-items-center rounded-xl bg-ink text-accent">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths[name]}
      </svg>
    </span>
  );
}
