import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Operations" };

export default function AdminHomepageFareOperationsPage() {
  return (
    <AdminPageShell
      title="Homepage Fare Operations"
      description="Monitor and refresh provider-backed homepage fare coverage, route health and market readiness without changing pricing logic."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Settings
          </Link>
          <Link href="/admin/flights" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Flight operations
          </Link>
        </div>
      }
    >
      <HomepageFaresRefreshCard />
    </AdminPageShell>
  );
}
