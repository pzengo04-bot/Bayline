"use client";

import Link from "next/link";
import { useActionState } from "react";
import { button } from "@/components/ui/styles";
import { site } from "@/lib/site";
import { sendLoginLink, type LoginState } from "./actions";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase">Check your email</h1>
        <p className="mt-2 text-muted">
          If <strong className="text-ink">{state.email}</strong> has access to a venue, a login link is on its way. It
          works once and expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <h1 className="font-display text-4xl font-bold uppercase leading-none">Venue login</h1>
      <p className="mt-2 text-muted">We&apos;ll email you a link to log in. No password needed.</p>
      {linkError && (
        <p className="mt-4 rounded-xl bg-paper px-3 py-2.5 text-sm">
          That login link has expired or was already used. Enter your email for a new one.
        </p>
      )}
      <label htmlFor="email" className="mt-6 block text-sm font-semibold">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-ink focus:outline-none"
      />
      {state.status === "error" && <p className="mt-2 text-sm font-medium text-red-700">{state.message}</p>}
      <button type="submit" disabled={pending} className={`${button.primary} mt-5 h-12 w-full text-base`}>
        {pending ? "Sending…" : "Email me a login link"}
      </button>
      <p className="mt-6 text-center text-xs text-muted">
        Accounts are by invitation. Want {site.name} for your venue?{" "}
        <Link href="/#founding" className="font-semibold text-ink underline underline-offset-2">
          See the founding offer
        </Link>
      </p>
    </form>
  );
}
