"use client";

import { useEffect, useRef, useState } from "react";
import { selectVenue } from "@/app/dashboard/actions";
import { IconChevron } from "./icons";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Venue initials square + name + chevron; opens a list to switch venues when there's more than one. */
export function VenueMenu({ venues, currentId }: { venues: { id: string; name: string; role: string }[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = venues.find((v) => v.id === currentId) ?? venues[0];
  const many = venues.length > 1;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!current) return null;
  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => many && setOpen((o) => !o)}
        aria-expanded={many ? open : undefined}
        className={`flex h-12 w-full items-center gap-3 rounded-[10px] border border-line bg-surface-2 px-2.5 text-left ${many ? "hover:border-blue/50" : "cursor-default"}`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue text-xs font-bold text-midnight">{initials(current.name)}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{current.name}</span>
        {many && (
          <span className="text-muted">
            <IconChevron />
          </span>
        )}
      </button>
      {open && (
        <ul className="absolute left-0 right-0 top-14 z-40 max-h-80 overflow-y-auto rounded-[14px] border border-line bg-surface p-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          {venues.map((v) => (
            <li key={v.id}>
              <form action={selectVenue}>
                <input type="hidden" name="venueId" value={v.id} />
                <input type="hidden" name="next" value={v.role === "staff" ? "/dashboard/scan" : "/dashboard"} />
                <button type="submit" className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-sm ${v.id === current.id ? "bg-blue/15 font-semibold" : "hover:bg-surface-2"}`}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-blue">{initials(v.name)}</span>
                  <span className="truncate">{v.name}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
