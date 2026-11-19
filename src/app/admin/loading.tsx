export default function AdminLoading() {
  return (
    <div className="w-full min-w-0" aria-busy="true" aria-label="Loading admin page">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}
