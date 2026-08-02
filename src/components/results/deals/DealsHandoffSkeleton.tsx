export function DealsHandoffSkeleton({ label }: { label: string }) {
  return <div className="mt-7" role="status">
    <span className="sr-only">{label}</span>
    <div aria-hidden className="grid gap-6 motion-safe:animate-pulse xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="order-2 space-y-4 xl:order-1">{[0, 1].map(item => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="h-5 w-28 rounded bg-slate-200" /><div className="mt-5 h-7 w-3/5 rounded bg-slate-200" /><div className="mt-4 h-4 w-full rounded bg-slate-100" /><div className="mt-3 h-4 w-4/5 rounded bg-slate-100" /><div className="mt-6 h-11 w-48 rounded-xl bg-slate-200" /></div>)}</div>
      <div className="order-1 rounded-2xl border border-slate-200 bg-white p-6 xl:order-2"><div className="h-6 w-32 rounded bg-slate-200" /><div className="mt-5 h-4 w-4/5 rounded bg-slate-100" /><div className="mt-4 h-2 w-full rounded bg-slate-200" /><div className="mt-8 h-8 w-3/4 rounded bg-slate-200" /></div>
    </div>
  </div>;
}
