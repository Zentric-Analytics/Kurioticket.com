export function DealsPreviewSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse">
          <div className="flex justify-between border-b p-4"><div className="space-y-2"><div className="h-5 w-32 rounded-full bg-slate-200" /><div className="h-5 w-48 rounded bg-slate-200" /></div><div className="h-4 w-40 rounded bg-slate-100" /></div>
          <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_288px] xl:items-start xl:gap-4 xl:p-4">
            <div className="space-y-4 p-4 xl:p-1"><div className="h-16 rounded bg-slate-100" /><div className="grid grid-cols-[88px_1fr] gap-3"><div className="aspect-square rounded-xl bg-slate-200" /><div className="space-y-2"><div className="h-4 w-1/2 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 w-4/5 rounded bg-slate-100" /></div></div></div>
            <div className="grid min-w-0 gap-4 border-t bg-slate-50 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-cols-[minmax(180px,0.75fr)_minmax(300px,1.15fr)_minmax(220px,0.85fr)] xl:block xl:self-start xl:rounded-xl xl:border xl:border-slate-200"><div className="space-y-2"><div className="h-3 w-3/4 rounded bg-slate-200" /><div className="h-7 rounded bg-slate-200" /><div className="h-3 w-2/3 rounded bg-slate-200" /></div><div className="space-y-2"><div className="h-8 rounded bg-slate-200" /><div className="h-8 rounded bg-slate-200" /></div><div className="space-y-2 md:col-span-2 lg:col-span-1 xl:mt-4"><div className="h-11 rounded-xl bg-slate-200" /><div className="h-3 w-5/6 rounded bg-slate-200" /></div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
