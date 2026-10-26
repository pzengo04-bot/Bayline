import Image from "next/image";
import { HeroPhone } from "@/components/landing/HeroPhone";
import { RotatingLine } from "@/components/landing/RotatingLine";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrackLink } from "@/components/site/TrackLink";
import { button, card } from "@/components/ui/styles";
import { site } from "@/lib/site";
import cafeCard from "@/public/marketing/cards/cafe-in-progress.png";
import golfCard from "@/public/marketing/cards/golf-reward-ready.png";
import barberCard from "@/public/marketing/cards/barber-in-progress.png";

const problems = [
  { title: "You don't know who your regulars are", body: "Card payments and bookings don't tell you who comes every week and who came once." },
  { title: "You don't notice when one stops coming", body: "A regular who drifts away just goes quiet. By the time you notice, they've found somewhere else." },
  { title: "Punch cards get lost. Apps never get downloaded.", body: "Paper ends up in the wash, and nobody installs an app for a coffee or a haircut." },
];

const steps = [
  {
    title: "Tap to join",
    body: "Customers tap the stand at your counter (or scan the QR) and add your branded card to Apple or Google Wallet. No app, about 20 seconds.",
  },
  {
    title: "Earn on every visit",
    body: "Stamps that match your business (coffee cups, golf balls, scissors…), with optional halfway rewards and a head start for new members.",
  },
  {
    title: "Bring them back",
    body: "Bayline spots regulars slipping away and slow hours, and sends offers straight to their lock screen with one tap.",
  },
];

const benefits = [
  { title: "Know your regulars", body: "Every customer labeled New, Regular, VIP or Slipping, based on how often they actually come in." },
  { title: "Win back slipping regulars", body: "See who's away twice their usual time and send them an offer on their wallet card in one tap." },
  { title: "Fill slow hours", body: "Find your quietest stretch of the week and invite your regulars in when you have room." },
  { title: "The Monday Brief", body: "What happened last week and what to do this week, in plain language." },
  { title: "Your brand on every card", body: "Your logo, your colors and your stamp icon, on every customer's phone." },
  { title: "Front-desk arrivals", body: "See who just walked in and greet regulars by name.", soon: true },
];

const faqs = [
  { q: "Do customers need to download an app?", a: "No. They tap the stand or scan the QR code and add the card to Apple Wallet or Google Wallet, which are already on their phone." },
  { q: "Does it work on Android?", a: "Yes. Android customers get the same card in Google Wallet." },
  { q: "How long does setup take?", a: "About 10 minutes. We set it up with you: your logo, colors, reward and stand." },
  { q: "Who owns the customer data?", a: "You do. We never sell it." },
  { q: "Can customers turn off messages?", a: "Yes, anytime, right from the card in their wallet." },
  { q: "What if I already use Square or a booking system?", a: "Bayline works alongside it. Integrations are coming." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader home />

      <main className="flex-1">
        {/* 1. Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-24">
          <div>
            <h1 className="font-display text-[3.4rem] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Turn <span className="whitespace-nowrap">first-timers</span> into{" "}
              <span className="relative whitespace-nowrap">
                <span className="absolute inset-x-[-0.08em] bottom-[0.06em] top-[0.52em] -z-10 bg-accent" />
                regulars.
              </span>
            </h1>
            <RotatingLine />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              A rewards card your customers tap to join, no app needed, and a weekly brief that tells you who&apos;s slipping away and
              brings them back in one tap.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackLink event="try_it_click" href="/demo" className={`${button.primary} h-12 px-6 text-base`}>
                Try it on your phone <span aria-hidden="true">→</span>
              </TrackLink>
              <TrackLink event="book_call_click" href={site.callUrl} className={`${button.secondary} h-12 px-6 text-base`}>
                Book a 15-min call
              </TrackLink>
            </div>
          </div>
          <HeroPhone />
        </section>

        {/* 2. The problem */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="The problem" title="Most businesses never hear from a first-time customer again." />
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {problems.map((p) => (
                <div key={p.title} className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
                  <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                  <p className="mt-2 text-muted">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. How it works */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="How it works" title="Three steps. Nothing to install." />
            <ol className="mt-10 grid gap-3 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className={`${card} flex gap-4 p-5 sm:p-6 lg:block`}>
                  <span className="w-12 shrink-0 font-display text-5xl font-extrabold leading-none text-ink/50 lg:w-auto lg:text-7xl" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold leading-snug lg:mt-3">{s.title}</h3>
                    <p className="mt-2 text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. What owners get */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="What owners get" title="Know who's slipping. Bring them back." inverted />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="h-5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide">{b.title}</h3>
                    {b.soon && <span className="rounded-full border border-white/25 px-2 py-0.5 text-xs font-semibold text-white/80">Coming soon</span>}
                  </div>
                  <p className="mt-3 text-white/70">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. The card */}
        <section className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="The card" title="One card. Built around your business." />
            {/* A swipeable row on phones, three across from tablet up. */}
            <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {(
                [
                  [cafeCard, "Café", "A Corner Coffee card filling up with coffee cups, a gift on the halfway reward and a trophy on the last stamp."],
                  [golfCard, "Indoor golf", "A Back Nine Golf card with every golf-ball stamp filled and a banner reading Free bay hour ready! Show staff."],
                  [barberCard, "Barbershop", "A Sharp & Co. card with scissors stamps, two of six filled."],
                ] as const
              ).map(([src, label, alt]) => (
                <figure key={label} className="w-[78%] shrink-0 snap-center sm:w-auto">
                  <Image src={src} alt={alt} sizes="(min-width: 640px) 33vw, 100vw" className="h-auto w-full rounded-[14px] shadow-[0_18px_40px_-20px_rgba(15,21,18,0.45)]" />
                  <figcaption className="mt-3 text-center text-sm font-semibold text-muted">{label}</figcaption>
                </figure>
              ))}
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-2">
              {["Your logo and colors", "Stamps that match your business", "Optional halfway reward", "Offers on the lock screen", "Works on iPhone and Android"].map((c) => (
                <li key={c} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Try it: a teaser for the /demo page */}
        <section id="try-it" className="scroll-mt-16 border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">See it for yourself</p>
                <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">Try it on your phone in 20 seconds</h2>
                <p className="mt-3 max-w-xl text-white/70">Add a real Bayline card to your wallet, then click through the owner&apos;s dashboard.</p>
              </div>
              <TrackLink event="try_it_click" href="/demo" className={`${button.accent} h-12 shrink-0 px-6 text-base`}>
                See the demo <span aria-hidden="true">→</span>
              </TrackLink>
            </div>
          </div>
        </section>

        {/* 7. Founding offer (the paid plan lives in lib/pricing.ts until pricing goes public) */}
        <section id="founding" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="relative overflow-hidden rounded-3xl bg-accent p-7 sm:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 hidden size-64 rounded-full border-[28px] border-ink/[0.07] sm:block"
              />
              <p className="text-sm font-semibold uppercase tracking-widest">Founding offer</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
                Be one of our first 10 businesses.
              </h2>
              <p className="mt-4 max-w-xl text-lg">
                Free for 60 days. No setup fee, no contract, cancel anytime. We set everything up with you in person, including your
                branded card and counter stand.
              </p>
              <TrackLink event="book_call_click" href={site.callUrl} className={`${button.primary} mt-8 h-12 px-6 text-base`}>
                Book a 15-min call
              </TrackLink>
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="FAQ" title="Questions owners ask" />
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Final CTA */}
        <section className="bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
              Ready to turn <span className="whitespace-nowrap">first-timers</span> into regulars?
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <TrackLink event="try_it_click" href="/demo" className={`${button.primary} h-12 px-6 text-base`}>
                Try it on your phone <span aria-hidden="true">→</span>
              </TrackLink>
              <TrackLink event="book_call_click" href={site.callUrl} className={`${button.secondary} h-12 px-6 text-base`}>
                Book a 15-min call
              </TrackLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({ eyebrow, title, inverted = false }: { eyebrow: string; title: string; inverted?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-widest ${inverted ? "text-accent" : "text-accent-strong"}`}>{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">{title}</h2>
    </div>
  );
}
