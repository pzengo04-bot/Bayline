import { card } from "@/components/ui/styles";
import { site } from "@/lib/site";

/** Shown to a signed-in user who isn't linked to any venue yet. */
export function NoVenue() {
  return (
    <div className={`${card} mx-auto max-w-lg p-6 text-center sm:p-8`}>
      <h1 className="font-display text-3xl font-bold uppercase">No venue yet</h1>
      <p className="mt-2 text-muted">
        Your login isn&apos;t linked to a venue. Email{" "}
        <a href={`mailto:${site.email}`} className="font-semibold text-ink underline underline-offset-2">
          {site.email}
        </a>{" "}
        and we&apos;ll set you up.
      </p>
    </div>
  );
}
