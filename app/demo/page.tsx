import type { Metadata } from "next";
import Image from "next/image";
import QRCode from "qrcode";
import { DemoDashboard } from "@/components/demo/DemoDashboard";
import { TrackView } from "@/components/demo/TrackView";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrackLink } from "@/components/site/TrackLink";
import { button } from "@/components/ui/styles";
import { site } from "@/lib/site";
import barberCard from "@/public/marketing/cards/barber-in-progress.png";
import cafeCard from "@/public/marketing/cards/cafe-in-progress.png";
import golfCard from "@/public/marketing/cards/golf-reward-ready.png";

export const metadata: Metadata = {
  title: `Demo | ${site.name}`,
  description: "Add a real rewards card to your phone, then see what the owner sees.",
};

const steps = [
  "Join with your first name and phone",
  "Add the card to Apple or Google Wallet",
  "Open the link again to earn a stamp and watch the card update",
];

export default async function DemoPage() {
  const qr = await QRCode.toString(site.demoUrl, { type: "svg", margin: 1, color: { dark: "#0f1512", light: "#ffffff" } });

  return (
    <div className="flex flex-1 flex-col">
      <TrackView event="demo_view" />
      <SiteHeader />
      <main className="flex-1">
        {/* 1. Heading */}
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:pt-16">
          <h1 className="font-display text-[3.2rem] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            See Bayline <span className="whitespace-nowrap">in action.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Add a real rewards card to your phone, then see what the owner sees.</p>
        </section>

        {/* 2. Try it on your phone */}
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="grid gap-8 rounded-3xl bg-ink p-6 text-white sm:p-10 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="hidden md:block">
              <div
                className="size-60 rounded-2xl bg-white p-3 lg:size-72 [&>svg]:h-full [&>svg]:w-full"
                role="img"
                aria-label={`QR code linking to ${site.demoUrl}`}
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">Try it on your phone</p>
              <p className="mt-3 hidden font-display text-3xl font-bold uppercase leading-tight md:block">
                Scan with your phone camera to add a real Bayline card to Apple or Google Wallet.
              </p>
              <p className="mt-3 font-display text-3xl font-bold uppercase leading-tight md:hidden">
                Add a real Bayline card to Apple or Google Wallet.
              </p>
              <TrackLink event="demo_button_click" href={site.demoUrl} className={`${button.accent} mt-6 h-14 w-full text-lg md:hidden`}>
                Add the demo card
              </TrackLink>
              <ol className="mt-8 space-y-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-bold text-ink">{i + 1}</span>
                    <span className="text-white/85">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 3. The owner dashboard */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-strong">What the owner sees</p>
            <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
              Who&apos;s slipping, and one tap to bring them back.
            </h2>
            <p className="mt-3 max-w-2xl text-muted">A sample dashboard. Try the Send offer button.</p>
            <div className="mt-8">
              <DemoDashboard />
            </div>
          </div>
        </section>

        {/* 4. Card styles */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-strong">Card styles</p>
            <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
              Your logo, your colors, stamps that match your business.
            </h2>
            <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {(
                [
                  [cafeCard, "Café", "A Corner Coffee card filling up with coffee cups, a gift on the halfway reward and a trophy on the last stamp."],
                  [golfCard, "Indoor golf", "A Back Nine Golf card with every golf-ball stamp filled and a banner reading Free bay hour ready! Show staff."],
                  [barberCard, "Barbershop", "A Sharp & Co. card with scissors stamps, two of six filled."],
                ] as const
              ).map(([src, label, alt]) => (
                <figure key={label} className="w-[78%] shrink-0 snap-center sm:w-auto">
                  <Image src={src} alt={alt} sizes="(min-width: 640px) 33vw, 78vw" className="h-auto w-full rounded-[14px] shadow-[0_18px_40px_-20px_rgba(15,21,18,0.45)]" />
                  <figcaption className="mt-3 text-center text-sm font-semibold text-muted">{label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 5. CTA */}
        <section className="border-t border-line bg-accent">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
            <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">Want this for your business?</h2>
            <TrackLink event="book_call_click" href={site.callUrl} className={`${button.primary} mt-8 h-12 px-6 text-base`}>
              Book a 15-min call
            </TrackLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
