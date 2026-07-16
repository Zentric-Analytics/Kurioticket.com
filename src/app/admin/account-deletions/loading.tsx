import { AdminDataTableSkeleton, AdminPageShell } from "@/components/admin/AdminPageShell";

export default function Loading() {
  return (
    <AdminPageShell title="Loading" description="Preparing the latest admin data.">
      <AdminDataTableSkeleton
        caption="Loading admin account-deletions table"
        columns={["Primary", "Status", "Details", "Updated", "Action"]}
      />
    </AdminPageShell>
  );
}
