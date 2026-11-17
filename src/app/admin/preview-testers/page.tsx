import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PreviewTesterRegistry } from "@/components/admin/PreviewTesterRegistry";
import { AdminSettingsNavigation } from "@/components/admin/AdminSettingsNavigation";
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
  return (
    <AdminPageShell title="Team Access" hideHeader>
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 bg-white text-[#020617] md:grid-cols-[232px_minmax(0,1fr)] md:gap-7">
        <AdminSettingsNavigation showTeamAccess />
        <section aria-label="Team Access" className="w-full min-w-0 pb-4 md:pl-1">
          <h1 className="mb-2 text-[17px] font-semibold text-[#020617]">Team Access</h1>
          <p className="mb-5 text-[13px] text-[#64748B]">Manage Preview team members, roles, Google sign-in and developer build notifications.</p>
          <PreviewTesterRegistry testers={members} />
        </section>
      </div>
    </AdminPageShell>
  );
}
