const cardSkeletons = Array.from({ length: 6 });

export default function PageLoading() {
  return (
    <main className="bg-gradient-to-b from-[#F2F7FA]/70 via-white to-white py-8">
      <div className="page-shell space-y-6" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading page...</span>
        <section className="rounded-3xl border border-[#004BB8]/10 bg-white/85 p-6 shadow-[0_18px_55px_-42px_rgba(2,28,43,0.28)]" aria-hidden="true">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[#5CB6B2]/20 motion-reduce:animate-none" />
          <div className="mt-4 h-8 w-80 max-w-full animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
        </section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {cardSkeletons.map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#004BB8]/10 bg-white shadow-sm motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </main>
  );
}
