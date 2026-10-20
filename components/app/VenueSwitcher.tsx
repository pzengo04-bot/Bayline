"use client";

import { selectVenue } from "@/app/dashboard/actions";

type Props = { venues: { id: string; name: string }[]; currentId: string };

/** Dropdown that switches the dashboard to another venue (owners of several, or admins). */
export function VenueSwitcher({ venues, currentId }: Props) {
  return (
    <form action={selectVenue}>
      <input type="hidden" name="next" value="/dashboard" />
      <label htmlFor="venue-switcher" className="sr-only">
        Venue
      </label>
      <select
        id="venue-switcher"
        name="venueId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 max-w-[11rem] truncate rounded-full border border-line bg-white pl-3 pr-8 text-sm font-semibold"
      >
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </form>
  );
}
