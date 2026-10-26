import type { ReactNode } from "react";

/**
 * An iPhone outline at real proportions (9:19.5): bezel, Dynamic Island and status bar. Set the
 * width with `className`; the height follows. `screen` is the background behind the content.
 */
export function PhoneFrame({ children, className = "", screen = "#efeee9" }: { children: ReactNode; className?: string; screen?: string }) {
  return (
    <div className={`aspect-[9/19.5] rounded-[2.75rem] bg-ink p-[0.55rem] shadow-[0_40px_80px_-30px_rgba(15,21,18,0.55)] ${className}`}>
      <div className="relative h-full overflow-hidden rounded-[2.25rem]" style={{ background: screen }}>
        <div className="absolute left-1/2 top-2.5 z-10 h-[1.6rem] w-[32%] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
        <div className="flex items-center justify-between px-6 pt-3.5 text-[12px] font-semibold" aria-hidden="true">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3.5 rounded-[2px] bg-current opacity-80" />
            <span className="h-2.5 w-5 rounded-[3px] border border-current p-[1px] opacity-80">
              <span className="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>
        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}
