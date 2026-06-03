import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const summarySkeletons = Array.from({ length: 7 });
const resultSkeletons = Array.from({ length: 3 });
const filterSkeletons = Array.from({ length: 4 });

export default function CarsResultsLoading() {
  return (
    <>
      <AppHeader />
      <main
        className="flex-1 bg-slate-50 pb-8 pt-6 sm:pt-8 lg:pt-8"
        role="status"
        aria-live="polite"
        aria-label="Loading car rental results"
      >
        <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
          <section className="page-shell py-3" aria-hidden="true">
            <div className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-[0_16px_40px_-30px_rgba(30,27,75,0.42)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="h-3 w-36 animate-pulse rounded-full bg-violet-100 motion-reduce:animate-none" />
                  <div className="h-8 w-72 max-w-full animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                </div>
                <div className="h-11 w-32 animate-pulse rounded-xl bg-indigo-100 motion-reduce:animate-none" />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {summarySkeletons.map((_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                    <div className="mt-2 h-4 w-24 animate-pulse rounded-full bg-slate-300 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="page-shell grid gap-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-hidden="true">
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
              <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
              <div className="mt-5 space-y-4">
                {filterSkeletons.map((_, index) => (
                  <div key={index} className="space-y-3 border-t border-indigo-100 pt-4 first:border-t-0 first:pt-0">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                    <div className="h-5 w-full animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
                    <div className="h-5 w-5/6 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-4" aria-hidden="true">
            {resultSkeletons.map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-[0_16px_40px_-30px_rgba(30,27,75,0.42)]"
              >
                <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="h-36 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                  <div className="space-y-4">
                    <div className="h-5 w-48 max-w-full animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                    <div className="h-4 w-full max-w-lg animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                      <div className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                      <div className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
