import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "@/components/ui/Logo";
import { button, card } from "@/components/ui/styles";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { VenueIcon } from "@/components/landing/VenueIcon";

const venues = [
  { icon: "golf", title: "Indoor golf & simulators", body: "Bays booked by the hour, peaks every evening." },
  { icon: "paddle", title: "Pickleball & padel clubs", body: "Courts, open play and leagues." },
  { icon: "bat", title: "Batting cages", body: "Cage rentals, lessons and team sessions." },
  { icon: "clock", title: "Other time-slot venues", body: "If you sell time on a bay, court or lane, it fits." },
] as const;

const steps = [
  {
    title: "Customers check in with their phone number",
    body: "At the front desk or on their own phone. No app download, no plastic card.",
  },
  {
    title: "They earn rewards for coming back",
    body: "Simple and easy to explain, like 5 visits = a free bay hour. You set the rules.",
  },
  {
    title: "You see who's gone quiet and when bays sit empty",
    body: "Then win customers back, or fill a slow Tuesday afternoon, with one tap.",
  },
];

const benefits = [
  {
    title: "Know your regulars",
    body: "See who comes most, what they spend, and when they usually play, without digging through booking exports.",
  },
  {
    title: "Win back lapsed customers",
    body: "Get a list of regulars who haven't been in for 3+ weeks and send them a personal offer in one tap.",
  },
  {
    title: "Fill off-peak hours",
    body: "A heatmap of every hour of the week shows exactly when bays sit empty, so you can promote those hours.",
  },
  {
    title: "See the results in dollars",
    body: "Every offer is tracked: who came back and how much they booked. No guessing whether it worked.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-5">
            <a href="#how-it-works" className="hidden text-muted hover:text-ink sm:inline">
              How it works
            </a>
            <a href="#founding" className="hidden text-muted hover:text-ink sm:inline">
              Founding offer
            </a>
            <Link href="/login" className="whitespace-nowrap px-2 text-muted hover:text-ink sm:px-0">
              Venue login
            </Link>
            <Link href="/demo" className={button.small}>
              Live demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold text-muted">
              <span className="size-1.5 rounded-full bg-accent-strong" />
              For indoor golf & sports venues
            </p>
            <h1 className="mt-5 font-display text-[3.4rem] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Fill your{" "}
              <span className="relative whitespace-nowrap">
                <span className="absolute inset-x-[-0.08em] bottom-[0.06em] top-[0.52em] -z-10 bg-accent" />
                empty bays.
              </span>
              <br />
              Bring back your regulars.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {site.name} gives indoor golf and sports venues a simple rewards program customers join with their phone
              number, plus a dashboard that shows who&apos;s drifting away and which hours sit empty.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className={`${button.primary} h-12 px-6 text-base`}>
                See the live demo <span aria-hidden="true">→</span>
              </Link>
              <a href={site.callUrl} className={`${button.secondary} h-12 px-6 text-base`}>
                Book a 15-min call
              </a>
            </div>
          </div>
          <HeroVisual />
        </section>

        {/* Who it's for */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="Who it's for" title="Built for venues that sell time" />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {venues.map((v) => (
                <div key={v.title} className="rounded-2xl border border-line bg-paper p-5">
                  <VenueIcon name={v.icon} />
                  <h3 className="mt-4 font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="How it works" title="Three steps. Nothing to install." />
            <ol className="mt-10 grid gap-3 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className={`${card} flex gap-4 p-5 sm:p-6 lg:block`}>
                  <span className="font-display text-5xl font-extrabold leading-none text-ink/15 lg:text-7xl">
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

        {/* What owners get */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <SectionHeading eyebrow="What owners get" title="Answers you can act on this week" inverted />
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-1.5 rounded-full bg-accent" />
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide">{b.title}</h3>
                  </div>
                  <p className="mt-3 text-white/70">{b.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link href="/demo" className={`${button.accent} h-12 px-6 text-base`}>
                Click through the demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Founding venue offer */}
        <section id="founding" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="relative overflow-hidden rounded-3xl bg-accent p-7 sm:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 hidden h-64 w-64 rounded-full border-[28px] border-ink/[0.07] sm:block"
              />
              <p className="text-sm font-semibold uppercase tracking-widest">Founding partners</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
                Now accepting founding partner venues
              </h2>
              <p className="mt-4 max-w-xl text-lg">
                Free 60-day pilot for our first 10 venues. We&apos;ll set it up with you and tune it to how your venue
                actually runs.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={site.callUrl} className={`${button.primary} h-12 px-6 text-base`}>
                  Book a 15-min call
                </a>
                <a href={`mailto:${site.email}?subject=Founding%20venue%20pilot`} className={`${button.secondary} h-12 px-6 text-base`}>
                  Email us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Contact / footer */}
      <footer id="contact" className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-sm text-white/70">{site.tagline}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/50">Get in touch</p>
            <a href={`mailto:${site.email}`} className="mt-3 block text-lg font-medium hover:text-accent">
              {site.email}
            </a>
            <a href={site.phoneHref} className="mt-1 block text-lg font-medium hover:text-accent">
              {site.phone}
            </a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-white/50 sm:flex-row sm:justify-between">
            <p>© {site.name}</p>
            <div className="flex gap-5">
              <Link href="/demo" className="hover:text-white">
                Live demo
              </Link>
              <Link href="/login" className="hover:text-white">
                Venue login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, inverted = false }: { eyebrow: string; title: string; inverted?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-widest ${inverted ? "text-accent" : "text-accent-strong"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">{title}</h2>
    </div>
  );
}
