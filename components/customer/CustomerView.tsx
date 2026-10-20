"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { SlotBlock } from "@/lib/analytics";
import { formatHourRange, formatPhoneInput, phoneDigits } from "@/lib/format";
import { button, card } from "@/components/ui/styles";
import { OptInCheckbox } from "./OptInCheckbox";
import { PhoneFrame } from "./PhoneFrame";
import { StampCard } from "./StampCard";

export type Member = { phone: string; firstName: string; visits: number; smsOptIn: boolean };
export type VenueInfo = { name: string; visitsPerReward: number; rewardLabel: string };

type Props = {
  members: Member[];
  samplePhone: string;
  emptiest: SlotBlock;
  venue: VenueInfo;
};

type Screen = "enter" | "join" | "welcome" | "text";

const STEPS: { screen: Screen; label: string }[] = [
  { screen: "enter", label: "Check in" },
  { screen: "welcome", label: "Rewards" },
  { screen: "text", label: "Text offer" },
];

export function CustomerView({ members, samplePhone, emptiest, venue }: Props) {
  const [screen, setScreen] = useState<Screen>("enter");
  const [digits, setDigits] = useState("");
  const [name, setName] = useState("");
  const [visits, setVisits] = useState(0); // including today's check-in
  const [optIn, setOptIn] = useState(false);
  const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

  const offer = `Bays are wide open ${emptiest.day} ${formatHourRange(emptiest.startHour, emptiest.endHour)} — 20% off this week at ${venue.name}.`;

  const checkIn = () => {
    const member = members.find((m) => phoneDigits(m.phone) === digits);
    if (member) {
      setName(member.firstName);
      setVisits(member.visits + 1);
      setAlreadyOptedIn(member.smsOptIn);
      setOptIn(false);
      setScreen("welcome");
    } else {
      setName("");
      setVisits(1);
      setAlreadyOptedIn(false);
      setOptIn(false);
      setScreen("join");
    }
  };

  const reset = () => {
    setDigits("");
    setScreen("enter");
  };

  const stamps = visits > 0 ? ((visits - 1) % venue.visitsPerReward) + 1 : 0;
  const activeStep = screen === "join" ? "enter" : screen;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12">
      <div className="order-2 lg:order-1">
        <h2 className="font-display text-3xl font-bold uppercase leading-none">What your customers see</h2>
        <p className="mt-3 max-w-prose text-muted">
          Customers check in on a tablet at the front desk or on their own phone. No app to download, no card to
          carry: just their phone number.
        </p>
        <ol className="mt-6 space-y-3">
          {[
            ["Check in with a phone number", "Regulars are recognized instantly. New customers join in one step."],
            ["See their progress", `Every visit earns a stamp. ${venue.visitsPerReward} visits = a ${venue.rewardLabel}.`],
            ["Get offers by text, only if they opt in", "Clear consent, and every message says how to stop."],
          ].map(([title, body], i) => (
            <li key={title} className={`${card} flex gap-4 p-4`}>
              <span className="font-display text-3xl font-bold leading-none text-accent-strong">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className={`${card} mt-6 p-4 text-sm`}>
          <p className="font-semibold">Try it</p>
          <p className="mt-1 text-muted">
            Use Mike&apos;s number to see a returning regular, or type any other 10-digit number to join as a new
            customer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={button.secondary}
              onClick={() => {
                setDigits(phoneDigits(samplePhone));
                setScreen("enter");
              }}
            >
              Fill in Mike&apos;s number
            </button>
            <button type="button" className={button.secondary} onClick={reset}>
              Start over
            </button>
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div role="tablist" aria-label="Customer screens" className="mx-auto mb-4 flex max-w-[340px] gap-1">
          {STEPS.map((s, i) => {
            const reachable = s.screen !== "welcome" || (visits > 0 && name.trim() !== "");
            return (
              <button
                key={s.screen}
                role="tab"
                type="button"
                aria-selected={activeStep === s.screen}
                disabled={!reachable}
                onClick={() => setScreen(s.screen)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeStep === s.screen ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            );
          })}
        </div>

        <PhoneFrame>
          {screen === "enter" && (
            <EnterScreen
              venueName={venue.name}
              digits={digits}
              onDigits={setDigits}
              onSubmit={checkIn}
            />
          )}

          {screen === "join" && (
            <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
              <VenueHeader name={venue.name} />
              <h3 className="mt-6 font-display text-3xl font-bold uppercase leading-none">Welcome!</h3>
              <p className="mt-2 text-sm text-muted">
                Looks like you&apos;re new. Join {venue.name} Rewards and today counts as your first visit.
              </p>
              <label className="mt-5 block text-sm font-semibold" htmlFor="first-name">
                First name
              </label>
              <input
                id="first-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                placeholder="e.g. Sam"
                className="mt-1.5 h-12 w-full rounded-xl border border-line px-3 text-base focus:border-ink focus:outline-none"
              />
              <div className="mt-4">
                <OptInCheckbox checked={optIn} onChange={setOptIn} />
              </div>
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => setScreen("welcome")}
                  className={`${button.primary} h-12 w-full text-base`}
                >
                  Join &amp; check in
                </button>
                <button type="button" onClick={reset} className="mt-2 w-full py-2 text-sm text-muted">
                  Back
                </button>
              </div>
            </div>
          )}

          {screen === "welcome" && (
            <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
              <VenueHeader name={venue.name} />
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-accent-strong">
                <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-ink">✓</span>
                You&apos;re checked in
              </div>
              <h3 className="mt-2 font-display text-[34px] font-bold uppercase leading-none">
                {visits > 1 ? `Welcome back, ${name}!` : `Welcome, ${name.trim() || "friend"}!`}
              </h3>
              <div className="mt-5">
                <StampCard stamps={stamps} total={venue.visitsPerReward} rewardLabel={venue.rewardLabel} />
              </div>
              {visits > 1 && !alreadyOptedIn && (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-muted">Want to hear about open bays and member deals?</p>
                  <OptInCheckbox checked={optIn} onChange={setOptIn} />
                </div>
              )}
              {(alreadyOptedIn || (visits === 1 && optIn)) && (
                <p className="mt-4 rounded-xl bg-paper p-3 text-xs text-muted">
                  You&apos;re signed up for text offers. Reply STOP anytime to opt out.
                </p>
              )}
              <div className="mt-auto pt-4">
                <button type="button" onClick={() => setScreen("text")} className={`${button.primary} h-12 w-full text-base`}>
                  Done
                </button>
              </div>
            </div>
          )}

          {screen === "text" && <TextScreen venueName={venue.name} offer={offer} onRestart={reset} />}
        </PhoneFrame>
        <p className="mt-3 text-center text-xs text-muted">
          {screen === "text" && "Later that week, opted-in customers get offers like this."}
          {screen === "enter" && (
            <>
              Try a regular:{" "}
              <button
                type="button"
                onClick={() => setDigits(phoneDigits(samplePhone))}
                className="font-semibold text-ink underline underline-offset-2"
              >
                use Mike&apos;s number
              </button>
              , or any other number to join.
            </>
          )}
          {(screen === "join" || screen === "welcome") && "Sample data. Nothing is saved."}
        </p>
      </div>
    </div>
  );
}

function VenueHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-ink font-display text-lg font-bold text-accent">
        {name
          .split(" ")
          .map((w) => w[0])
          .join("")}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted">Rewards</p>
      </div>
    </div>
  );
}

type EnterProps = {
  venueName: string;
  digits: string;
  onDigits: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
};

function EnterScreen({ venueName, digits, onDigits, onSubmit }: EnterProps) {
  const press = (k: string) => {
    onDigits((d) => (k === "del" ? d.slice(0, -1) : (d + k).slice(0, 10)));
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
      <VenueHeader name={venueName} />
      <h3 className="mt-6 font-display text-3xl font-bold uppercase leading-none">Check in</h3>
      <p className="mt-1.5 text-sm text-muted">Enter your phone number to earn your visit.</p>
      <label htmlFor="phone" className="sr-only">
        Phone number
      </label>
      <input
        id="phone"
        inputMode="tel"
        autoComplete="tel"
        value={formatPhoneInput(digits)}
        onChange={(e) => onDigits(phoneDigits(e.target.value).slice(0, 10))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && digits.length === 10) onSubmit();
        }}
        placeholder="Your number"
        className="mt-4 h-14 w-full rounded-xl border border-line bg-paper text-center font-mono text-2xl tracking-wide placeholder:text-ink/20 focus:border-ink focus:outline-none"
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "Delete" : k}
              className="h-12 rounded-xl bg-ink/[0.05] text-xl font-semibold active:bg-ink/15"
            >
              {k === "del" ? "⌫" : k}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={digits.length !== 10}
        className={`${button.accent} mt-auto h-12 w-full text-base`}
      >
        Check in
      </button>
    </div>
  );
}

function TextScreen({ venueName, offer, onRestart }: { venueName: string; offer: string; onRestart: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-[#f2f2f4]">
      <div className="flex flex-col items-center border-b border-black/5 bg-white/80 pb-3 pt-2">
        <div className="grid size-11 place-items-center rounded-full bg-ink font-display text-lg font-bold text-accent">
          {venueName
            .split(" ")
            .map((w) => w[0])
            .join("")}
        </div>
        <p className="mt-1 text-xs font-medium">{venueName}</p>
      </div>
      <div className="flex-1 space-y-2 px-3 py-4">
        <p className="text-center text-[11px] text-muted">Tuesday 11:02 AM</p>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-snug shadow-sm">
          {offer} Reply STOP to opt out.
        </div>
      </div>
      <div className="px-4 pb-5">
        <button type="button" onClick={onRestart} className={`${button.secondary} w-full`}>
          Start over
        </button>
      </div>
    </div>
  );
}
