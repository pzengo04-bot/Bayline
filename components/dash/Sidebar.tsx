import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getCurrentVenue, isOwner } from "@/lib/auth";
import { SideNav, type SideNavItem } from "./SideNav";
import { VenueMenu } from "./VenueMenu";

/**
 * The dashboard's navigation: a 240px sidebar on desktop (logo, venue, Home/Scan/Customers/Messages,
 * then Help and Settings at the bottom), and a top bar with a scrolling tab row on phones.
 */
export async function Sidebar() {
  const { access, venue } = await getCurrentVenue();
  const owner = isOwner(venue);
  const main: SideNavItem[] = venue
    ? owner
      ? [
          { href: "/dashboard", label: "Home", icon: "home" },
          { href: "/dashboard/scan", label: "Scan", icon: "scan" },
          { href: "/dashboard/customers", label: "Customers", icon: "customers" },
          { href: "/dashboard/messages", label: "Messages", icon: "messages" },
        ]
      : [
          { href: "/dashboard/scan", label: "Scan", icon: "scan" },
          { href: "/dashboard/customers", label: "Customers", icon: "customers" },
        ]
    : [];
  const bottom: SideNavItem[] = [
    { href: "/support", label: "Help", icon: "help" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];
  const venues = access.venues.map(({ id, name, role }) => ({ id, name, role }));
  const homeHref = owner ? "/dashboard" : "/dashboard/scan";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex print:hidden">
        <Link href={homeHref} aria-label="Dashboard home" className="px-2">
          <Logo height={34} />
        </Link>
        {venue && (
          <div className="mt-6">
            <VenueMenu venues={venues} currentId={venue.id} />
          </div>
        )}
        <nav aria-label="Dashboard" className="mt-5">
          <SideNav items={main} />
        </nav>
        <div className="mt-auto border-t border-line pt-3">
          <SideNav items={bottom} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 pt-3">
          <Link href={homeHref} aria-label="Dashboard home" className="shrink-0">
            <Logo height={30} />
          </Link>
          {venue && (
            <div className="ml-auto w-48 min-w-0">
              <VenueMenu venues={venues} currentId={venue.id} />
            </div>
          )}
        </div>
        <nav aria-label="Dashboard" className="px-3 pb-2 pt-2">
          <SideNav compact items={[...main, ...bottom.filter((b) => b.icon === "settings")]} />
        </nav>
      </header>
    </>
  );
}

export function SidebarSkeleton() {
  return <aside className="hidden h-screen w-60 shrink-0 border-r border-line bg-surface lg:block" />;
}
