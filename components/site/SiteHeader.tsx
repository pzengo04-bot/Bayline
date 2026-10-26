import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { button } from "@/components/ui/styles";
import { site } from "@/lib/site";
import { TrackLink } from "./TrackLink";

/** Marketing header. On other pages the section links point back to the homepage. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const at = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium sm:gap-5">
          <a href={at("how-it-works")} className="hidden text-muted hover:text-ink md:inline">
            How it works
          </a>
          <Link href="/login" className="whitespace-nowrap px-2 text-muted hover:text-ink sm:px-0">
            Venue login
          </Link>
          <TrackLink event="try_it_click" href="/demo" className={`${button.small} whitespace-nowrap px-5`}>
            Demo
          </TrackLink>
        </nav>
      </div>
    </header>
  );
}
