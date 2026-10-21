import Link from "next/link";
import QRCode from "qrcode";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { card } from "@/components/ui/styles";
import { requireVenue } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { isoDaysAgo } from "@/lib/format";
import { programSummary } from "@/lib/rewards";
import { createUserClient } from "@/lib/supabase/server";
import { PrintButton } from "../qr/PrintButton";
import { CopyLink } from "./CopyLink";

export default function StandPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Stand />
    </Suspense>
  );
}

async function Stand() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;

  const nfcUrl = `${siteUrl()}/t/${venue.slug}`;
  const qrUrl = `${nfcUrl}?src=qr`;
  const svg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f1512", light: "#ffffff" } });

  const since = isoDaysAgo(30);
  const supabase = await createUserClient();
  const counts = await Promise.all(
    (["nfc", "qr"] as const).map(async (src) => {
      const { count } = await supabase
        .from("taps")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", venue.id)
        .eq("source", src)
        .gte("created_at", since);
      return count ?? 0;
    }),
  );

  return (
    <div className="space-y-5">
      {/* 4×6" portrait insert, no browser margins, colors printed as shown. */}
      <style>{`@page { size: 4in 6in; margin: 0; } @media print { body { background: white; } }`}</style>

      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">Stand</h1>
          <p className="mt-1 text-sm text-muted">Your NFC tag link and a 4×6&quot; insert for a standard acrylic sign holder.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid items-start gap-5 print:block lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4 print:hidden">
          <section className={`${card} p-4 sm:p-5`}>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">NFC tag link</h2>
            <p className="mt-1 text-sm text-muted">Write this to the NFC tag in your stand. Customers tap their phone on it to join or get a stamp.</p>
            <div className="mt-3">
              <CopyLink url={nfcUrl} />
            </div>
            <p className="mt-3 text-xs text-muted">
              How: install the free <strong>NFC Tools</strong> app, tap <strong>Write → Add a record → URL</strong>, paste the link,
              then <strong>Write</strong> and hold your phone to the tag. Test it, then use <strong>Other → Lock tag</strong> so
              nobody can overwrite it. Use NTAG215 (or NTAG213/216) stickers.
            </p>
          </section>
          <section className={`${card} p-4 sm:p-5`}>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">Last 30 days</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-muted">NFC taps</dt>
                <dd className="font-display text-4xl font-bold tabular-nums">{counts[0]}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">QR scans</dt>
                <dd className="font-display text-4xl font-bold tabular-nums">{counts[1]}</dd>
              </div>
            </dl>
          </section>
          <p className="text-sm text-muted">
            Need a full-page sign instead? <Link href="/dashboard/qr" className="font-semibold text-ink underline underline-offset-2">Letter-size QR sign</Link>
          </p>
        </div>

        {/* The insert: 4in × 6in when printed; scaled preview on screen. */}
        <div className="mx-auto w-[18rem] max-w-full shadow-[0_20px_50px_-25px_rgba(15,21,18,0.4)] print:w-auto print:max-w-none print:shadow-none">
          <div
            className="@container relative flex aspect-[4/6] flex-col items-center bg-white text-center text-ink print:h-[6in] print:w-[4in] print:aspect-auto"
            style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
          >
            <div className="h-[4cqw] w-full" style={{ background: venue.card_bg }} />
            <div className="mt-[9cqw] flex h-[18cqw] items-center justify-center">
              {venue.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={venue.logo_url} alt="" className="max-h-[18cqw] max-w-[70cqw] object-contain" />
              ) : (
                <p className="font-display text-[11cqw] font-extrabold uppercase leading-none">{venue.name}</p>
              )}
            </div>
            <p className="mt-[7cqw] font-display text-[10cqw] font-extrabold uppercase leading-[0.95]">
              Tap or scan
              <br />
              to join rewards
            </p>
            <p className="mt-[3cqw] text-[4.4cqw] text-muted">{programSummary(venue)}</p>
            <div
              className="mt-[7cqw] w-[52cqw] rounded-[3cqw] border-[0.8cqw] border-ink p-[3cqw] [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
              role="img"
              aria-label="QR code to join rewards"
            />
            <p className="mt-[5cqw] flex items-center gap-[2cqw] text-[4cqw] font-semibold">
              <svg viewBox="0 0 24 24" className="size-[6cqw]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 8.5a6 6 0 0 1 0 7M9.5 6a10 10 0 0 1 0 12M13 3.5a14 14 0 0 1 0 17" />
              </svg>
              Hold your phone here
            </p>
            <p className="mt-auto mb-[6cqw] text-[3.4cqw] text-muted">No app needed · Adds a card to your wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
