import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Operations" };

export default function AdminHomepageFareOperationsPage() {
  return (
    <AdminPageShell
      title="Homepage Fare Operations"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/content/homepage" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Homepage content
          </Link>
          <Link href="/admin/providers?product=flights" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Flight providers
          </Link>
        </div>
      }
    >
      <HomepageFaresRefreshCard />
    </AdminPageShell>
  );
}
