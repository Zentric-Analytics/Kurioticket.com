export default function PageLoading() {
  return (
    <main className="page-shell py-8">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
    </main>
  );
}
