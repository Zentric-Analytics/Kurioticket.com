import { AdminOnlineUsersDirectory } from "@/components/admin/AdminOnlineUsersDirectory";
import { requireAdminSession } from "@/lib/auth-guards";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";

export const metadata = { title: "Admin Online Users" };
export const dynamic = "force-dynamic";

export default async function AdminOnlineUsersPage() {
  await requireAdminSession("/admin/users/online");
  const initial = await readAdminOnlineUsers(getPublicEnvironment(), new Date());
  return <AdminOnlineUsersDirectory initial={initial} />;
}
