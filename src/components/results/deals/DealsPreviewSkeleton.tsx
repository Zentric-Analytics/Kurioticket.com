import { cn } from "@/lib/utils";

type DealsPreviewSkeletonProps = {
  withTopMargin?: boolean;
};

export function DealsPreviewSkeleton({
  withTopMargin = true,
}: DealsPreviewSkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("space-y-4", withTopMargin && "mt-6")}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse">
          <div className="flex flex-col gap-1.5 border-b px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-2"><div className="h-5 w-32 rounded-full bg-slate-200" /><div className="h-4 w-24 rounded bg-slate-100" /></div><div className="flex items-center gap-3"><div className="h-4 w-40 rounded bg-slate-100" /><div className="h-4 w-16 rounded bg-slate-100" /></div></div>
          <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_288px] xl:items-start xl:gap-4 xl:px-4 xl:py-3">
            <div className="space-y-3 p-4 xl:px-1 xl:py-0"><div className="h-16 rounded bg-slate-100" /><div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[136px_minmax(0,1fr)]"><div className="aspect-square rounded-xl bg-slate-200" /><div className="space-y-2"><div className="h-4 w-1/2 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 w-4/5 rounded bg-slate-100" /></div></div></div>
            <div className="grid min-w-0 gap-4 border-t border-slate-200 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-cols-[minmax(180px,0.75fr)_minmax(300px,1.15fr)_minmax(220px,0.85fr)] xl:block xl:self-start xl:border-s xl:border-t-0 xl:px-0 xl:py-3 xl:pe-1 xl:ps-5"><div className="space-y-2"><div className="h-3 w-3/4 rounded bg-slate-200" /><div className="h-7 rounded bg-slate-200" /><div className="h-3 w-2/3 rounded bg-slate-200" /></div><div className="space-y-2"><div className="h-8 rounded bg-slate-200" /><div className="h-8 rounded bg-slate-200" /></div><div className="space-y-2 md:col-span-2 lg:col-span-1 xl:mt-3"><div className="h-11 rounded-xl bg-slate-200" /><div className="h-3 w-5/6 rounded bg-slate-200" /></div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
