import { LABELS, type Label } from "@/lib/labels";

export function LabelChip({ label }: { label: Label }) {
  const l = LABELS[label];
  return (
    <span title={l.hint} className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${l.className}`}>
      {l.name}
    </span>
  );
}
