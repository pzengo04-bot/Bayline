"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { forgetMe, tap, type TapResult } from "@/app/v/[slug]/actions";
import { TapResultScreen } from "@/components/checkin/screens";
import { button } from "@/components/ui/styles";
import { formatPhoneInput, phoneDigits } from "@/lib/format";
import { WalletButtons } from "./WalletButtons";

type Props = {
  venue: { id: string; slug: string; name: string };
  hasCookie: boolean;
  source: string;
  wallet: { apple: boolean; google: boolean };
};

const input = "mt-1.5 h-14 w-full rounded-xl border border-line bg-white px-4 text-lg focus:border-ink focus:outline-none";

export function TapFlow({ venue, hasCookie, source, wallet }: Props) {
  const [result, setResult] = useState<TapResult | null>(null);
  const [digits, setDigits] = useState("");
  const [name, setName] = useState("");
  const [needName, setNeedName] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const tapped = useRef(false);
  // Only a cookie that was there when the page opened means "returning customer". Joining sets the
  // cookie and Next.js refreshes the page, which must not count as a second tap.
  const [returning, setReturning] = useState(hasCookie);

  const send = (details?: { phone: string; name: string }) =>
    start(async () => {
      setMessage(null);
      const r = await tap({ slug: venue.slug, venueId: venue.id, source, ...details });
      if (r.status === "need_name") setNeedName(true);
      else if (r.status === "invalid_phone") setMessage("That doesn't look like a 10-digit US phone number.");
      else if (r.status === "error" || r.status === "venue_not_found") setMessage("Something went wrong. Please try again.");
      setResult(r);
    });

  // Returning customer on this phone: the tap itself earns the stamp.
  useEffect(() => {
    if (returning && !tapped.current) {
      tapped.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result && (result.status === "joined" || result.status === "stamped" || result.status === "limit_reached")) {
    return (
      <div>
        <TapResultScreen result={result} />
        <WalletButtons slug={venue.slug} apple={wallet.apple} google={wallet.google} compact={result.status !== "joined"} />
        <button
          type="button"
          onClick={() =>
            start(async () => {
              await forgetMe(venue.id);
              setReturning(false);
              setResult(null);
              setDigits("");
              setName("");
              setNeedName(false);
            })
          }
          className="mt-8 w-full py-2 text-xs text-muted underline underline-offset-2"
        >
          Not {result.firstName}? Use a different number
        </button>
      </div>
    );
  }

  if (returning && !result) {
    return <p className="py-10 text-center text-muted" aria-live="polite">Adding your stamp…</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send({ phone: digits, name });
      }}
    >
      <h2 className="font-display text-3xl font-bold uppercase leading-none">Join {venue.name} rewards</h2>
      <p className="mt-2 text-muted">Earn a stamp every visit. No app, no password.</p>
      <label htmlFor="first-name" className="mt-6 block text-sm font-semibold">
        First name {!needName && <span className="font-normal text-muted">(skip if you&apos;ve joined before)</span>}
      </label>
      <input
        id="first-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
        maxLength={60}
        required={needName}
        className={`${input} ${needName ? "border-ink" : ""}`}
      />
      {needName && <p className="mt-1.5 text-sm font-medium text-accent-strong">New here! Add your first name to join.</p>}
      <label htmlFor="phone" className="mt-4 block text-sm font-semibold">
        Phone number
      </label>
      <input
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        value={formatPhoneInput(digits)}
        onChange={(e) => {
          setDigits(phoneDigits(e.target.value).replace(/^1(?=\d{10})/, "").slice(0, 10));
          setNeedName(false);
        }}
        placeholder="(555) 555-5555"
        className={`${input} font-mono tracking-wide placeholder:text-ink/20`}
      />
      {message && <p className="mt-3 text-sm font-medium text-red-700">{message}</p>}
      <button
        type="submit"
        disabled={pending || digits.length !== 10 || (needName && !name.trim())}
        className={`${button.accent} mt-6 h-14 w-full text-base`}
      >
        {pending ? "One sec…" : "Join & get my card"}
      </button>
      <p className="mt-3 text-center text-xs text-muted">We only use your number to find your card.</p>
    </form>
  );
}
