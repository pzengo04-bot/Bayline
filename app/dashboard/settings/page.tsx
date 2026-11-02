import Link from "next/link";
import { Suspense } from "react";
import { signOut, signOutEverywhere } from "@/app/login/actions";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { getCurrentVenue, isOwner } from "@/lib/auth";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

const row = "flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2";

/** Venue settings for owners (card, stand, team), and the account for everyone. */
async function Settings() {
  const { access, venue } = await getCurrentVenue();
  const owner = isOwner(venue);
  const links = [
    ...(owner ? [{ href: "/dashboard/card", label: "Card", hint: "Logo, colors, stamps and rewards" }] : []),
    ...(owner ? [{ href: "/dashboard/team", label: "Team", hint: "Invite staff, change roles, remove people" }] : []),
    ...(owner ? [{ href: "/dashboard/stand", label: "Stand", hint: "NFC link and the printable insert" }] : []),
    ...(owner && venue?.is_demo
      ? [{ href: "/dashboard/messages?audience=demo_guests&template=win_back&quick=1", label: "Demo: send to demo guests", hint: "Test an offer on demo cards" }]
      : []),
    ...(access.isAdmin ? [{ href: "/admin", label: "Admin", hint: "Every venue on the platform" }] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      {links.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={row}>
                <span>
                  <span className="block font-semibold">{l.label}</span>
                  <span className="block text-sm text-muted">{l.hint}</span>
                </span>
                <span className="text-blue-light" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <p className="border-b border-line px-4 py-3 text-sm text-muted">
          Signed in as <span className="font-semibold text-fg">{access.user.email}</span>
        </p>
        <form action={signOut}>
          <button type="submit" className={`${row} w-full text-left font-semibold`}>
            Sign out
          </button>
        </form>
        <form action={signOutEverywhere} className="border-t border-line">
          <button type="submit" className={`${row} w-full text-left`}>
            <span>
              <span className="block font-semibold">Sign out of all devices</span>
              <span className="block text-sm text-muted">Every phone and computer, including this one</span>
            </span>
          </button>
        </form>
      </section>
    </div>
  );
}
