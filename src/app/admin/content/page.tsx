import { AdminLinkButton, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";

import { getContentInventory } from "./inventory";

export const metadata = { title: "Admin Content Inventory" };

export default function AdminContentPage() {
  const contentAreas = getContentInventory();

  return (
    <AdminPageShell
      eyebrow=""
      title="Content Inventory"
      description="Review selected code-backed public content sources used across Kurioticket."
    >
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contentAreas.map((area) => (
          <AdminSectionCard key={area.id} className="flex h-full flex-col p-5">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
              <h2 className="font-semibold text-slate-950">{area.title}</h2>
              <span className="shrink-0">
                <AdminStatusBadge tone={area.publicState === "Public" ? "info" : "neutral"}>
                  {area.publicState} · {area.sourceType}
                </AdminStatusBadge>
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-950">
              {area.primaryCount} <span className="text-sm font-semibold text-slate-600">{area.unit}</span>
            </p>
            {area.supportingMetrics.length ? (
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                {area.supportingMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-baseline justify-between gap-3">
                    <dt>{metric.label}</dt>
                    <dd className="font-semibold text-slate-950">{metric.value} {metric.unit}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{area.note}</p>
            <div className="mt-auto pt-4">
              <AdminLinkButton href={area.href} size="sm">
                View inventory
              </AdminLinkButton>
            </div>
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageShell>
  );
}
