"use client";

import { useMemo, useState } from "react";
import { Section } from "@/components/dashboard/Section";
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
};

const PAGE = 25;

/** Searchable list of every customer with visits, last visit, reward progress and text consent. */
export function CustomersTable({ customers, showSpend }: { customers: CustomerRow[]; showSpend: boolean }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
  }, [customers, query]);

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
      {filtered.length === 0 ? (
        <p className="mt-3 rounded-xl bg-paper p-4 text-sm text-muted">No customers match &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
          {filtered.slice(0, limit).map((c) => (
            <li key={c.id} className="grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
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
