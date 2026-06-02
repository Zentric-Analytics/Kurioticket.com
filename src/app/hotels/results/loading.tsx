export default function PageLoading() {
  return (
    <main className="flex-1 bg-gradient-to-b from-violet-50/55 via-white to-white py-8">
      <div className="page-shell grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden rounded-3xl border border-indigo-100 bg-white p-5 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)] lg:block">
          <div className="h-5 w-28 animate-pulse rounded-full bg-violet-100" />
          <div className="mt-5 space-y-4">
            <div className="h-20 animate-pulse rounded-2xl bg-violet-50" />
            <div className="h-20 animate-pulse rounded-2xl bg-violet-50" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
            <div className="h-5 w-36 animate-pulse rounded-full bg-violet-100" />
            <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
              <div className="grid md:grid-cols-[260px_1fr]">
                <div className="h-56 animate-pulse bg-slate-200 md:h-auto" />
                <div className="space-y-4 p-5">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-violet-100" />
                  <div className="h-7 w-72 max-w-full animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-4 w-56 max-w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
