"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, type NavIcon } from "./icons";

export type SideNavItem = { href: string; label: string; icon: NavIcon };

/** Sidebar links: 44px rows, the current page on a soft blue background with a blue icon. */
export function SideNav({ items, compact = false }: { items: SideNavItem[]; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className={compact ? "flex gap-1 overflow-x-auto [scrollbar-width:none]" : "space-y-1"}>
      {items.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = NAV_ICONS[item.icon];
        return (
          <li key={item.href} className={compact ? "shrink-0" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
                active ? "bg-blue/15 text-fg [&_svg]:text-blue" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
