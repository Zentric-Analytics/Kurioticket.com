import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export function FlightCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}

export function HotelCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[800px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_38px_-26px_rgba(2,28,43,0.22)]"
    >
      <div className="grid md:grid-cols-[40%_minmax(0,1fr)]">
        <Skeleton className="h-[clamp(280px,78vw,340px)] rounded-none bg-slate-200 md:h-auto md:min-h-[230px] lg:min-h-[240px]" />

        <div className="flex min-h-[200px] flex-col px-3.5 py-3.5 md:min-h-0 md:px-3 md:py-3">
          <div className="flex flex-1 flex-col">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Skeleton className="h-5 w-3/5 min-w-0" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>

              <div className="mt-1 flex items-center gap-1">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
              </div>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/4" />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] border-t border-slate-200 pt-3">
              <div className="min-w-0 space-y-2 pe-2.5 md:pe-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>

              <div className="flex min-w-0 flex-col border-s border-slate-200 ps-2.5 text-end md:ps-3">
                <div className="flex flex-col items-end space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="mt-3 h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CarCardSkeleton() {
  return (
    <div role="status" aria-label="Loading car result" className="overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white">
      <span className="sr-only">Loading car result</span>
      <div className="grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_205px]">
        <div className="flex flex-col justify-center gap-2 border-b border-[#E2E8F0] bg-slate-50 p-3 md:border-b-0 md:border-e">
          <Skeleton className="aspect-[16/10] w-full rounded-xl md:aspect-[4/3]" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-4 p-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-2/3" /><div className="flex flex-wrap gap-3">{["w-20", "w-16", "w-16", "w-20", "w-24"].map((width, index) => <Skeleton key={index} className={`h-4 ${width}`} />)}</div><div className="flex flex-wrap gap-2"><Skeleton className="h-7 w-28" /><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-32" /></div><Skeleton className="h-4 w-4/5" /><div className="border-t border-slate-100 pt-4"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2 h-3 w-52" /></div></div>
        <div className="col-span-full flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between xl:col-span-1 xl:block xl:border-s xl:border-t-0"><div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /><Skeleton className="h-3 w-12" /><Skeleton className="h-8 w-28" /></div><Skeleton className="h-11 w-full sm:w-40 xl:mt-5 xl:w-full" /></div>
      </div>
    </div>
  );
}
