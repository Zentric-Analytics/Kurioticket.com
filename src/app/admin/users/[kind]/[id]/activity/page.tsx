import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ChevronRight, ExternalLink, Route, Search, UserRound,
} from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { GuestTrackingActions } from "@/components/admin/GuestTrackingActions";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { ActivityFiltersBar } from "@/components/admin/ActivityFiltersBar";
import { ActivityDataInfo } from "@/components/admin/ActivityDataInfo";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { eligibleGuestVisitorWhere } from "@/lib/adminIdentityJourney";
import { activityHref, parseActivityFilters, relatedJourneysWindow, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
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
}).format(at) + " UTC";
const buttonClass = "focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#D8E1EC] bg-white px-3 py-2 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";
const inputClass = "focus-ring h-11 min-w-0 w-full rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-normal text-[#020617] placeholder:text-[#64748B] hover:border-[#94A3B8]";

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
  for (const key of ["tab", "range", "stage", "product", "from", "to", "q", "order", "cursor", "directory"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 1100) result[key] = value;
  }
  return result;
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 border-l border-[#E2E8F0] pl-4 sm:pl-5">
    <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-[13px] font-medium text-[#020617]">{children}</dd>
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
async function fallbackManage(kind: string, id: string, actorId: string, backHref: string): Promise<React.ReactNode> {
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
    if (kind === "guest") {
      const visitor = await db.visitor.findFirst({
        where: eligibleGuestVisitorWhere(id), select: { id: true },
      });
      return visitor ? <GuestTrackingActions visitorId={id} backHref={backHref} /> : null;
    }
    return null;
  }, null);
}

export default async function AdminIdentityActivityPage({ params, searchParams }: PageProps) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const session = await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const raw = { ...(await searchParams) };
  // The activity toolbar intentionally has no sort control; never retain a hidden oldest-first state.
  if (raw.order === "oldest" || raw.sort === "oldest") delete raw.cursor;
  delete raw.order;
  delete raw.sort;
  const filtersResult = parseActivityFilters(raw);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  const backHref = safeDirectoryHref(raw);
  const queryParams = activityParams(raw);
  if (!filtersResult.ok) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id, backHref)}</div>
    </div>
    <AdminEmptyState title="Invalid activity filters" message={filtersResult.error}
      action={<Link className={buttonClass} href={basePath}>Reset activity filters</Link>} />
  </div>;
  const filters: ActivityFilters = filtersResult.filters;
  const result = await loadAdminIdentityActivity(kind, id, filters, typeof raw.cursor === "string" ? raw.cursor : undefined);
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id, backHref)}</div>
    </div>
    <AdminEmptyState title={result.status === "invalid_cursor" ? "Activity page link expired" : "Activity data unavailable"}
      message={result.status === "invalid_cursor" ? "The pagination link does not match this customer or the selected filters." : "The activity reader is temporarily unavailable. This does not mean there is no customer history."}
      action={<Link className={buttonClass} href={activityHref(basePath, queryParams, { cursor: null, order: null })}>Return to newest activity</Link>} />
  </div>;
  const data = result.data;
  const environment = data.environment;
  const operational = data.source === "operational";
  const searchParamsForLink = new URLSearchParams({
    ...(kind === "guest" ? operational ? { identity: "guest" } : { visitorId: id, identity: "guest" } : { userId: id, identity: "registered" }),
    environment,
  });
  const journeysParams = new URLSearchParams(searchParamsForLink);
  const visibleJourneyWindow = relatedJourneysWindow(data.events, new Date());
  if (visibleJourneyWindow) {
    journeysParams.set("from", visibleJourneyWindow.from);
    journeysParams.set("to", visibleJourneyWindow.to);
  }
  const journeysHref = "/admin/journeys?" + journeysParams.toString();
  const searchesHref = "/admin/searches?" + searchParamsForLink.toString();
  const handoffsHref = "/admin/redirects?" + searchParamsForLink.toString();
  const nextHref = data.nextCursor ? activityHref(basePath, queryParams, { cursor: data.nextCursor }) : null;

  const order = filters.order === "oldest" ? "oldest" : "newest";
  const related = [
    ...(!operational ? [{ href: searchesHref, icon: Search, title: "Searches", subtitle: "View all searches from this identity" }] : []),
    ...(!operational ? [{ href: journeysHref, icon: Route, title: "Journeys", subtitle: "View consented journeys and stages" }, { href: handoffsHref, icon: ExternalLink, title: "Provider handoffs", subtitle: "View outbound provider referral records" }] : []),
  ];

  return <div className="min-w-0 space-y-6 bg-white pb-2">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 rounded-sm hover:text-[#004BB8]">
        <ArrowLeft size={16} aria-hidden="true" /> Users
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#020617]">Activity</span>
    </nav>

    <section aria-label="Customer identity" className="py-2 sm:py-3">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold">{(kind === "guest" ? "G" : (data.title || "U").slice(0,1)).toUpperCase()}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-semibold">{kind === "guest" ? operational ? "Guest session" : "Guest visitor" : data.title}</h1>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">{kind === "guest" ? operational ? "Essential operational activity" : "Guest visitor" : data.status === "ACTIVE" ? "Active" : data.status}</span></div>
            {data.email ? <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{data.email}</p> : null}
            <div className="mt-1 flex items-center gap-2"><code className="max-w-[240px] truncate text-xs" title={id}>{id}</code><CopyIdentityId id={id} kind={kind}/></div>
          </div>
        </div>
        <dl className="grid w-full grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-5 xl:w-auto xl:shrink-0">
          <Fact label={kind === "guest" ? "First seen" : "Joined"}>{format(data.firstSeenAt)}</Fact>
          <Fact label="Last active">{data.lastSeenAt ? format(data.lastSeenAt) : "—"}</Fact>
          <Fact label="Events">{data.events.length}{data.nextCursor ? "+" : ""}</Fact>
          <Fact label="Journeys">{new Set(data.events.filter(e => e.journeyId).map(e => e.journeyId)).size}{data.nextCursor ? "+" : ""}</Fact>
        </dl>
      </div>
      <div className="mt-2 flex justify-end" aria-label="Identity management">{kind === "user"
        ? <RegisteredManage id={id} email={data.email} role={data.role || "USER"} status={data.status} actorId={session.user.id}/>
        : operational ? null : <GuestTrackingActions visitorId={id} backHref={backHref}/>}</div>
    </section>

    <section aria-label="Activity filters" className="min-w-0">
      <ActivityFiltersBar path={basePath} directory={typeof raw.directory === "string" && raw.directory.length <= 1000 ? raw.directory : ""}
        initial={{tab:filters.tab,q:filters.q,product:filters.product,stage:filters.stage,order,
          from:filters.from,to:filters.to,range:typeof raw.range === "string" && ["7d","30d","custom"].includes(raw.range) ? raw.range : (filters.from || filters.to ? "custom" : "all")}}
        tabs={<nav aria-label="Activity tabs" className="flex max-w-full shrink-0 gap-7 overflow-x-auto">
        {tabs.map(tab => <Link key={tab.value}
          href={activityHref(basePath, queryParams, { tab: tab.value, cursor: null })}
          aria-current={filters.tab === tab.value ? "page" : undefined}
          className={"focus-ring relative shrink-0 whitespace-nowrap rounded-sm py-3 text-[13px] font-medium text-[#334155] " +
            (filters.tab === tab.value ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#004BB8]" : "")}>
          {tab.label}
        </Link>)}
      </nav>} />
    </section>

    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <ActivityTimeline events={data.events} nextHref={nextHref} environment={environment} order={order}
        clearHref={activityHref(basePath, queryParams, {q:null,from:null,to:null,range:null,product:null,stage:null,order:null,cursor:null})}/>
      <aside className="min-w-0 space-y-4">
          <section aria-label="Activity summary" className="pb-3">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Activity summary</h2>
              <ActivityDataInfo>
                {kind === "guest"
                  ? operational ? <>Only recorded, necessary {environment} search and provider-handoff activity is displayed. The session credential expires, but retained records remain available. This ID does not identify a person. </> : <>Only recorded, consented {environment} guest activity is displayed. </>
                  : <>Only recorded {environment} account activity is displayed; linked visitor activity requires analytics consent. </>}
                Missing records do not establish that no visit occurred. Provider handoffs are not proof of a booking or payment.
              </ActivityDataInfo>
            </div>
            {[
              ["Searches", data.events.filter(e => e.stage === "SEARCH_COMPLETED").length],
              ["Results viewed", data.events.filter(e => e.stage === "RESULTS_VIEWED").length],
              ["Provider handoffs", data.events.filter(e => e.stage === "PROVIDER_HANDOFF_STARTED").length],
            ].map(([label,count]) => <div key={label} className="flex justify-between border-b border-[var(--border)] py-2 text-sm last:border-0">
              <span className="text-[var(--muted-foreground)]">{label}</span><strong>{count}</strong>
            </div>)}
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Counts reflect loaded events only.</p>
          </section>
          <section aria-labelledby="activity-related-title" className="pb-3">
            <h2 id="activity-related-title" className="mb-2 text-sm font-semibold">Related records</h2>
            {related.map(({href,title}) => <Link key={href} href={href}
              className="focus-ring flex items-center justify-between rounded-sm border-b border-[var(--border)] py-3 text-sm last:border-0 hover:underline">
              {title}<ChevronRight size={16}/>
            </Link>)}
          </section>
      </aside>
    </div>
  </div>;
}
