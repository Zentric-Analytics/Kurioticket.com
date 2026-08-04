import { AdminShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession("/admin");

  return (
    <AdminShell
      adminEmail={session.user.email}
      adminName={session.user.name}
      adminRole={session.user.role}
      showPreviewTesters={isStagingEnvironment()}
    >
      {children}
    </AdminShell>
  );
}
