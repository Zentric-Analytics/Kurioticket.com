"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

type AuditRange = "24h" | "7d" | "30d" | "90d" | "custom";

type Props = {
  action: string;
  adminEmail: string;
  targetType: string;
  targetEmail: string;
  range: AuditRange;
  fromDate: string;
  toDate: string;
  pageHref: string;
};

const rangeOptions: readonly AdminDirectoryOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

const baseActionOptions: readonly AdminDirectoryOption[] = [
  { value: "", label: "All actions" },
  { value: "CMS", label: "CMS actions" },
  { value: "PROVIDER", label: "Provider actions" },
  { value: "USER", label: "User actions" },
  { value: "support_ticket", label: "Support actions" },
  { value: "EMAIL", label: "Email actions" },
  { value: "ADMIN_ALERT", label: "Alert actions" },
  { value: "FEATURE_CONTROL_UPDATED", label: "Feature control updates" },
  { value: "ADMIN_NOTIFICATION_PREFERENCE_UPDATED", label: "Notification preference updates" },
  { value: "TEAM_ACCESS", label: "Team access actions" },
  { value: "HOMEPAGE_FARES", label: "Homepage fare actions" },
];

const baseTargetTypeOptions: readonly AdminDirectoryOption[] = [
  { value: "", label: "All target types" },
  { value: "User", label: "User" },
  { value: "Visitor", label: "Visitor" },
  { value: "Provider", label: "Provider" },
  { value: "SupportTicket", label: "Support ticket" },
  { value: "EmailDelivery", label: "Email delivery" },
  { value: "CmsContentItem", label: "CMS content item" },
  { value: "CmsContentScope", label: "CMS content scope" },
  { value: "AdminCmsIntegrity", label: "CMS integrity" },
  { value: "AdminOperationalTelemetry", label: "Operational telemetry" },
  { value: "AdminOperationalCondition", label: "Operational condition" },
  { value: "PreviewTester", label: "Preview tester" },
  { value: "FeatureFlag", label: "Feature flag" },
  { value: "AdminNotificationPreference", label: "Notification preference" },
];

function withCurrentOption(options: readonly AdminDirectoryOption[], value: string, prefix: string) {
  if (!value || options.some(option => option.value === value)) return options;
  return [{ value, label: prefix + value }, ...options];
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export function AdminAuditLogsToolbar({
  action,
  adminEmail,
  targetType,
  targetEmail,
  range,
  fromDate,
  toDate,
  pageHref,
}: Props) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const [draftDates, setDraftDates] = useState({ from: fromDate, to: toDate });
  const [adminDraft, setAdminDraft] = useState(adminEmail);
  const [targetDraft, setTargetDraft] = useState(targetEmail);
  const [isPending, startTransition] = useTransition();
  const adminDraftRef = useRef(adminEmail);
  const targetDraftRef = useRef(targetEmail);
  const searchEditingRef = useRef(false);
  const lastSubmittedSearchRef = useRef<string | null>(null);
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));

  useEffect(() => {
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
    if (!customOpen) setDraftDates({ from: fromDate, to: toDate });
  }, [pageHref, fromDate, toDate, customOpen]);

  useEffect(() => {
    const appliedAdmin = adminEmail.trim();
    const appliedTarget = targetEmail.trim();
    if (!searchEditingRef.current) {
      adminDraftRef.current = appliedAdmin;
      targetDraftRef.current = appliedTarget;
      setAdminDraft(appliedAdmin);
      setTargetDraft(appliedTarget);
      lastSubmittedSearchRef.current = null;
      return;
    }
    if (appliedAdmin === adminDraftRef.current.trim() && appliedTarget === targetDraftRef.current.trim()) {
      searchEditingRef.current = false;
      lastSubmittedSearchRef.current = null;
    }
  }, [pageHref, adminEmail, targetEmail]);

  useEffect(() => {
    const onHistoryNavigation = () => {
      const params = new URLSearchParams(window.location.search);
      paramsRef.current = params;
      searchEditingRef.current = false;
      lastSubmittedSearchRef.current = null;
      setCustomOpen(false);

      const restoredAdmin = (params.get("adminEmail") ?? "").trim();
      const restoredTarget = (params.get("targetEmail") ?? "").trim();
      adminDraftRef.current = restoredAdmin;
      targetDraftRef.current = restoredTarget;
      setAdminDraft(restoredAdmin);
      setTargetDraft(restoredTarget);
    };
    window.addEventListener("popstate", onHistoryNavigation);
    return () => window.removeEventListener("popstate", onHistoryNavigation);
  }, []);

  const actionOptions = withCurrentOption(baseActionOptions, action, "Action: ");
  const targetTypeOptions = withCurrentOption(baseTargetTypeOptions, targetType, "Target: ");
  const todayUtc = new Date().toISOString().slice(0, 10);
  const validCustom = validDate(draftDates.from) && validDate(draftDates.to) && draftDates.from <= draftDates.to && draftDates.to <= todayUtc;

  const navigate = useCallback((values: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(paramsRef.current);
    params.delete("cursor");

    const currentAdmin = adminDraftRef.current.trim();
    const currentTarget = targetDraftRef.current.trim();

    if (!("adminEmail" in values)) {
      if (currentAdmin) params.set("adminEmail", currentAdmin);
      else params.delete("adminEmail");
    }
    if (!("targetEmail" in values)) {
      if (currentTarget) params.set("targetEmail", currentTarget);
      else params.delete("targetEmail");
    }

    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const committedAdmin = (params.get("adminEmail") ?? "").trim();
    const committedTarget = (params.get("targetEmail") ?? "").trim();
    const committedSearchKey = committedAdmin + "\n" + committedTarget;
    if (searchEditingRef.current && committedAdmin === currentAdmin && committedTarget === currentTarget) {
      lastSubmittedSearchRef.current = committedSearchKey;
    }

    const query = params.toString();
    paramsRef.current = new URLSearchParams(query);
    const href = "/admin/logs" + (query ? "?" + query : "");
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }, [router]);

  function changeRange(next: string) {
    if (next === "custom") {
      setDraftDates({ from: fromDate, to: toDate });
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    navigate({ range: next, fromDate: null, toDate: null });
  }

  useEffect(() => {
    if (!searchEditingRef.current) return;
    const nextAdmin = adminDraft.trim();
    const nextTarget = targetDraft.trim();
    const appliedAdmin = adminEmail.trim();
    const appliedTarget = targetEmail.trim();
    const searchKey = nextAdmin + "\n" + nextTarget;

    if (nextAdmin === appliedAdmin && nextTarget === appliedTarget) {
      if (lastSubmittedSearchRef.current !== null && lastSubmittedSearchRef.current !== searchKey) {
        lastSubmittedSearchRef.current = searchKey;
        navigate({
          adminEmail: nextAdmin || null,
          targetEmail: nextTarget || null,
        }, true);
        return;
      }
      searchEditingRef.current = false;
      lastSubmittedSearchRef.current = null;
      return;
    }
    if (lastSubmittedSearchRef.current === searchKey) {
      navigate({
        adminEmail: nextAdmin || null,
        targetEmail: nextTarget || null,
      }, true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!searchEditingRef.current || lastSubmittedSearchRef.current === searchKey) return;
      lastSubmittedSearchRef.current = searchKey;
      navigate({
        adminEmail: nextAdmin || null,
        targetEmail: nextTarget || null,
      }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [adminDraft, targetDraft, adminEmail, targetEmail, pageHref, navigate]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextAdmin = adminDraftRef.current.trim();
    const nextTarget = targetDraftRef.current.trim();
    const searchKey = nextAdmin + "\n" + nextTarget;
    lastSubmittedSearchRef.current = searchKey;
    navigate({
      adminEmail: nextAdmin || null,
      targetEmail: nextTarget || null,
    }, true);
  }

  return (
    <div className="border-b border-[#D8E1EC] py-3">
      <form
        onSubmit={submitSearch}
        role="search"
        aria-label="Search audit logs"
        className="grid min-w-0 gap-3 pb-3 md:grid-cols-2"
      >
        <div className="relative min-w-0">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
          <label className="sr-only" htmlFor="audit-admin-email-search">Search admin email</label>
          <input
            id="audit-admin-email-search"
            type="search"
            value={adminDraft}
            onChange={event => {
              adminDraftRef.current = event.target.value;
              searchEditingRef.current = true;
              setAdminDraft(event.target.value);
            }}
            placeholder="Search admin email"
            className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
          />
        </div>
        <div className="relative min-w-0">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
          <label className="sr-only" htmlFor="audit-target-email-search">Search target email</label>
          <input
            id="audit-target-email-search"
            type="search"
            value={targetDraft}
            onChange={event => {
              targetDraftRef.current = event.target.value;
              searchEditingRef.current = true;
              setTargetDraft(event.target.value);
            }}
            placeholder="Search target email"
            className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
          />
        </div>
      </form>

      <div className="flex min-w-0 flex-wrap items-end justify-end gap-x-6 gap-y-2">
        <AdminDirectorySelect
          key={range + ":" + rangeSelectVersion}
          name="range"
          label="Date range"
          value={range}
          options={rangeOptions}
          nativeExcludeValues={["custom"]}
          plain
          align="end"
          onValueChange={changeRange}
        />
        <AdminDirectorySelect
          name="action"
          label="Action"
          value={action}
          options={actionOptions}
          plain
          align="end"
          onValueChange={next => navigate({ action: next || null })}
        />
        <AdminDirectorySelect
          name="targetType"
          label="Target type"
          value={targetType}
          options={targetTypeOptions}
          plain
          align="end"
          onValueChange={next => navigate({ targetType: next || null })}
        />
      </div>

      {(customOpen || range === "custom") ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-medium text-[#64748B]">
            From (UTC)
            <input
              type="date"
              aria-label="Custom start date UTC"
              value={draftDates.from}
              max={draftDates.to || todayUtc}
              onChange={event => {
                setCustomOpen(true);
                setDraftDates(current => ({ ...current, from: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">
            To (UTC)
            <input
              type="date"
              aria-label="Custom end date UTC"
              value={draftDates.to}
              min={draftDates.from || undefined}
              max={todayUtc}
              onChange={event => {
                setCustomOpen(true);
                setDraftDates(current => ({ ...current, to: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <button
            type="button"
            disabled={!validCustom || isPending}
            onClick={() => {
              setCustomOpen(false);
              navigate({ range: "custom", fromDate: draftDates.from, toDate: draftDates.to });
            }}
            className="h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply dates
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomOpen(false);
              setDraftDates({ from: fromDate, to: toDate });
              setRangeSelectVersion(version => version + 1);
            }}
            className="h-10 px-2 text-[13px] font-medium text-[#475569] hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {isPending ? (
        <p role="status" aria-live="polite" className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#475569]">
          <LoaderCircle size={14} className="animate-spin text-[#004BB8]" aria-hidden="true" />
          Updating audit logs…
        </p>
      ) : null}
    </div>
  );
}
