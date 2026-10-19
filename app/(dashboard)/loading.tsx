export default function Loading() {
  return (
    <main id="main" className="space-y-6 px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-border" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-card bg-border/60" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </main>
  );
}
