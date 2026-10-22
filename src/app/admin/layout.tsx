import { AdminHorizontalShell } from "@/components/admin/AdminHorizontalShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession("/admin");

  return (
    <AdminHorizontalShell
      adminEmail={session.user.email}
      adminName={session.user.name}
      adminRole={session.user.role}
      showPreviewTesters={isStagingEnvironment()}
    >
      {children}
    </AdminHorizontalShell>
  );
}
