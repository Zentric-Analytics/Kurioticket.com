import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { requireAdminSession } from "@/lib/auth-guards";
import { AdminHistoryDirectory } from "@/components/admin/AdminHistoryDirectory";

export const metadata = { title: "Admin Pages Visited" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPagesVisitedDirectoryPage({ searchParams }: Props) {
  const session = await requireAdminSession("/admin/users/pages");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  return <AdminHistoryDirectory timeZone={timeZone} section="pages" raw={await searchParams}/>;
}
