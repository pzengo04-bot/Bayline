"use client";

import { useState, useTransition } from "react";
import { clearDemoGuests, type FormState } from "./actions";

export function ClearDemoGuests({ venueId, count }: { venueId: string; count: number }) {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-semibold">{count}</span> demo guest{count === 1 ? "" : "s"} (real people who joined the demo card)
        </p>
        <button
          type="button"
          disabled={pending || count === 0}
          onClick={() => {
            if (!window.confirm(`Clear ${count} demo guest${count === 1 ? "" : "s"}? Their wallet cards will be voided.`)) return;
            start(async () => setState(await clearDemoGuests(venueId)));
          }}
          className="h-9 rounded-full border border-ink/20 bg-white px-4 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Clearing…" : "Clear demo guests"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p className={`mt-2 text-xs ${state.status === "ok" ? "text-accent-strong" : "text-red-700"}`}>{state.message}</p>
      )}
    </div>
  );
}
