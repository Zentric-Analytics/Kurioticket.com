import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Operations" };

export default function AdminHomepageFareOperationsPage() {
  return (
    <AdminPageShell title="Homepage Fare Operations" hideHeader>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E1EC] pb-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-[#020617]">
          Homepage Fare Operations
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/content/homepage"
            className="inline-flex h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
          >
            Homepage content
          </Link>
          <Link
            href="/admin/providers?product=flights"
            className="inline-flex h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] transition hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
          >
            Flight providers
          </Link>
        </div>
      </div>
      <HomepageFaresRefreshCard />
    </AdminPageShell>
  );
}
