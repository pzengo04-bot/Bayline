import { HeroPhone } from "@/components/landing/HeroPhone";
import { RotatingLine } from "@/components/landing/RotatingLine";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrackLink } from "@/components/site/TrackLink";
import { button, card } from "@/components/ui/styles";
import { site } from "@/lib/site";

const steps = [
  { title: "Tap to join", body: "Customers tap the stand at your counter and add your card to their Wallet. About 20 seconds." },
  { title: "Earn every visit", body: "Each visit adds a stamp. Rewards keep them coming back." },
  { title: "Bring them back", body: "Bayline spots who's slipping and sends an offer to their lock screen." },
];

const benefits = [
  { title: "Know your regulars", body: "See who comes every week, and who only came once." },
  { title: "Win back who's slipping", body: "Get alerted when a regular goes quiet. Send them an offer in one tap." },
  { title: "Fill slow hours", body: "Invite regulars in when you have open time." },
  { title: "The Monday brief", body: "Every Monday: what happened last week and what to do this week, in plain language." },
];

const faqs = [
  { q: "Do customers need to download an app?", a: "No. The card lives in Apple Wallet or Google Wallet, already on their phone." },
  { q: "Does it work on Android?", a: "Yes. iPhone and Android both work." },
  { q: "How long does setup take?", a: "About 30 minutes, in person. We bring your branded card and counter stand." },
  { q: "Who owns the customer data?", a: "You do. We never sell it or share it." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader home />

      <main className="flex-1">
        {/* 1. Hero */}
        <div className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="hero-aurora pointer-events-none absolute inset-0 -z-10" />
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-24">
          <div>
            <h1 className="font-display text-[3.4rem] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Turn <span className="whitespace-nowrap">first-timers</span> into{" "}
              <span className="relative z-0 whitespace-nowrap">
                <span className="absolute inset-x-[-0.08em] bottom-[0.06em] top-[0.52em] -z-10 bg-blue/45" />
                regulars.
              </span>
            </h1>
            <RotatingLine />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              A loyalty card in your customers&apos; Wallet. No app. See who&apos;s slipping and bring them back.
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
        </div>

        {/* 2. How it works */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="How it works" title="Three steps. Nothing to install." />
            {/* Three across only from xl, where each card is wide enough to keep its text to two lines. */}
            <ol className="mt-10 grid gap-3 xl:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className={`${card} glow-hover flex gap-4 p-5 sm:p-6 xl:block xl:px-4`}>
                  <span className="w-12 shrink-0 font-display text-5xl font-extrabold leading-none text-blue xl:w-auto xl:text-7xl" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold leading-snug xl:mt-3">{s.title}</h3>
                    <p className="mt-2 text-muted xl:text-[15px]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. What you get */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="What you get" title="Know your customers. Keep them coming back." />
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title} className="glow-hover rounded-2xl border border-line bg-surface-2 p-6">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide">{b.title}</h3>
                  </div>
                  <p className="mt-3 text-muted">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Try it, and the founding offer (the paid plan lives in lib/pricing.ts until pricing goes public) */}
        <section id="try-it" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:py-20 md:grid-cols-2">
            <div className="glow-hover flex flex-col items-start rounded-3xl border border-line bg-surface p-7 sm:p-10">
              <p className="font-mono text-sm font-semibold uppercase tracking-widest text-blue">See it for yourself</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] lg:text-5xl">Try it on your phone.</h2>
              <p className="mt-4 flex-1 text-muted">Add a real Bayline card to your Wallet, then click through the owner dashboard.</p>
              <TrackLink event="try_it_click" href="/demo" className={`${button.accent} mt-8 h-12 px-6 text-base`}>
                See the demo <span aria-hidden="true">→</span>
              </TrackLink>
            </div>
            <div
              id="founding"
              className="relative isolate flex scroll-mt-16 flex-col items-start overflow-hidden rounded-3xl border border-orange/40 bg-surface p-7 shadow-[0_0_60px_-20px_rgb(252_115_77/0.45)] sm:p-10"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(252_115_77/0.16),transparent_70%)]"
              />
              <p className="font-mono text-sm font-semibold uppercase tracking-widest text-orange">Founding offer</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] lg:text-5xl">First 10 businesses: 1 month free.</h2>
              <p className="mt-4 flex-1 text-muted">No setup fee. No contract. We set it up with you in person.</p>
              <TrackLink event="book_call_click" href={site.callUrl} className={`${button.primary} mt-8 h-12 px-6 text-base`}>
                Book a 15-min call
              </TrackLink>
            </div>
          </div>
        </section>

        {/* 5. FAQ */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="FAQ" title="Questions owners ask" />
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface-2">
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
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-sm font-semibold uppercase tracking-widest text-blue">{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">{title}</h2>
    </div>
  );
}
