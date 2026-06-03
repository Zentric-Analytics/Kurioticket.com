import { AdminPageShell, StatusPill } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getAdminEmails } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const flags = await getPrisma().featureFlag.findMany({ orderBy: { key: "asc" }, take: 50 });
  return (
    <AdminPageShell title="Settings" description="Read-only operational settings for platform systems.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-bold text-navy">Admin email configuration</h2><p className="mt-2 text-sm text-muted">ADMIN_EMAILS configured: <b>{getAdminEmails().length > 0 ? "Yes" : "No"}</b></p><p className="mt-1 text-sm text-muted">Configured admin count: <b>{getAdminEmails().length}</b></p></Card>
        <Card className="p-5"><h2 className="font-bold text-navy">System status</h2><div className="mt-3 flex flex-wrap gap-2"><StatusPill tone="good">Active: flight metasearch</StatusPill><StatusPill tone="good">Active: auth</StatusPill><StatusPill tone="good">Active: Duffel foundation</StatusPill><StatusPill>Paused: Resend alerts</StatusPill><StatusPill>Paused: Travelpayouts</StatusPill></div></Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="font-bold text-navy">Feature flags</h2>{flags.length === 0 ? <p className="mt-2 text-sm text-muted">No feature flags configured yet.</p> : <div className="mt-3 grid gap-2">{flags.map((flag) => <div key={flag.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm"><span className="font-bold text-navy">{flag.key}</span><StatusPill tone={flag.enabled ? "good" : "neutral"}>{flag.enabled ? "Enabled" : "Disabled"} / {flag.scope}</StatusPill></div>)}</div>}</Card>
    </AdminPageShell>
  );
}
