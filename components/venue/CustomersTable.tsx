"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  const customers = initial;
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<Label | null>(
    FILTERS.includes(initialLabel as Label) ? (initialLabel as Label) : null,
  );

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
      subtitle={`${customers.length} total`}
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
        className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base focus:border-blue focus:outline-none"
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
              labelFilter === l ? "bg-blue text-midnight" : "bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            {LABELS[l].name} · {counts.get(l)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 rounded-xl bg-midnight p-4 text-sm text-muted">No customers match{query ? <> &ldquo;{query}&rdquo;</> : " this filter"}.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
          {filtered.slice(0, limit).map((c) => (
            <li key={c.id} className="relative grid gap-1 px-3 py-3 hover:bg-surface-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {/* The whole row opens the profile. */}
                  <Link href={`/dashboard/customers/${c.id}`} className="truncate after:absolute after:inset-0">
                    {c.name}
                  </Link>
                  <LabelChip label={c.label} />
                </p>
                <p className="text-xs text-muted tabular-nums">{formatPhone(c.phone)}</p>
              </div>
              <p className="text-sm text-muted">
                <span className="font-semibold text-fg tabular-nums">{c.visits}</span> visit{c.visits === 1 ? "" : "s"}
                {showSpend && c.spend > 0 && <> · {formatMoney(c.spend)}</>}
                {c.daysSinceLastVisit !== null && <> · last {formatDaysAgo(c.daysSinceLastVisit)}</>}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-xs text-muted">{progressText(c.progress)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-3 w-full rounded-full border border-line py-2 text-sm font-semibold hover:border-blue/60"
        >
          Show more ({filtered.length - limit} left)
        </button>
      )}
    </Section>
  );
}
