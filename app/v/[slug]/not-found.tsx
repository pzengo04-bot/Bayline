import { site } from "@/lib/site";

export default function VenueNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-16 text-center">
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Venue not found</h1>
      <p className="mt-3 text-muted">
        This check-in link doesn&apos;t match a venue. Try scanning the QR code again, or ask the front desk.
      </p>
      <p className="mt-auto pt-10 text-xs text-muted">Rewards by {site.name}</p>
    </main>
  );
}
