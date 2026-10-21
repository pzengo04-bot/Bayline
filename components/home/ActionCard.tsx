import Link from "next/link";
import { button } from "@/components/ui/styles";

type Props =
  | { kind: "slipping"; count: number; demo?: boolean }
  | { kind: "slow"; window: string; demo?: boolean }
  | { kind: "quiet"; demo?: boolean };

/** "This week's action": the single most valuable thing to do, with one button to do it. */
export function ActionCard(props: Props) {
  const { headline, body, href } =
    props.kind === "slipping"
      ? {
          headline: `${props.count} regular${props.count === 1 ? "" : "s"} ${props.count === 1 ? "hasn't" : "haven't"} been back in twice their usual time.`,
          body: "Send them a “we miss you” offer?",
          href: "/dashboard/messages?audience=slipping&template=win_back",
        }
      : props.kind === "slow"
        ? {
            headline: `${props.window} is your quietest stretch.`,
            body: "Invite your regulars in?",
            href: `/dashboard/messages?audience=regulars&template=slow_hours`,
          }
        : { headline: "All quiet.", body: "Your regulars are on track.", href: null };

  return (
    <section className="rounded-2xl bg-ink p-5 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">This week&apos;s action</p>
      <p className="mt-2 font-display text-3xl font-bold uppercase leading-[1.02] sm:text-4xl">{headline}</p>
      <p className="mt-2 text-white/80">{body}</p>
      {(href || props.demo) && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {href && (
            <Link href={href} className={`${button.accent} h-12 px-6 text-base`}>
              Review &amp; send
            </Link>
          )}
          {props.demo && (
            <Link
              href="/dashboard/messages?audience=demo_guests&template=win_back&quick=1"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-6 text-base font-semibold text-white hover:bg-white/10"
            >
              Send to demo guests now
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
