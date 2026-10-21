"use client";

import { useMemo, useState, useTransition } from "react";
import { markOptedOut } from "@/app/dashboard/actions";
import { LabelChip } from "@/components/app/LabelChip";
import { Section } from "@/components/dashboard/Section";
import { LABELS, type Label } from "@/lib/labels";
import { formatDaysAgo, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { progressText, type Progress } from "@/lib/rewards";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  spend: number;
  daysSinceLastVisit: number | null;
  progress: Progress;
  textConsent: boolean;
  label: Label;
};

const PAGE = 25;

/** Searchable list of every customer with visits, last visit, reward progress and text consent. */
type Props = { customers: CustomerRow[]; showSpend: boolean; initialLabel?: string };

const FILTERS: Label[] = ["slipping", "vip", "regular", "new", "occasional", "lapsed", "demo_guest"];

export function CustomersTable({ customers: initial, showSpend, initialLabel }: Props) {
  const [customers, setCustomers] = useState(initial);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<Label | null>(
    FILTERS.includes(initialLabel as Label) ? (initialLabel as Label) : null,
  );
  const [pending, start] = useTransition();

  const optOut = (c: CustomerRow) => {
    if (!window.confirm(`Mark ${c.name} as opted out of texts? They'll be left out of message exports.`)) return;
    start(async () => {
      const { ok } = await markOptedOut(c.id);
      if (ok) setCustomers((list) => list.map((x) => (x.id === c.id ? { ...x, textConsent: false } : x)));
    });
  };
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return customers.filter(
      (c) =>
        (!labelFilter || c.label === labelFilter) &&
        (!q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits))),
    );
  }, [customers, query, labelFilter]);
  const counts = useMemo(() => {
    const m = new Map<Label, number>();
    customers.forEach((c) => m.set(c.label, (m.get(c.label) ?? 0) + 1));
    return m;
  }, [customers]);

  return (
    <Section
      title="Customers"
      subtitle={`${customers.length} total · ${customers.filter((c) => c.textConsent).length} opted in to texts`}
    >
      <label htmlFor="customer-search" className="sr-only">
        Search customers
      </label>
      <input
        id="customer-search"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
        placeholder="Search by name or phone"
        className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-base focus:border-ink focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by label">
        {FILTERS.filter((l) => counts.get(l)).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={labelFilter === l}
            onClick={() => {
              setLabelFilter(labelFilter === l ? null : l);
              setLimit(PAGE);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              labelFilter === l ? "bg-ink text-white" : "bg-ink/[0.06] text-muted hover:text-ink"
            }`}
          >
            {LABELS[l].name} · {counts.get(l)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 rounded-xl bg-paper p-4 text-sm text-muted">No customers match{query ? <> &ldquo;{query}&rdquo;</> : " this filter"}.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
          {filtered.slice(0, limit).map((c) => (
            <li key={c.id} className="grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{c.name}</span>
                  <LabelChip label={c.label} />
                </p>
                <p className="text-xs text-muted tabular-nums">{formatPhone(c.phone)}</p>
              </div>
              <p className="text-sm text-muted">
                <span className="font-semibold text-ink tabular-nums">{c.visits}</span> visit{c.visits === 1 ? "" : "s"}
                {showSpend && c.spend > 0 && <> · {formatMoney(c.spend)}</>}
                {c.daysSinceLastVisit !== null && <> · last {formatDaysAgo(c.daysSinceLastVisit)}</>}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-xs text-muted">{progressText(c.progress)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    c.textConsent ? "bg-accent/50 text-ink" : "bg-paper text-muted"
                  }`}
                >
                  {c.textConsent ? "Texts OK" : "No texts"}
                </span>
                {c.textConsent && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => optOut(c)}
                    className="text-[11px] font-medium text-muted underline underline-offset-2 hover:text-ink"
                  >
                    Opt out
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-3 w-full rounded-full border border-line py-2 text-sm font-semibold hover:border-ink/40"
        >
          Show more ({filtered.length - limit} left)
        </button>
      )}
    </Section>
  );
}
