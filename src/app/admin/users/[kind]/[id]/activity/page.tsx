import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, Building2, CarFront } from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { ActivityFiltersBar } from "@/components/admin/ActivityFiltersBar";
import { ActivityDataInfo } from "@/components/admin/ActivityDataInfo";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { activityHref, parseActivityFilters, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { ADMIN_IDENTITY_SORTS, ADMIN_IDENTITY_DATES, validAdminIdentityCustomDates } from "@/lib/adminIdentityDirectory";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";

export const metadata = { title: "Admin Customer Activity" };
type Params = { kind: string; id: string };
type RawQuery = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<Params>; searchParams: Promise<RawQuery> };

const tabs = [
  { value: "all", label: "All activity" },
  { value: "searches", label: "Searches" },
  { value: "selections", label: "Selections" },
  { value: "handoffs", label: "Provider handoffs" },
] as const;
const format = (at: Date) => new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
}).format(at);
// Identical track boundaries for both sections, including the empty management track.
const activityColumns = "grid min-w-0 gap-y-5 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,1.32fr)_minmax(0,1.32fr)_minmax(72px,0.48fr)_minmax(126px,0.7fr)] lg:items-center";
const buttonClass = "focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

function safeDirectoryHref(raw: RawQuery) {
  const saved = typeof raw.directory === "string" && raw.directory.length <= 1000 ? raw.directory : "";
  const candidates = new URLSearchParams(saved);
  const safe = new URLSearchParams();
  const allowed = {
    q: 120, role: 30, status: 30, tab: 30, identity: 30, sort: 20, date: 20, from: 10, to: 10, page: 8,
  } as const;
  for (const [key, max] of Object.entries(allowed)) {
    const value = candidates.get(key);
    if (value && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
      && (key !== "sort" || ADMIN_IDENTITY_SORTS.includes(value as (typeof ADMIN_IDENTITY_SORTS)[number]))
      && (key !== "date" || ADMIN_IDENTITY_DATES.includes(value as (typeof ADMIN_IDENTITY_DATES)[number]))) safe.set(key, value);
  }
  if (safe.get("date") !== "custom" || !validAdminIdentityCustomDates(safe.get("from") || undefined, safe.get("to") || undefined)) {
    safe.delete("from");
    safe.delete("to");
    if (safe.get("date") === "custom") safe.set("date", "all");
  }
  return "/admin/users" + (safe.size ? "?" + safe.toString() : "");
}
function activityParams(raw: RawQuery) {
  const result: Record<string, string> = {};
  for (const key of ["tab", "range", "stage", "product", "from", "to", "q", "order", "directory"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 1100) result[key] = value;
  }
  return result;
}
function HeaderTime({ at }: { at: Date }) {
  const label = format(at);
  return <time dateTime={at.toISOString()} title={label + " UTC"}>{label}</time>;
}
function Fact({ label, children, className = "", testId }: {
  label: string; children: React.ReactNode; className?: string; testId?: string;
}) {
  return <div data-testid={testId} className={"min-w-0 border-l border-[#E2E8F0] pl-4 sm:pl-5 " + className}>
    <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{children}</dd>
  </div>;
}

function RegisteredManage({ id, email, role, status, actorId }: {
  id: string; email: string | null; role: string; status: string; actorId: string;
}) {
  const protectedAccount = Boolean(email && getAdminEmails().some(
    adminEmail => adminEmail.toLowerCase().trim() === email.toLowerCase().trim()
  ));
  return <UserStatusActions
    userId={id} email={email} role={role} status={status}
    isSelf={actorId === id} isProtectedAdmin={protectedAccount}
  />;
}

/**
 * Activity history may fail independently of the identity database.
 * Keep existing account administration reachable on an Activity error page
 * without bypassing its separate API authorization, roles or account guards.
 */
async function fallbackManage(kind: string, id: string, actorId: string): Promise<React.ReactNode> {
  return withOptionalDb<React.ReactNode>(async db => {
    if (kind === "user") {
      const account = await db.user.findUnique({
        where: { id }, select: { id: true, email: true, role: true, status: true },
      });
      return account ? <RegisteredManage
        id={account.id} email={account.email} role={account.role}
        status={account.status} actorId={actorId}
      /> : null;
    }
    return null;
  }, null);
}

export default async function AdminIdentityActivityPage({ params, searchParams }: PageProps) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const session = await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const raw = { ...(await searchParams) };
  // Existing Journeys bookmarks now display the unfiltered activity tab.
  // Preserve their other filters without leaving an invisible selected tab.
  if (raw.tab === "journeys") delete raw.tab;
  // Old paginated bookmarks now open the complete newest-first history.
  delete raw.cursor;
  delete raw.order;
  delete raw.sort;
  const filtersResult = parseActivityFilters(raw);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  const backHref = safeDirectoryHref(raw);
  const queryParams = activityParams(raw);
  if (!filtersResult.ok) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id)}</div>
    </div>
    <AdminEmptyState title="Invalid activity filters" message={filtersResult.error}
      action={<Link className={buttonClass} href={basePath}>Reset activity filters</Link>} />
  </div>;
  const filters: ActivityFilters = filtersResult.filters;
  const result = await loadAdminIdentityActivity(kind, id, filters, undefined, "all");
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id)}</div>
    </div>
    <AdminEmptyState title={result.status === "invalid_cursor" ? "Activity page link expired" : "Activity data unavailable"}
      message={result.status === "invalid_cursor" ? "The pagination link does not match this customer or the selected filters." : "The activity reader is temporarily unavailable. This does not mean there is no customer history."}
      action={<Link className={buttonClass} href={activityHref(basePath, queryParams, { cursor: null, order: null })}>Return to newest activity</Link>} />
  </div>;
  const data = result.data;
  const environment = data.environment;
  const operational = data.source === "operational";
  const order = filters.order === "oldest" ? "oldest" : "newest";

  return <div className="min-w-0 space-y-6 bg-[#F1F5FB] pb-2 text-[#0F172A]">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 rounded-sm hover:text-[#004BB8]">
        <ArrowLeft size={16} aria-hidden="true" /> Users
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#0F172A]">Activity</span>
    </nav>

    <section data-testid="activity-page-card" aria-label="Customer activity workspace"
      className="min-w-0 space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <section aria-label="Customer identity" className="min-w-0">
        <div className={activityColumns}>
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold">
              {(kind === "guest" ? "G" : (data.title || "U").slice(0,1)).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">
                  {kind === "guest" ? operational ? "Guest session" : "Visitor" : data.title}
                </h1>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                  {kind === "guest" ? operational ? "Essential operational activity" : "Consented guest" : data.status === "ACTIVE" ? "Active" : data.status}
                </span>
              </div>
              {data.email ? <p className="mt-1 break-words text-sm text-[#475569] [overflow-wrap:anywhere]">{data.email}</p> : null}
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <code className="max-w-[240px] truncate text-xs" title={id}>{id}</code>
                <CopyIdentityId id={id} kind={kind}/>
              </div>
            </div>
          </div>

          <dl className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:contents">
            <Fact label={kind === "guest" ? "First seen" : "Joined"}><HeaderTime at={data.firstSeenAt}/></Fact>
            <Fact label="Last active">{data.lastSeenAt ? <HeaderTime at={data.lastSeenAt}/> : "—"}</Fact>
            <Fact label="Events" testId="activity-events-fact">{data.events.length}</Fact>
          </dl>

          {kind === "user" ? <div className="flex min-w-0 justify-start lg:justify-end" aria-label="Identity management">
            <RegisteredManage id={id} email={data.email} role={data.role || "USER"} status={data.status} actorId={session.user.id}/>
          </div> : <div aria-hidden="true" className="hidden lg:block" />}
        </div>
      </section>

      <section aria-label="Activity summary" className="min-w-0 border-y border-[#E2E8F0] py-5">
        <div className={activityColumns}>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end lg:pr-5">
            <h2 className="text-base font-semibold">Activity summary</h2>
            {kind === "guest" ? <ActivityDataInfo>
              {operational
                ? <>Only recorded, necessary {environment} search and provider-handoff activity is displayed. The session credential expires, but retained records remain available. This ID does not identify a person. </>
                : <>Only recorded, consented {environment} guest activity is displayed. </>}
              Missing records do not establish that no visit occurred. Provider handoffs are not proof of a booking or payment.
            </ActivityDataInfo> : null}
          </div>
          <div className="grid min-w-0 grid-cols-[1.5fr_0.95fr_1.1fr] gap-1 sm:grid-cols-3 sm:gap-2 lg:contents">
            {([
              { label: "Searches", count: data.summary.searches },
              { label: "Results viewed", count: data.summary.resultsViewed },
              { label: "Provider handoffs", count: data.summary.providerHandoffs },
            ]).map(({label,count}) => <div key={label} className="min-w-0 border-l border-[#E2E8F0] pl-2 sm:pl-5">
              <span data-testid="activity-metric-label" className="block text-[12px] font-normal text-[#64748B] lg:whitespace-nowrap">{label}</span>
              <span data-testid="activity-metric-value" className="mt-1 block text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{count}</span>
              {label === "Searches" && data.summary.searchProducts ? <div aria-label="Searches by product"
                className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] sm:gap-x-3 sm:text-xs leading-4 text-[#64748B]">
                {([
                  { label: "Flights", count: data.summary.searchProducts.flights, Icon: Plane },
                  { label: "Hotels", count: data.summary.searchProducts.hotels, Icon: Building2 },
                  { label: "Cars", count: data.summary.searchProducts.cars, Icon: CarFront },
                ]).map(({label, count, Icon}) => <span key={label} aria-label={label + ": " + count} title={label}
                  className="inline-flex items-center gap-0.5 tabular-nums sm:gap-1"><Icon size={12} aria-hidden="true" />{count}</span>)}
                {data.summary.searchProducts.other > 0 ? <span aria-label={"Other or unknown: " + data.summary.searchProducts.other}>
                  Other: {data.summary.searchProducts.other}
                </span> : null}
              </div> : null}
            </div>)}
          </div>
          <div aria-hidden="true" className="hidden lg:block" />
        </div>
      </section>

      <div data-testid="activity-body-card" className="min-w-0 space-y-6 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
        <section aria-label="Activity filters" className="min-w-0">
          <ActivityFiltersBar path={basePath} directory={typeof raw.directory === "string" && raw.directory.length <= 1000 ? raw.directory : ""}
            initial={{tab:filters.tab,q:filters.q,product:filters.product,stage:filters.stage,order,
              from:filters.from,to:filters.to,range:typeof raw.range === "string" && ["7d","30d","custom"].includes(raw.range) ? raw.range : (filters.from || filters.to ? "custom" : "all")}}
            tabs={<nav aria-label="Activity tabs" className="flex max-w-full shrink-0 gap-7 overflow-x-auto">
              {tabs.map(tab => <Link key={tab.value}
                href={activityHref(basePath, queryParams, { tab: tab.value, cursor: null })}
                aria-current={filters.tab === tab.value ? "page" : undefined}
                className={"focus-ring relative shrink-0 whitespace-nowrap rounded-sm py-3 text-[13px] font-medium text-[#475569] " +
                  (filters.tab === tab.value ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#004BB8]" : "")}>
                  {tab.label}
                </Link>)}
            </nav>} />
        </section>

        <ActivityTimeline events={data.events} nextHref={null} environment={environment} order={order}
          returnHref={activityHref(basePath, queryParams, {})}
          clearHref={activityHref(basePath, queryParams, {q:null,from:null,to:null,range:null,product:null,stage:null,order:null,cursor:null})}/>
      </div>
    </section>
  </div>;
}
