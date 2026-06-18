"use client";

import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { AccountBackLink } from "@/components/dashboard/DashboardGrid";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import type { AccountPriceAlert } from "@/services/priceTrackingService";

function formatAlertType(
  type: AccountPriceAlert["type"],
  t: (key: string) => string,
) {
  return type === "FLIGHT"
    ? t("accountDashboard.priceAlerts.alertType.flight")
    : t("accountDashboard.priceAlerts.alertType.hotel");
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

function EmptyAlertsState({ t }: { t: (key: string) => string }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-surface-muted/70 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-navy">
          {t("accountDashboard.priceAlerts.empty.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t("accountDashboard.priceAlerts.empty.body")}
        </p>
      </div>
      <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.guidance.flight.title")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("accountDashboard.priceAlerts.guidance.flight.body")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.guidance.stays.title")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("accountDashboard.priceAlerts.guidance.stays.body")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <h3 className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.guidance.organized.title")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("accountDashboard.priceAlerts.guidance.organized.body")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function AlertCard({
  alert,
  t,
}: {
  alert: AccountPriceAlert;
  t: (key: string) => string;
}) {
  const targetPrice = formatCurrencyAmount(alert.targetPrice, alert.currency);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-dark">
            {formatAlertType(alert.type, t)}
          </p>
          <h2 className="mt-2 text-xl font-bold text-navy">
            {formatAlertRoute(alert)}
          </h2>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {alert.status.toLowerCase()}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.alert.targetPrice")}
          </dt>
          <dd className="mt-1 text-muted">
            {targetPrice ??
              t("accountDashboard.priceAlerts.alert.noTargetPrice")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.alert.created")}
          </dt>
          <dd className="mt-1 text-muted">{formatDate(alert.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">
            {t("accountDashboard.priceAlerts.alert.updated")}
          </dt>
          <dd className="mt-1 text-muted">{formatDate(alert.updatedAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function PriceAlertsContent({
  alerts,
  loadError,
}: {
  alerts: AccountPriceAlert[];
  loadError: boolean;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <section className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]" aria-labelledby="price-alerts-title">
      <AccountBackLink className="px-1 sm:px-2" />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">
          {t("accountDashboard.priceAlerts.eyebrow")}
        </p>
        <h1 id="price-alerts-title" className="mt-2 text-3xl font-bold text-navy">
          {t("accountDashboard.priceAlerts.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t("accountDashboard.priceAlerts.description")}
        </p>
      </div>

      {loadError ? (
        <Card className="p-5">
          <h2 className="font-bold text-navy">
            {t("accountDashboard.priceAlerts.error.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("accountDashboard.priceAlerts.error.body")}
          </p>
          <LinkButton href="/dashboard" variant="secondary" className="mt-4">
            {t("accountDashboard.priceAlerts.error.cta")}
          </LinkButton>
        </Card>
      ) : alerts.length > 0 ? (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} t={t} />
          ))}
        </div>
      ) : (
        <EmptyAlertsState t={t} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/flights">
          {t("accountDashboard.priceAlerts.cta.flights")}
        </LinkButton>
        <LinkButton href="/hotels" variant="secondary">
          {t("accountDashboard.priceAlerts.cta.hotels")}
        </LinkButton>
        <LinkButton href="/cars" variant="secondary">
          {t("accountDashboard.priceAlerts.cta.cars")}
        </LinkButton>
      </div>
    </section>
  );
}
