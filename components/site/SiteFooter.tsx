import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-fg">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo height={44} />
          <p className="mt-4 max-w-sm text-muted">{site.tagline}</p>
          <a href={`mailto:${site.email}`} className="mt-3 inline-flex min-h-11 items-center text-lg font-medium hover:text-blue">
            {site.email}
          </a>
        </div>
        <nav aria-label="Footer" className="-mx-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:px-2">
          <Link href="/support" className="hover:text-fg">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
          <Link href="/login" className="hover:text-fg">
            Venue login
          </Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted">© {site.name}</p>
      </div>
    </footer>
  );
}
