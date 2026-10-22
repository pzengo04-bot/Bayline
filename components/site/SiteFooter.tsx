import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-white/70">{site.tagline}</p>
          <a href={`mailto:${site.email}`} className="mt-3 inline-flex min-h-11 items-center text-lg font-medium hover:text-accent">
            {site.email}
          </a>
        </div>
        <nav aria-label="Footer" className="-mx-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-white/70 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:px-2">
          <Link href="/support" className="hover:text-white">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/login" className="hover:text-white">
            Venue login
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-white/50">© {site.name}</p>
      </div>
    </footer>
  );
}
