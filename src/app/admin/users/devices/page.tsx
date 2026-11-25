import { requireAdminSession } from "@/lib/auth-guards";
import { AdminHistoryDirectory } from "@/components/admin/AdminHistoryDirectory";

export const metadata = { title: "Admin Device & Access" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDeviceAccessDirectoryPage({ searchParams }: Props) {
  await requireAdminSession("/admin/users/devices");
  return <AdminHistoryDirectory section="devices" raw={await searchParams}/>;
}
