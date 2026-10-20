import type { ReactNode } from "react";
import { card } from "@/components/ui/styles";

type Props = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({ title, subtitle, action, children, className = "" }: Props) {
  return (
    <section className={`${card} p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-wide">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
