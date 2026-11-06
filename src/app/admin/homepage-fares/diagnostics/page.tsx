import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFareSubpageNavigation } from "@/components/admin/HomepageFareSubpageNavigation";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Fare Diagnostics" };

export default function AdminHomepageFareDiagnosticsPage() {
  return (
    <AdminPageShell title="Fare Diagnostics" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <h1 className="sr-only">Fare Diagnostics</h1>
        <HomepageFareSubpageNavigation active="diagnostics" />
        <HomepageFaresRefreshCard view="diagnostics" />
      </div>
    </AdminPageShell>
  );
}
