"use client";

import Link from "next/link";
import { useActionState } from "react";
import { button } from "@/components/ui/styles";
import { site } from "@/lib/site";
import { sendLoginLink, signInWithGoogle, type LoginState } from "./actions";

const ERRORS: Record<string, string> = {
  link: "That login link has expired or was already used. Enter your email for a new one.",
  not_invited: "That account isn't on a venue's team yet. Ask the venue owner to invite your email.",
  google: "Google sign-in didn't finish. Try again, or use an email link.",
};

export function LoginForm({ error, google }: { error: string | null; google: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-blue" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--midnight)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase">Check your email</h1>
        <p className="mt-2 text-muted">
          If <strong className="text-fg">{state.email}</strong> has access to a venue, a login link is on its way. It
          works once and expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <h1 className="font-display text-4xl font-bold uppercase leading-none">Venue login</h1>
      <p className="mt-2 text-muted">We&apos;ll email you a link to log in. No password needed.</p>
      {error && ERRORS[error] && <p className="mt-4 rounded-xl bg-midnight px-3 py-2.5 text-sm">{ERRORS[error]}</p>}
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
        className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base focus:border-blue focus:outline-none"
      />
      {state.status === "error" && <p className="mt-2 text-sm font-medium text-red-400">{state.message}</p>}
      <button type="submit" disabled={pending} className={`${button.primary} mt-5 h-12 w-full text-base`}>
        {pending ? "Sending…" : "Email me a login link"}
      </button>
      {google && (
        <>
          <p className="my-4 flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>
          <button
            type="submit"
            formAction={signInWithGoogle}
            formNoValidate
            className={`${button.secondary} h-12 w-full text-base`}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Sign in with Google
          </button>
        </>
      )}
      <p className="mt-6 text-center text-xs text-muted">
        Accounts are by invitation. Want {site.name} for your venue?{" "}
        <Link href="/#founding" className="font-semibold text-fg underline underline-offset-2">
          See the founding offer
        </Link>
      </p>
    </form>
  );
}
