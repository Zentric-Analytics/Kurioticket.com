"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildDealsSearchFingerprint } from "@/lib/deals/dealsTripPlan";
import { buildDealsResultsUrl, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

export function PackageAccountActions({ search, ready }: { search: DealsSearch; ready: boolean }) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [message, setMessage] = useState("");
  const fingerprint = useMemo(() => buildDealsSearchFingerprint(search), [search]);
  const label = `Package to ${search.sharedDestination}`;

  useEffect(() => {
    if (!ready) return;
    void fetch("/api/account/recent-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: `web-package-${fingerprint}`, type: "package", label, subtitle: `${search.sharedTravelStartDate} – ${search.sharedTravelEndDate}`, href: buildDealsResultsUrl(search), params: search }),
    });
  }, [fingerprint, label, ready, search]);

  const save = async () => {
    setMessage("");
    const response = await fetch("/api/dashboard/saved", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "search", searchType: "package", label, destination: search.sharedDestination, checkIn: search.sharedTravelStartDate, checkOut: search.sharedTravelEndDate, query: search }),
    });
    if (response.status === 401) { router.push(`/auth/signin?callbackUrl=${encodeURIComponent(buildDealsResultsUrl(search))}`); return; }
    setMessage(response.ok ? t("travel.account.package.saved") : response.status === 409 ? t("travel.account.package.duplicate") : t("travel.account.package.error"));
  };

  return <div className="mb-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void save()} className="min-h-11 rounded-xl border border-[#004BB8] bg-white px-4 font-bold text-[#004BB8]">{t("travel.account.package.save")}</button>{message && <p role="status" className="text-sm font-semibold text-slate-700">{message}</p>}</div>;
}
