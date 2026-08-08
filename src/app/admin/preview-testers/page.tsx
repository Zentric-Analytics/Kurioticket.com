import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PreviewTesterRegistry } from "@/components/admin/PreviewTesterRegistry";
import { requireAdminSession } from "@/lib/auth-guards";
import { getPrisma } from "@/lib/prisma";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { normalizeTeamAccessRoles } from "@/lib/teamAccessRoles";

export const metadata = { title: "Team Access" };

export default async function PreviewTestersPage() {
  if (!isStagingEnvironment()) notFound();
  await requireAdminSession("/admin/preview-testers");
  const actorSelect = { select: { email: true, name: true } } as const;
  const testers = await getPrisma().previewTester.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { approvedByAdmin: actorSelect, suspendedByAdmin: actorSelect, revokedByAdmin: actorSelect } });
  const members = testers.map((tester) => ({ ...tester, roles: normalizeTeamAccessRoles(tester.roles) }));
  return <AdminPageShell title="Team Access" description="Manage Kurioticket Preview team members, roles, Google sign-in and developer build notifications."><PreviewTesterRegistry testers={members} /></AdminPageShell>;
}
