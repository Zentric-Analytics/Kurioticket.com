export function DealsPreviewSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse">
          <div className="flex justify-between border-b p-4"><div className="space-y-2"><div className="h-5 w-32 rounded-full bg-slate-200" /><div className="h-5 w-48 rounded bg-slate-200" /></div><div className="h-4 w-40 rounded bg-slate-100" /></div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 p-4"><div className="h-16 rounded bg-slate-100" /><div className="grid grid-cols-[88px_1fr] gap-3"><div className="aspect-square rounded-xl bg-slate-200" /><div className="space-y-2"><div className="h-4 w-1/2 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 w-4/5 rounded bg-slate-100" /></div></div></div>
            <div className="space-y-3 border-t bg-slate-50 p-4 lg:border-s lg:border-t-0"><div className="h-4 w-3/4 rounded bg-slate-200" /><div className="h-7 rounded bg-slate-200" /><div className="h-11 rounded-xl bg-slate-200" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
