import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";

export const metadata = { title: "Admin Homepage Operations" };

export default function AdminHomepageOperationsPage() {
  return (
    <AdminPageShell
      title="Homepage Operations"
      description="Monitor homepage fare readiness, refresh activity, market coverage and operational health."
    >
      <HomepageFaresRefreshCard />
    </AdminPageShell>
  );
}
