import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { AccountDashboardFrame } from "@/components/dashboard/DashboardGrid";
import { authOptions } from "@/lib/auth";
import {
  type AccountPriceAlert,
  listUserPriceAlerts,
} from "@/services/priceTrackingService";

export const metadata = {
  title: "Price Alerts",
};

function formatAlertType(type: AccountPriceAlert["type"]) {
  return type === "FLIGHT" ? "Flight" : "Hotel";
}

function formatAlertRoute(alert: AccountPriceAlert) {
  if (alert.origin) {
    return `${alert.origin} → ${alert.destination}`;
  }

  return alert.destination;
}

function formatCurrencyAmount(amount: string | null, currency: string | null) {
  if (!amount || !currency) {
    return null;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function EmptyAlertsState() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-surface-muted/70 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-navy">No price alerts yet.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Save searches or routes to keep track of trips you care about.
        </p>
      </div>
      <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">Start with a flight</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Compare provider-backed flight options before saving trips or routes.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">Review stays</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Search hotels with current provider details before adding anything to your plans.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">Keep planning organized</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your account shows saved travel records without made-up activity or static prices.
          </p>
        </div>
      </div>
    </Card>
  );
}

function AlertCard({ alert }: { alert: AccountPriceAlert }) {
  const targetPrice = formatCurrencyAmount(alert.targetPrice, alert.currency);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-dark">{formatAlertType(alert.type)}</p>
          <h2 className="mt-2 text-xl font-bold text-navy">{formatAlertRoute(alert)}</h2>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {alert.status.toLowerCase()}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-navy">Target price</dt>
          <dd className="mt-1 text-muted">{targetPrice ?? "No target price saved"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Created</dt>
          <dd className="mt-1 text-muted">{formatDate(alert.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Updated</dt>
          <dd className="mt-1 text-muted">{formatDate(alert.updatedAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  let alerts: AccountPriceAlert[] = [];
  let loadError = false;

  if (session?.user?.id) {
    try {
      alerts = await listUserPriceAlerts(session.user.id);
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,#f8fbfc_0%,#ffffff_48%,#f8fafc_100%)] pb-10 pt-24 sm:pt-28 lg:pt-28">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Account tools</p>
              <h1 className="mt-2 text-3xl font-bold text-navy">Price alerts</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                View provider-backed alert records saved to your Kurioticket account.
              </p>
            </div>

            {loadError ? (
              <Card className="mt-5 p-5">
                <h2 className="font-bold text-navy">We could not load your alerts. Please try again.</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Your account details stay protected. Refresh the page or return to your dashboard.
                </p>
                <LinkButton href="/dashboard" variant="secondary" className="mt-4">Return to dashboard</LinkButton>
              </Card>
            ) : alerts.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyAlertsState />
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/flights/results">Search flights</LinkButton>
              <LinkButton href="/hotels" variant="secondary">Search hotels</LinkButton>
              <LinkButton href="/cars" variant="secondary">Search cars</LinkButton>
            </div>
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
