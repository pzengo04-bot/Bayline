"use client";

import { useState, useTransition } from "react";
import { checkIn, type CheckInResult } from "@/app/v/[slug]/actions";
import { OptInCheckbox } from "@/components/customer/OptInCheckbox";
import { button } from "@/components/ui/styles";
import { formatPhoneInput, phoneDigits } from "@/lib/format";
import { RewardUnlockedScreen, TooSoonScreen, WelcomeScreen } from "./screens";

type Props = { slug: string; consentText: string };

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function CheckInFlow({ slug, consentText }: Props) {
  const [digits, setDigits] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [askName, setAskName] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (withName: boolean) => {
    setMessage(null);
    startTransition(async () => {
      const r = await checkIn({ slug, phone: digits, name: withName ? name : undefined, consent: withName && consent });
      if (r.status === "new_customer") setAskName(true);
      else if (r.status === "invalid_phone") setMessage("That doesn't look like a 10-digit US phone number.");
      else if (r.status === "error" || r.status === "venue_not_found") setMessage("Something went wrong. Please try again.");
      else setResult(r);
    });
  };

  const reset = () => {
    setDigits("");
    setName("");
    setConsent(false);
    setAskName(false);
    setResult(null);
    setMessage(null);
  };

  if (result?.status === "checked_in" || result?.status === "too_soon") {
    return (
      <div>
        {result.status === "too_soon" ? (
          <TooSoonScreen
            firstName={result.first_name}
            nextAt={timeFormat.format(new Date(result.next_check_in_at))}
            progress={result.progress}
          />
        ) : result.reward_unlocked ? (
          <RewardUnlockedScreen
            firstName={result.first_name}
            rewardText={result.progress.reward_text}
            unlockedAt={`today at ${timeFormat.format(new Date())}`}
          />
        ) : (
          <WelcomeScreen firstName={result.first_name} isNew={result.is_new} progress={result.progress} />
        )}
        <button type="button" onClick={reset} className="mt-8 w-full py-2 text-sm font-medium text-muted underline underline-offset-2">
          Check in someone else
        </button>
      </div>
    );
  }

  if (askName) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
      >
        <h2 className="font-display text-3xl font-bold uppercase leading-none">Welcome!</h2>
        <p className="mt-2 text-muted">Looks like you&apos;re new. Join in one step and today counts as your first visit.</p>
        <label htmlFor="first-name" className="mt-6 block text-sm font-semibold">
          First name
        </label>
        <input
          id="first-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          autoFocus
          required
          maxLength={60}
          className="mt-1.5 h-14 w-full rounded-xl border border-line bg-white px-4 text-lg focus:border-ink focus:outline-none"
        />
        <div className="mt-4">
          <OptInCheckbox checked={consent} onChange={setConsent} text={consentText} />
        </div>
        {message && <p className="mt-3 text-sm font-medium text-red-700">{message}</p>}
        <button type="submit" disabled={pending || !name.trim()} className={`${button.primary} mt-6 h-14 w-full text-base`}>
          {pending ? "Checking in…" : "Join & check in"}
        </button>
        <button type="button" onClick={reset} className="mt-2 w-full py-2 text-sm text-muted">
          Back
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <label htmlFor="phone" className="block font-display text-3xl font-bold uppercase leading-none">
        Check in
      </label>
      <p className="mt-2 text-muted">Enter your phone number to earn your visit.</p>
      <input
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        autoFocus
        value={formatPhoneInput(digits)}
        onChange={(e) => setDigits(phoneDigits(e.target.value).replace(/^1(?=\d{10})/, "").slice(0, 10))}
        placeholder="(555) 555-5555"
        className="mt-5 h-16 w-full rounded-xl border border-line bg-white text-center font-mono text-2xl tracking-wide placeholder:text-ink/20 focus:border-ink focus:outline-none"
      />
      {message && <p className="mt-3 text-sm font-medium text-red-700">{message}</p>}
      <button type="submit" disabled={pending || digits.length !== 10} className={`${button.accent} mt-5 h-14 w-full text-base`}>
        {pending ? "Checking in…" : "Check in"}
      </button>
    </form>
  );
}
