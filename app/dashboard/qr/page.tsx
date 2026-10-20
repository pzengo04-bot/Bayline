import QRCode from "qrcode";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Logo } from "@/components/ui/Logo";
import { requireVenue } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { programSummary } from "@/lib/rewards";
import { PrintButton } from "./PrintButton";

export default function QrPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QrSign />
    </Suspense>
  );
}

async function QrSign() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;

  const url = `${siteUrl()}/v/${venue.slug}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0f1512", light: "#ffffff" },
  });
  const shortUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-5">
      {/* Letter paper, no browser margins, colors printed as shown. */}
      <style>{`@page { size: letter; margin: 0; } @media print { body { background: white; } }`}</style>

      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">QR sign</h1>
          <p className="mt-1 text-sm text-muted">
            Print on letter paper and put it at the front desk. Customers scan it to check in.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mx-auto w-full max-w-[34rem] shadow-[0_20px_50px_-25px_rgba(15,21,18,0.4)] print:max-w-none print:shadow-none">
        <div
          className="@container relative flex aspect-[8.5/11] flex-col items-center bg-white text-center text-ink print:h-[11in] print:w-[8.5in] print:aspect-auto"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
          <div className="h-[3cqw] w-full bg-accent" />
          <p className="mt-[8cqw] text-[3cqw] font-semibold uppercase tracking-[0.3em] text-muted">Rewards</p>
          <h2 className="mt-[1.5cqw] max-w-[85%] font-display text-[10cqw] font-extrabold uppercase leading-[0.9]">{venue.name}</h2>
          <p className="mt-[4cqw] font-display text-[6.5cqw] font-bold uppercase leading-none">Scan to earn rewards</p>
          <p className="mt-[2cqw] text-[3.4cqw] text-muted">{programSummary(venue)}</p>
          <div
            className="mt-[5cqw] w-[46cqw] rounded-[3cqw] border-[0.6cqw] border-ink p-[3cqw] [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
            role="img"
            aria-label={`QR code for ${shortUrl}`}
          />
          <p className="mt-[3.5cqw] text-[3cqw] font-medium">
            No app needed. Just your phone number.
          </p>
          <p className="mt-[1cqw] font-mono text-[2.6cqw] text-muted">{shortUrl}</p>
          <div className="mt-auto mb-[5cqw] flex scale-[0.8] items-center opacity-70 [font-size:2.2cqw]">
            <Logo />
          </div>
        </div>
      </div>
      {!url.startsWith("https://") && (
        <p className="mx-auto max-w-[34rem] rounded-xl bg-paper px-3 py-2.5 text-sm text-muted print:hidden">
          This QR code points to {shortUrl}, which only works on this computer. On the live site it points to your
          real address.
        </p>
      )}
    </div>
  );
}
