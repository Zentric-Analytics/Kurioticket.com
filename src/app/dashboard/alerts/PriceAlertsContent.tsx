"use client";

import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import Link from "next/link";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LineChart, Mail, Search, Settings2 } from "lucide-react";

const tabs = [
  { id: "active", labelKey: "accountDashboard.priceAlerts.tabs.active" },
  { id: "triggered", labelKey: "accountDashboard.priceAlerts.tabs.triggered" },
  { id: "all", labelKey: "accountDashboard.priceAlerts.tabs.all" },
] as const;

const sortOptions = [
  { id: "newest", labelKey: "accountDashboard.priceAlerts.sort.newest" },
  { id: "oldest", labelKey: "accountDashboard.priceAlerts.sort.oldest" },
  { id: "routeAz", labelKey: "accountDashboard.priceAlerts.sort.routeAz" },
] as const;

const infoItems = [
  { titleKey: "accountDashboard.priceAlerts.features.monitoring.title", textKey: "accountDashboard.priceAlerts.features.monitoring.body", icon: Bell },
  { titleKey: "accountDashboard.priceAlerts.features.email.title", textKey: "accountDashboard.priceAlerts.features.email.body", icon: Mail },
  { titleKey: "accountDashboard.priceAlerts.features.trends.title", textKey: "accountDashboard.priceAlerts.features.trends.body", icon: LineChart },
  { titleKey: "accountDashboard.priceAlerts.features.management.title", textKey: "accountDashboard.priceAlerts.features.management.body", icon: Settings2 },
] as const;

type PriceAlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
type AccountPriceAlert = {
  id: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string;
  targetPrice: string | null;
  currency: string | null;
  status: PriceAlertStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenPrice: string | null;
  lastCheckedAt: string | null;
  query: Record<string, unknown>;
};

type LoadState = "loading" | "success" | "error" | "unauthorized";

function EmptyStateIllustration() {
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48" aria-hidden="true">
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#5CB6B2]/20 via-[#004BB8]/8 to-slate-100" />
      <div className="absolute bottom-9 h-3 w-28 rounded-full bg-indigo-200/50 blur-[1px]" />
      <svg className="relative h-28 w-28 drop-shadow-sm" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 102c8.3 0 15-6.7 15-15H45c0 8.3 6.7 15 15 15Z" fill="#5CB6B2" opacity="0.88" />
        <path d="M26 84h68c3.6 0 5.5-4.3 3.1-7C91.4 70.7 88 62.6 88 54v-8c0-12.7-8.1-23.5-19.5-27.5A8.8 8.8 0 0 0 60 8a8.8 8.8 0 0 0-8.5 10.5C40.1 22.5 32 33.3 32 46v8c0 8.6-3.4 16.7-9.1 23-2.4 2.7-.5 7 3.1 7Z" fill="url(#bellGradient)" />
        <path d="M33 83h54" stroke="#021C2B" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
        <defs><linearGradient id="bellGradient" x1="31" x2="92" y1="18" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#5CB6B2" /><stop offset="1" stopColor="#004BB8" /></linearGradient></defs>
      </svg>
      <span className="absolute start-7 top-7 h-8 w-1.5 -rotate-45 rounded-full bg-[#5CB6B2]" />
      <span className="absolute start-14 top-4 h-8 w-1.5 -rotate-12 rounded-full bg-[#5CB6B2]" />
    </div>
  );
}

const text = (t: Record<string, string>, key: string, fallback: string) => t[key] ?? fallback;
const dateValue = (alert: AccountPriceAlert, key: string) => typeof alert.query?.[key] === "string" ? alert.query[key] as string : null;
const routeLabel = (alert: AccountPriceAlert) => [alert.origin, alert.destination].filter(Boolean).join(" → ") || alert.destination;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not available";
const formatMoney = (value: string | null, currency: string | null) => value ? new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(Number(value)) : "Not available";

function AlertCard({ alert, t }: { alert: AccountPriceAlert; t: Record<string, string> }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#004BB8]">{text(t, `accountDashboard.priceAlerts.alertType.${alert.type.toLowerCase()}`, alert.type)}</p>
          <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-slate-950">{routeLabel(alert)}</h2>
          <p className="mt-1 text-sm text-slate-600">{alert.origin || "—"} → {alert.destination}</p>
        </div>
        <span className="rounded-full bg-[#004BB8]/10 px-3 py-1 text-xs font-bold text-[#004BB8]">{alert.status}</span>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold text-slate-500">Departure date</dt><dd className="mt-1 text-slate-950">{formatDate(dateValue(alert, "departureDate"))}</dd></div>
        {dateValue(alert, "returnDate") && <div><dt className="font-semibold text-slate-500">Return date</dt><dd className="mt-1 text-slate-950">{formatDate(dateValue(alert, "returnDate"))}</dd></div>}
        <div><dt className="font-semibold text-slate-500">{text(t, "accountDashboard.priceAlerts.alert.targetPrice", "Target price")}</dt><dd className="mt-1 break-words font-bold text-slate-950">{formatMoney(alert.targetPrice, alert.currency)}</dd></div>
        <div><dt className="font-semibold text-slate-500">Current price</dt><dd className="mt-1 break-words font-bold text-slate-950">{formatMoney(alert.lastSeenPrice, alert.currency)}</dd></div>
        <div><dt className="font-semibold text-slate-500">{text(t, "accountDashboard.priceAlerts.alert.created", "Created")}</dt><dd className="mt-1 text-slate-950">{formatDate(alert.createdAt)}</dd></div>
        <div><dt className="font-semibold text-slate-500">Last checked</dt><dd className="mt-1 text-slate-950">{formatDate(alert.lastCheckedAt)}</dd></div>
      </dl>
    </article>
  );
}

type PriceAlertsContentProps = { showAccountLink?: boolean };

export function PriceAlertsContent({ showAccountLink = false }: PriceAlertsContentProps) {
  const { t } = useLocale();
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]["id"]>(tabs[0].id);
  const [selectedSort, setSelectedSort] = useState<(typeof sortOptions)[number]["id"]>(sortOptions[0].id);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [alerts, setAlerts] = useState<AccountPriceAlert[]>([]);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  async function loadAlerts(signal?: AbortSignal, showLoading = true) {
    if (showLoading) setLoadState("loading");
    try {
      const response = await fetch("/api/price-alerts", { signal, cache: "no-store" });
      if (response.status === 401) { setLoadState("unauthorized"); return; }
      if (!response.ok) throw new Error("load failed");
      const body = await response.json() as { alerts?: AccountPriceAlert[] };
      setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
      setLoadState("success");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setLoadState("error");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/price-alerts", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { setLoadState("unauthorized"); return; }
        if (!response.ok) throw new Error("load failed");
        const body = await response.json() as { alerts?: AccountPriceAlert[] };
        setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
        setLoadState("success");
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setLoadState("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!sortDropdownRef.current?.contains(event.target as Node)) setIsSortOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const counts = useMemo(() => ({ active: alerts.filter((a) => a.status === "ACTIVE").length, triggered: alerts.filter((a) => a.status === "TRIGGERED").length, all: alerts.length }), [alerts]);
  const visibleAlerts = useMemo(() => {
    const filtered = alerts.filter((alert) => selectedTab === "all" || alert.status === selectedTab.toUpperCase());
    return [...filtered].sort((a, b) => {
      if (selectedSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (selectedSort === "routeAz") return routeLabel(a).localeCompare(routeLabel(b));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, selectedSort, selectedTab]);

  return (
    <main className="flex-1 bg-white pb-10 pt-0">
      <AccountDetailShell showAccountLink={showAccountLink}>
        <div className="mx-auto min-w-0 max-w-6xl px-4 pt-3 pb-8 sm:px-6 sm:pt-6 lg:px-8">
          <header className="px-1 pb-5 text-start sm:px-2 sm:pb-6"><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{t["accountDashboard.priceAlerts.title"]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{t["accountDashboard.priceAlerts.description"]}</p></header>
          <div ref={sortDropdownRef} className="relative flex items-center gap-2 border-b border-slate-200 pb-4 sm:gap-3 sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 pb-1 sm:gap-3 sm:overflow-visible sm:pb-0" aria-label={t["accountDashboard.priceAlerts.filtersAriaLabel"]}>
              <div className="flex min-w-0 shrink-0 gap-1 sm:gap-2">{tabs.map((tab) => { const isSelected = selectedTab === tab.id; return <button key={tab.id} type="button" className={`focus-ring inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold transition sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm ${isSelected ? "bg-[#004BB8]/10 text-[#004BB8]" : "text-slate-600 hover:bg-[#004BB8]/5 hover:text-[#004BB8]"}`} aria-pressed={isSelected} onClick={() => setSelectedTab(tab.id)}>{isSelected && <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />}{`${text(t, tab.labelKey, tab.id)} (${counts[tab.id]})`}</button>; })}</div>
              <button type="button" className="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-[#004BB8]/20 hover:text-[#004BB8] sm:min-h-12 sm:gap-3 sm:rounded-xl sm:px-4 sm:text-sm" aria-expanded={isSortOpen} aria-haspopup="listbox" onClick={() => setIsSortOpen((current) => !current)}><span className="sm:hidden">{t[sortOptions.find((option) => option.id === selectedSort)?.labelKey ?? sortOptions[0].labelKey]} <span aria-hidden="true">▼</span></span><span className="hidden sm:inline">{t["accountDashboard.priceAlerts.sort.label"]}: {t[sortOptions.find((option) => option.id === selectedSort)?.labelKey ?? sortOptions[0].labelKey]}</span><ChevronDown className={`hidden h-4 w-4 transition sm:block ${isSortOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button>
            </div>
            {isSortOpen && <div className="absolute end-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox" aria-label={t["accountDashboard.priceAlerts.sort.ariaLabel"]}>{sortOptions.map((option) => <button key={option.id} type="button" className={`block w-full px-4 py-3 text-start text-sm font-semibold transition hover:bg-[#004BB8]/5 hover:text-[#004BB8] ${selectedSort === option.id ? "bg-[#004BB8]/10 text-[#004BB8]" : "text-slate-700"}`} role="option" aria-selected={selectedSort === option.id} onClick={() => { setSelectedSort(option.id); setIsSortOpen(false); }}>{t[option.labelKey]}</button>)}</div>}
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {loadState === "loading" && <section className="px-2 py-10 text-center sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:px-8 sm:py-16 sm:shadow-sm lg:min-h-[34rem] lg:py-20" role="status"><p className="text-sm font-semibold text-slate-600">Loading price alerts…</p></section>}
            {(loadState === "error" || loadState === "unauthorized") && <section className="px-2 py-10 text-center sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:px-8 sm:py-16 sm:shadow-sm lg:min-h-[34rem] lg:py-20" role="alert"><h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">{text(t, "accountDashboard.priceAlerts.error.title", "We could not load your alerts. Please try again.")}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{loadState === "unauthorized" ? "Please sign in to view your price alerts." : text(t, "accountDashboard.priceAlerts.error.body", "Refresh the page and try again.")}</p><button type="button" className="focus-ring mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#004BB8] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#021C2B]" onClick={() => loadAlerts()}>Retry</button></section>}
            {loadState === "success" && alerts.length === 0 && <section className="px-2 py-10 text-center sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:px-8 sm:py-16 sm:shadow-sm lg:min-h-[34rem] lg:py-20" aria-labelledby="empty-alerts-title"><EmptyStateIllustration /><h2 id="empty-alerts-title" className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">{t["accountDashboard.priceAlerts.empty.title"]}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{t["accountDashboard.priceAlerts.empty.body"]}</p><Link href="/flights" className="focus-ring mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#004BB8] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#021C2B]"><Search className="h-5 w-5" aria-hidden="true" />{t["accountDashboard.priceAlerts.cta.flights"]}</Link></section>}
            {loadState === "success" && alerts.length > 0 && <section className="space-y-4" aria-label="Saved price alerts">{visibleAlerts.length > 0 ? visibleAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} t={t} />) : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">No alerts match this tab.</div>}</section>}
            <aside className="hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:block" aria-label={t["accountDashboard.priceAlerts.featuresAriaLabel"]}><div className="space-y-7">{infoItems.map((item) => { const Icon = item.icon; return <div key={item.titleKey} className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5CB6B2]/12 text-[#004BB8]"><Icon className="h-6 w-6" aria-hidden="true" /></div><div><h3 className="text-base font-semibold text-slate-900">{t[item.titleKey]}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t[item.textKey]}</p></div></div>; })}</div></aside>
          </div>
        </div>
      </AccountDetailShell>
    </main>
  );
}
