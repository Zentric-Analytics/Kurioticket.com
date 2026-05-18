import { AdminPageShell, StatusPill } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getSafeSystemStatus } from "@/lib/admin-data";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
  const rows = [
    ["App environment", system.appEnvironment],
    ["Node environment", system.nodeEnv],
    ["Render/runtime", system.renderService],
    ["App URL configured", system.appUrlConfigured ? "Yes" : "No"],
    ["Database configured", system.databaseConfigured ? "Yes" : "No"],
    ["Database connected", system.databaseConnected ? "Yes" : "No"],
    ["Auth secret configured", system.authSecretConfigured ? "Yes" : "No"],
    ["Google auth configured", system.googleAuthConfigured ? "Yes" : "No"],
    ["Duffel configured", system.duffelConfigured ? "Yes" : "No"],
  ];
  return (
    <AdminPageShell title="System" description="Safe operational status only. Secret values, database URLs, and API keys are never displayed.">
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3"><span className="text-sm text-muted">{label}</span><b className="text-sm text-navy">{value}</b></div>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><StatusPill tone="good">No secrets shown</StatusPill><StatusPill>Database URL hidden</StatusPill><StatusPill>API keys hidden</StatusPill></div>
      </Card>
    </AdminPageShell>
  );
}
