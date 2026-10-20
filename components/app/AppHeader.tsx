import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/ui/Logo";
import { getCurrentVenue } from "@/lib/auth";
import { NavLinks, type NavItem } from "./NavLinks";
import { VenueSwitcher } from "./VenueSwitcher";

/** Top bar for signed-in pages: venue, navigation and sign out. */
export async function AppHeader() {
  const { access, venue } = await getCurrentVenue();
  const canEditRewards = venue && venue.role !== "staff";

  const items: NavItem[] = venue
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/add-visit", label: "Add visit" },
        { href: "/dashboard/messages", label: "Messages" },
        ...(canEditRewards ? [{ href: "/dashboard/rewards", label: "Rewards" }] : []),
        { href: "/dashboard/qr", label: "QR sign" },
      ]
    : [];
  if (access.isAdmin) items.push({ href: "/admin", label: "Admin" });

  return (
    <header className="border-b border-line bg-white print:hidden">
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/dashboard" aria-label="Dashboard home" className="shrink-0">
              <Logo />
            </Link>
            {venue && access.venues.length > 1 && (
              <VenueSwitcher venues={access.venues.map(({ id, name }) => ({ id, name }))} currentId={venue.id} />
            )}
          </div>
          <form action={signOut} className="flex items-center gap-3">
            <span className="hidden max-w-[14rem] truncate text-sm text-muted md:inline">{access.user.email}</span>
            <button type="submit" className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-ink/[0.06] hover:text-ink">
              Sign out
            </button>
          </form>
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
    <header className="border-b border-line bg-white">
      <div className="mx-auto h-[6.5rem] max-w-6xl px-4 pt-3">
        <Logo />
      </div>
    </header>
  );
}
