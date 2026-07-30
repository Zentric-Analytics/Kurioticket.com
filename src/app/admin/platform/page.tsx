import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminHubDestinations, type AdminRole } from "@/lib/adminNavigation";

export const metadata = { title: "Admin Platform" };

export default async function AdminPlatformPage() {
  const session = await requireAdminSession("/admin/platform");
  const role: AdminRole = session.user.role === "SUPPORT" || session.user.role === "USER" ? session.user.role : "ADMIN";
  const destinations = getAdminHubDestinations("platform", role);

  return (
    <AdminPageShell title="Platform" description="Manage provider readiness, content inventory and system controls." eyebrow="Admin navigation">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {destinations.map((destination) => {
          const Icon = destination.icon;

          return (
            <Link
              key={destination.href}
              href={destination.href}
              className="focus-ring flex items-center gap-4 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50 sm:px-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-slate-950">{destination.label}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{destination.description}</span>
              </span>
              <ArrowRight className="shrink-0 text-slate-400" size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </AdminPageShell>
  );
}
