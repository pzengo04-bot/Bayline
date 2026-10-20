type Props = { checked: boolean; onChange: (checked: boolean) => void };

// Consent wording is fixed; keep it exactly as written. Never pre-check this box.
export const OPT_IN_TEXT = "I agree to receive offers by text. Reply STOP to opt out.";

export function OptInCheckbox({ checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-left text-[13px] leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-[18px] shrink-0 accent-[var(--ink)]"
      />
      <span>{OPT_IN_TEXT}</span>
    </label>
  );
}
