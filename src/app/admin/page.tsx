import Link from "next/link";
import {
  Activity,
  Gauge,
  LifeBuoy,
  ListChecks,
  Plane,
  ServerCog,
  Settings,
  Users,
} from "lucide-react";

import {
  AdminPageShell,
  MetricCard,
  StatusPill,
} from "@/components/admin/AdminPageShell";

import { Card } from "@/components/ui/Card";
import { requireAdminSession } from "@/lib/auth-guards";
import {
  getDuffelAdminHealth,
  getSafeSystemStatus,
} from "@/lib/admin-data";
import { getOptionalPrisma } from "@/lib/prisma";

const adminModules = [
  {
    href: "/admin/users",
    title: "Users",
    icon: Users,
    body: "Search users, review status, suspend/reactivate accounts, and inspect roles.",
  },
  {
    href: "/admin/providers",
    title: "Providers",
    icon: Activity,
    body: "Monitor Duffel and track paused/future provider integrations.",
  },
  {
    href: "/admin/searches",
    title: "Searches",
    icon: Plane,
    body: "Review recent flight metasearch activity and result counts.",
  },
  {
    href: "/admin/redirects",
    title: "Redirects",
    icon: Gauge,
    body: "Inspect future external booking handoff logs.",
  },
  {
    href: "/admin/support",
    title: "Support",
    icon: LifeBuoy,
    body: "Review support tickets and operational queues.",
  },
  {
    href: "/admin/logs",
    title: "Logs",
    icon: ListChecks,
    body: "Audit sensitive admin actions and account changes.",
  },
  {
    href: "/admin/system",
    title: "System",
    icon: ServerCog,
    body: "Check safe environment, auth, database, and runtime status.",
  },
  {
    href: "/admin/settings",
    title: "Settings",
    icon: Settings,
    body: "Read-only operational settings and active/paused systems.",
  },
];

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  await requireAdminSession("/admin");

  const [metrics, system, duffel] = await Promise.all([
    getAdminMetrics(),
    getSafeSystemStatus(),
    getDuffelAdminHealth(),
  ]);

  return (
    <AdminPageShell
      title="Operations Dashboard"
      description="Manage Curioticket flight metasearch operations, users, provider health, redirects, support, and audit logs."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total users"
          value={metrics.totalUsers}
        />

        <MetricCard
          label="Active users"
          value={metrics.activeUsers}
        />

        <MetricCard
          label="Suspended users"
          value={metrics.suspendedUsers}
        />

        <MetricCard
          label="Admin users"
          value={metrics.adminUsers}
        />

        <MetricCard
          label="Duffel health"
          value={
            duffel.connected
              ? "Healthy"
              : duffel.configured
                ? "Attention"
                : "Not configured"
          }
        />

        <MetricCard
          label="Database"
          value={
            system.databaseConnected
              ? "Connected"
              : system.databaseConfigured
                ? "Configured"
                : "Missing"
          }
        />

        <MetricCard
          label="Recent searches"
          value={metrics.recentSearches}
          hint="Last 7 days"
        />

        <MetricCard
          label="Recent admin actions"
          value={metrics.recentAdminActions}
          hint="Last 7 days"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="block rounded-xl focus-ring"
          >
            <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:border-teal hover:shadow-lg">
              <module.icon
                className="text-teal"
                size={22}
              />

              <h2 className="mt-3 font-bold text-navy">
                {module.title}
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted">
                {module.body}
              </p>

              <span className="mt-4 inline-block text-sm font-bold text-teal-dark">
                Open {module.title} →
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-4">
        <h2 className="font-bold text-navy">
          Active vs paused systems
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="good">
            Active: NextAuth
          </StatusPill>

          <StatusPill tone="good">
            Active: PostgreSQL
          </StatusPill>

          <StatusPill tone="good">
            Active: Duffel foundation
          </StatusPill>

          <StatusPill>
            Paused: Travelpayouts
          </StatusPill>

          <StatusPill>
            Paused: Stripe premium
          </StatusPill>

          <StatusPill>
            Paused: Resend alerts
          </StatusPill>

          <StatusPill>
            Paused: OpenAI premium features
          </StatusPill>
        </div>
      </Card>
    </AdminPageShell>
  );
}

async function getAdminMetrics() {
  const db = getOptionalPrisma();

  if (!db) {
    return {
      totalUsers: "—",
      activeUsers: "—",
      suspendedUsers: "—",
      adminUsers: "—",
      recentSearches: "—",
      recentAdminActions: "—",
    };
  }

  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    recentSearches,
    recentAdminActions,
  ] = await Promise.all([
    db.user.count(),

    db.user.count({
      where: {
        status: "ACTIVE",
      },
    }),

    db.user.count({
      where: {
        status: "SUSPENDED",
      },
    }),

    db.user.count({
      where: {
        role: "ADMIN",
        status: "ACTIVE",
      },
    }),

    db.searchHistory.count({
      where: {
        type: "FLIGHT",
        createdAt: {
          gte: since,
        },
      },
    }),

    db.adminAuditLog.count({
      where: {
        createdAt: {
          gte: since,
        },
      },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    recentSearches,
    recentAdminActions,
  };
}