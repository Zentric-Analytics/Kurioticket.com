import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { requireAdminSession } from "@/lib/auth-guards";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export const metadata = { title: "Admin Search" };

export default async function AdminSearchPage() {
  const session = await requireAdminSession("/admin/search");
  const role = session.user.role === "SUPPORT" || session.user.role === "USER" ? session.user.role : "ADMIN";

  return (
    <AdminGlobalSearch
      role={role}
      showPreviewTesters={isStagingEnvironment()}
    />
  );
}
