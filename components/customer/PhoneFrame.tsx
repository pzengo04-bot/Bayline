import type { ReactNode } from "react";

/** A simple phone outline so the customer screens read as "on their phone". */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[44px] bg-ink p-[10px] shadow-[0_30px_60px_-20px_rgba(15,21,18,0.45)]">
      <div className="relative flex h-[620px] flex-col overflow-hidden rounded-[34px] bg-white">
        <div className="flex items-center justify-between px-7 pb-1 pt-3 text-[12px] font-semibold">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2.5 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink" />
          <span className="flex items-center gap-1" aria-hidden="true">
            <svg width="16" height="10" viewBox="0 0 16 10">
              <rect x="0" y="6" width="3" height="4" rx="1" fill="currentColor" />
              <rect x="4.3" y="4" width="3" height="6" rx="1" fill="currentColor" />
              <rect x="8.6" y="2" width="3" height="8" rx="1" fill="currentColor" />
              <rect x="13" y="0" width="3" height="10" rx="1" fill="currentColor" />
            </svg>
            <svg width="22" height="11" viewBox="0 0 22 11">
              <rect x="0.5" y="0.5" width="18" height="10" rx="3" fill="none" stroke="currentColor" opacity="0.5" />
              <rect x="2" y="2" width="13" height="7" rx="1.5" fill="currentColor" />
              <rect x="19.5" y="3.5" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.5" />
            </svg>
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
