import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LocalizedLoadingLabel } from "@/components/layout/LocalizedLoadingLabel";

const savedCardSkeletons = Array.from({ length: 6 });

export default function SavedLoading() {
  return (
    <>
      <AppHeader />
      <main
        className="flex-1 bg-[radial-gradient(circle_at_top,rgba(92,182,178,0.16),rgba(255,255,255,1)_42%)] pb-14 pt-6 md:pb-20 md:pt-10"
        role="status"
        aria-live="polite"
      >
        <LocalizedLoadingLabel labelKey="loadingSavedTripsAndRecentSearches" className="sr-only" />
        <section className="page-shell space-y-8" aria-hidden="true">
          <div className="rounded-3xl border border-[#004BB8]/10 bg-white/90 p-6 shadow-[0_18px_55px_-34px_rgba(2,28,43,0.28)] md:p-8">
            <div className="h-4 w-36 animate-pulse rounded-full bg-[#5CB6B2]/20 motion-reduce:animate-none" />
            <div className="mt-4 h-9 w-80 max-w-full animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />
            <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedCardSkeletons.map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-[#004BB8]/10 bg-white p-4 shadow-[0_18px_55px_-34px_rgba(2,28,43,0.24)]"
              >
                <div className="h-36 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-[#5CB6B2]/20 motion-reduce:animate-none" />
                  <div className="h-6 w-56 max-w-full animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
