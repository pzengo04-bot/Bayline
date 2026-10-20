/** Placeholder blocks while a signed-in page loads its data. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading">
      <div className="h-10 w-56 rounded-xl bg-ink/[0.06]" />
      <div className="grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-ink/[0.05]" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-ink/[0.05]" />
    </div>
  );
}
