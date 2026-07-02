import { BrandedLoading } from "@/components/layout/BrandedLoading";

export default function PageLoading() {
  return (
    <main className="bg-gradient-to-b from-[#F2F7FA]/70 via-white to-white py-8">
      <div className="page-shell space-y-6">
        <BrandedLoading
          variant="compact"
          className="rounded-3xl border border-[#004BB8]/10 px-5 shadow-[0_18px_55px_-38px_rgba(2,28,43,0.32)] sm:px-6"
          title="Loading Kurioticket..."
          description="Preparing your experience..."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#004BB8]/10 bg-white shadow-sm motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </main>
  );
}
