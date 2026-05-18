import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/searches", label: "Searches" },
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminPageShell({
  title,
  eyebrow = "Admin operations",
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-dark">{eyebrow}</p>
            <h1 className="mt-1 text-3xl font-bold text-navy">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-border bg-white px-3 py-2 text-sm font-bold text-navy hover:border-teal hover:text-teal-dark">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Card className="p-6 text-sm font-semibold text-muted">{message}</Card>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "bad" | "warn" | "neutral" }) {
  const classes = {
    good: "bg-teal/10 text-teal-dark",
    bad: "bg-red-50 text-danger",
    warn: "bg-amber/10 text-amber",
    neutral: "bg-slate-100 text-muted",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
}
