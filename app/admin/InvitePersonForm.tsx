"use client";

import { useActionState } from "react";
import { invitePerson, type FormState } from "./actions";

export function InvitePersonForm({ venueId }: { venueId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(invitePerson, { status: "idle" });
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="venue_id" value={venueId} />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`invite-${venueId}`}>
          Email
        </label>
        <input
          id={`invite-${venueId}`}
          name="email"
          type="email"
          required
          placeholder="Invite by email"
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-white px-3 text-sm focus:border-ink focus:outline-none"
        />
        <select name="role" defaultValue="owner" aria-label="Role" className="h-9 rounded-full border border-line bg-white px-3 text-sm">
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
        </select>
        <button type="submit" disabled={pending} className="h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Invite"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p className={`mt-2 text-xs ${state.status === "ok" ? "text-accent-strong" : "text-red-700"}`}>{state.message}</p>
      )}
    </form>
  );
}
