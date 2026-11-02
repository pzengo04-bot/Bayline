"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** orange for redeeming a reward, red for taking something away. */
  tone?: "orange" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** "Are you sure?" with big buttons, for redeeming, removing a stamp and resetting a card. */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = "orange", busy, onConfirm, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-fg/85">{children}</div>
      <div className="mt-6 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`h-14 rounded-full text-lg font-semibold disabled:opacity-60 ${
            tone === "orange" ? "bg-orange text-midnight hover:bg-orange-hover" : "bg-red-400 text-midnight hover:bg-red-300"
          }`}
        >
          {busy ? "Saving…" : confirmLabel}
        </button>
        <button type="button" onClick={onClose} className="h-12 rounded-full border border-line bg-surface-2 font-semibold">
          Cancel
        </button>
      </div>
    </Modal>
  );
}
