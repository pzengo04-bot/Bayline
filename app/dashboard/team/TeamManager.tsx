"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/scan/ConfirmDialog";
import { button } from "@/components/ui/styles";
import { changeRole, invite, remove, type TeamResult } from "./actions";

export type Member = { id: string; email: string; role: "owner" | "staff"; lastSignIn: string | null; you: boolean };

const input = "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base focus:border-blue focus:outline-none";

export function TeamManager({ members, timezone }: { members: Member[]; timezone: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [result, setResult] = useState<TeamResult | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [pending, start] = useTransition();
  const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: timezone });
  const run = (action: () => Promise<TeamResult>) =>
    start(async () => {
      const r = await action();
      setResult(r);
      setRemoving(null);
      if (r.ok) setEmail("");
    });

  return (
    <div className="space-y-4">
      {result && (
        <p role="status" className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${result.ok ? "bg-blue/15 text-blue" : "bg-red-400/10 text-red-300"}`}>
          {result.message}
        </p>
      )}
      <ul className="divide-y divide-line/70 rounded-xl border border-line">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.email}
                {m.you && <span className="text-muted"> (you)</span>}
              </p>
              <p className="text-xs text-muted">{m.lastSignIn ? `Last signed in ${when.format(new Date(m.lastSignIn))}` : "Invite not accepted yet"}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label={`Role for ${m.email}`}
                value={m.role}
                disabled={pending}
                onChange={(e) => run(() => changeRole(m.id, e.target.value))}
                className="h-10 rounded-full border border-line bg-surface-2 px-3 text-sm font-semibold"
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </select>
              {!m.you && (
                <button type="button" disabled={pending} onClick={() => setRemoving(m)} className="h-10 rounded-full px-3 text-sm font-semibold text-red-300 hover:bg-red-400/10">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="space-y-2 rounded-xl bg-midnight p-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => invite(email, role));
        }}
      >
        <p className="text-sm font-semibold">Invite someone</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-label="Email" className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className={`${input} sm:w-32`}>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
          <button type="submit" disabled={pending} className={`${button.accent} shrink-0`}>
            {pending ? "Sending…" : "Send invite"}
          </button>
        </div>
        <p className="text-xs text-muted">They get an email with a login link. No password.</p>
      </form>

      <ConfirmDialog
        open={removing !== null}
        title="Remove from team?"
        tone="danger"
        confirmLabel="Remove"
        busy={pending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && run(() => remove(removing.id))}
      >
        <p>{removing?.email} loses access to this venue and is signed out on every device right away.</p>
      </ConfirmDialog>
    </div>
  );
}
