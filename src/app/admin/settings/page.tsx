import Link from "next/link";
import { getServerSession } from "next-auth";

import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { FeatureControlsPanel } from "@/components/admin/FeatureControlsPanel";
import { authOptions } from "@/lib/auth";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { listFeatureControls } from "@/lib/feature-controls/service";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const [featureControls, session] = await Promise.all([
    listFeatureControls(),
    getServerSession(authOptions),
  ]);
  const currentEmail = session?.user?.email?.trim().toLowerCase() || "";
  const canControlProduction = getFeatureControlProductionAdmins().includes(currentEmail);

  return (
    <AdminPageShell
      title="Settings"
      description="Authoritative platform controls and configuration ownership. Deployment secrets and runtime credentials remain outside the admin UI."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/system" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            System status
          </Link>
          <Link href="/admin/logs" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Audit logs
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-black text-slate-950">Feature Controls — {featureControls.environment}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                These are the authoritative persisted availability controls for travel search and automation. They are operational kill switches, not deployment-secret editors.
              </p>
            </div>
            <AdminStatusBadge tone={featureControls.dataAvailable ? "good" : "warn"}>
              {featureControls.dataAvailable ? "Authoritative store available" : "Read-only fallback"}
            </AdminStatusBadge>
          </div>
          <div className="mt-5">
            <FeatureControlsPanel
              initialControls={featureControls.controls}
              environment={featureControls.environment}
              canControlProduction={canControlProduction}
              operationsAvailable={featureControls.dataAvailable}
            />
          </div>
        </AdminSectionCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <OwnershipCard
            title="Runtime & credentials"
            mode="Deployment owned"
            body="Database URLs, API keys, session secrets, provider credentials and server environment variables are never editable here. System shows only safe readiness state."
            href="/admin/system"
            linkLabel="View system status"
          />
          <OwnershipCard
            title="Admin access"
            mode="Deployment owned"
            body="ADMIN_EMAILS and production feature-controller permissions stay in server configuration. Settings never exposes or edits those values."
            href="/admin/system"
            linkLabel="View admin configuration status"
          />
          <OwnershipCard
            title="Homepage fares"
            mode="Operational workspace"
            body="Provider-backed homepage fare refresh and readiness are operations, not settings. The existing audited refresh workflow now has its own workspace."
            href="/admin/homepage-fares"
            linkLabel="Open homepage fare operations"
          />
        </div>

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Change safeguards</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Feature-control changes use the existing protected API. Production changes require an explicitly authorized controller, a written reason and recent trusted reauthentication. Successful mutations are written to the admin audit log in the same database transaction.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="good">Persisted controls</AdminStatusBadge>
            <AdminStatusBadge tone="good">Audited mutations</AdminStatusBadge>
            <AdminStatusBadge>Production permission required</AdminStatusBadge>
            <AdminStatusBadge>Recent reauthentication required</AdminStatusBadge>
            <AdminStatusBadge>No secrets exposed</AdminStatusBadge>
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}

function OwnershipCard({
  title,
  mode,
  body,
  href,
  linkLabel,
}: {
  title: string;
  mode: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <AdminSectionCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-black text-slate-950">{title}</h2>
        <AdminStatusBadge tone="info">{mode}</AdminStatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <Link href={href} className="mt-4 inline-flex text-sm font-black text-blue-700 hover:underline">
        {linkLabel}
      </Link>
    </AdminSectionCard>
  );
}
