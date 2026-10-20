type Props = { checked: boolean; onChange: (checked: boolean) => void; text?: string };

// The demo uses the default wording; real venues pass their own, which is stored verbatim with each opt-in.
// Never pre-check this box.
export const OPT_IN_TEXT = "I agree to receive offers by text. Reply STOP to opt out.";

export function OptInCheckbox({ checked, onChange, text = OPT_IN_TEXT }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-left text-[13px] leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-[18px] shrink-0 accent-[var(--ink)]"
      />
      <span>{text}</span>
    </label>
  );
}
