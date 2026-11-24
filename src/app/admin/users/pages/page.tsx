import { requireAdminSession } from "@/lib/auth-guards";
import { AdminHistoryDirectory } from "@/components/admin/AdminHistoryDirectory";

export const metadata = { title: "Admin Pages Visited" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPagesVisitedDirectoryPage({ searchParams }: Props) {
  await requireAdminSession("/admin/users/pages");
  return <AdminHistoryDirectory section="pages" raw={await searchParams}/>;
}
