"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Thin wrapper around <dialog>, which gives us focus trapping and Esc-to-close for free. */
export function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
      aria-label={title}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
