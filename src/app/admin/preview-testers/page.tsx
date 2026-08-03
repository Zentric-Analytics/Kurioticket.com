import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PreviewTesterRegistry } from "@/components/admin/PreviewTesterRegistry";
import { requireAdminSession } from "@/lib/auth-guards";
import { getPrisma } from "@/lib/prisma";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export const metadata = { title: "Preview Testers" };

export default async function PreviewTestersPage() {
  if (!isStagingEnvironment()) notFound();
  await requireAdminSession("/admin/preview-testers");
  const testers = await getPrisma().previewTester.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { approvedByAdmin: { select: { email: true, name: true } } } });
  return <AdminPageShell title="Preview Testers" description="Manage external access to the staging Preview application."><PreviewTesterRegistry testers={testers} /></AdminPageShell>;
}
