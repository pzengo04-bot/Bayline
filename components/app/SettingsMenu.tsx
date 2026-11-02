"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, signOutEverywhere } from "@/app/login/actions";

export type SettingsLink = { href: string; label: string; hint?: string };

/** The gear at the top right: settings pages, the signed-in account and sign out. */
export function SettingsMenu({ links, email }: { links: SettingsLink[]; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const active = links.some((l) => pathname.startsWith(l.href));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Settings"
        className={`grid size-10 place-items-center rounded-full transition-colors ${
          open || active ? "bg-blue/15 text-blue" : "text-muted hover:bg-surface hover:text-fg"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          <p className="truncate border-b border-line px-4 py-3 text-xs text-muted">{email}</p>
          <ul className="py-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  role="menuitem"
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"
                >
                  {l.label}
                  {l.hint && <span className="block text-xs font-normal text-muted">{l.hint}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <form action={signOut} className="border-t border-line">
            <button type="submit" role="menuitem" className="w-full px-4 py-3 text-left text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
              Sign out
            </button>
          </form>
          <form
            action={signOutEverywhere}
            onSubmit={(e) => {
              if (!confirm("Sign out on every phone and computer, including this one?")) e.preventDefault();
            }}
          >
            <button type="submit" role="menuitem" className="w-full px-4 pb-3 pt-1 text-left text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
              Sign out of all devices
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
