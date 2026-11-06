import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Operations" };

export default function AdminHomepageFareOperationsPage() {
  return (
    <AdminPageShell title="Homepage Fare Operations" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <header className="border-b border-[#D8E1EC] pb-4 pt-1">
          <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">
            Homepage Fare Operations
          </h1>
        </header>
        <HomepageFaresRefreshCard />
      </div>
    </AdminPageShell>
  );
}
