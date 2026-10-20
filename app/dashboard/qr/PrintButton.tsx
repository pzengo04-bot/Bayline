"use client";

import { button } from "@/components/ui/styles";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={button.primary}>
      Print sign
    </button>
  );
}
