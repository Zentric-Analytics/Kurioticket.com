import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Diagnostics" };

export default function AdminHomepageFareDiagnosticsPage() {
  return (
    <AdminPageShell title="Fare Diagnostics" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D8E1EC] pb-4 pt-1">
          <div>
            <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">Fare Diagnostics</h1>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Investigate internal fallback coverage, refresh execution, public fare eligibility and scheduler readiness.</p>
          </div>
          <nav aria-label="Homepage fares pages" className="flex flex-wrap items-center gap-2">
            <Link href="/admin/homepage-fares" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
              Back to Homepage Fare Operations
            </Link>
            <Link href="/admin/homepage-fares/routes" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
              Route inspector
            </Link>
          </nav>
        </header>
        <HomepageFaresRefreshCard view="diagnostics" />
      </div>
    </AdminPageShell>
  );
}
