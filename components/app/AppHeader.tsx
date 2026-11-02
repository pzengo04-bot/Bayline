import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getCurrentVenue } from "@/lib/auth";
import { NavLinks, type NavItem } from "./NavLinks";
import { SettingsMenu, type SettingsLink } from "./SettingsMenu";
import { VenueSwitcher } from "./VenueSwitcher";

/** Top bar for signed-in pages: venue, the four everyday tabs, and settings behind the gear. */
export async function AppHeader() {
  const { access, venue } = await getCurrentVenue();
  const owner = venue && venue.role !== "staff";

  const items: NavItem[] = venue
    ? [
        { href: "/dashboard/scan", label: "Scan" },
        ...(owner ? [{ href: "/dashboard", label: "Home" }] : []),
        { href: "/dashboard/customers", label: "Customers" },
        ...(owner ? [{ href: "/dashboard/messages", label: "Messages" }] : []),
      ]
    : [];
  const settings: SettingsLink[] = [
    ...(owner ? [{ href: "/dashboard/card", label: "Card", hint: "Design, colors and rewards" }] : []),
    ...(owner ? [{ href: "/dashboard/team", label: "Team", hint: "Invite staff, change roles" }] : []),
    ...(owner ? [{ href: "/dashboard/stand", label: "Stand", hint: "Counter stand and QR sign" }] : []),
    ...(owner && venue.is_demo
      ? [{ href: "/dashboard/messages?audience=demo_guests&template=win_back&quick=1", label: "Demo: send to demo guests", hint: "Test an offer on demo cards" }]
      : []),
    ...(access.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-line bg-surface-2 print:hidden">
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href={owner ? "/dashboard" : "/dashboard/scan"} aria-label="Dashboard home" className="shrink-0">
              <Logo height={36} />
            </Link>
            {venue && access.venues.length > 1 && (
              <VenueSwitcher venues={access.venues.map(({ id, name }) => ({ id, name }))} currentId={venue.id} />
            )}
          </div>
          <SettingsMenu links={settings} email={access.user.email ?? ""} />
        </div>
        <div className="mt-3 pb-3">
          <NavLinks items={items} />
        </div>
      </div>
    </header>
  );
}

export function AppHeaderSkeleton() {
  return (
    <header className="border-b border-line bg-surface-2">
      <div className="mx-auto h-[6.5rem] max-w-6xl px-4 pt-3">
        <Logo height={36} />
      </div>
    </header>
  );
}
