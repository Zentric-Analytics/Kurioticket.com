import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ChevronRight, ExternalLink, Info, Route, Search, UserRound,
} from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { GuestTrackingActions } from "@/components/admin/GuestTrackingActions";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { eligibleGuestVisitorWhere } from "@/lib/adminIdentityJourney";
import { activityHref, parseActivityFilters, relatedJourneysWindow, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { ADMIN_IDENTITY_SORTS } from "@/lib/adminIdentityDirectory";
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
    q: 120, role: 30, status: 30, identity: 30, sort: 20, page: 8,
  } as const;
  for (const [key, max] of Object.entries(allowed)) {
    const value = candidates.get(key);
    if (value && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
      && (key !== "sort" || ADMIN_IDENTITY_SORTS.includes(value as (typeof ADMIN_IDENTITY_SORTS)[number]))) safe.set(key, value);
  }
  return "/admin/users" + (safe.size ? "?" + safe.toString() : "");
}
function activityParams(raw: RawQuery) {
  const result: Record<string, string> = {};
  for (const key of ["tab", "stage", "product", "from", "to", "q", "order", "cursor", "directory"]) {
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
  const raw = await searchParams;
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
      action={<Link className={buttonClass} href={activityHref(basePath, queryParams, { cursor: null })}>Return to newest activity</Link>} />
  </div>;
  const data = result.data;
  const environment = data.environment;
  const searchParamsForLink = new URLSearchParams({
    ...(kind === "guest" ? { visitorId: id, identity: "guest" } : { userId: id, identity: "registered" }),
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
  const sortParams = { tab: filters.tab, product: filters.product, stage: filters.stage,
    from: filters.from, to: filters.to, q: filters.q,
    ...(typeof raw.directory === "string" && raw.directory.length <= 1000 ? { directory: raw.directory } : {}) };
  const related = [
    { href: searchesHref, icon: Search, title: "Searches", subtitle: "View all searches from this identity" },
    { href: journeysHref, icon: Route, title: "Journeys", subtitle: "View consented journeys and stages" },
    { href: handoffsHref, icon: ExternalLink, title: "Provider handoffs", subtitle: "View outbound provider referral records" },
  ];

  return <div className="min-w-0 space-y-6 bg-white pb-2">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 rounded-sm hover:text-[#004BB8]">
        <ArrowLeft size={16} aria-hidden="true" /> Users
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#020617]">Activity</span>
    </nav>

    <section aria-label="Customer identity" className="border-b border-[#E2E8F0] pb-5">
      <div className="grid min-w-0 items-center gap-x-5 gap-y-5 lg:grid-cols-[minmax(280px,1.5fr)_repeat(3,minmax(125px,0.65fr))_auto]">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
            <UserRound size={31} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-[#020617]">
              {kind === "guest" ? "Visitor" : data.title}
            </h1>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-[13px] text-[#64748B]" title={id}>{id}</span>
              <CopyIdentityId id={id} kind={kind} />
            </div>
            {data.email ? <p className="mt-1 truncate text-[12px] text-[#64748B]" title={data.email}>{data.email}</p> : null}
          </div>
        </div>
        <dl className="contents">
          <Fact label={kind === "guest" ? "First seen" : "Joined"}>{format(data.firstSeenAt)}</Fact>
          <Fact label={kind === "guest" ? "Last seen" : "Latest on this page"}>{data.lastSeenAt ? format(data.lastSeenAt) : "—"}</Fact>
          <Fact label={kind === "guest" ? "Analytics consent" : "Account status"}>
            {kind === "guest" ? <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#16A34A]" /> Granted
            </span> : data.status}
          </Fact>
        </dl>
        <div className="justify-self-start lg:justify-self-end" aria-label="Identity management">
          {kind === "user"
            ? <RegisteredManage id={id} email={data.email} role={data.role || "USER"}
                status={data.status} actorId={session.user.id} />
            : <GuestTrackingActions visitorId={id} backHref={backHref} />}
        </div>
      </div>
    </section>

    <section aria-label="Activity filters" className="min-w-0 space-y-4">
      <nav aria-label="Activity tabs" className="flex max-w-full gap-7 overflow-x-auto border-b border-[#D8E1EC]">
        {tabs.map(tab => <Link key={tab.value}
          href={activityHref(basePath, queryParams, { tab: tab.value, cursor: null })}
          aria-current={filters.tab === tab.value ? "page" : undefined}
          className={"focus-ring relative shrink-0 whitespace-nowrap rounded-sm py-3 text-[13px] font-medium text-[#334155] " +
            (filters.tab === tab.value ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#004BB8]" : "")}>
          {tab.label}
        </Link>)}
      </nav>
      <form action={basePath} method="get"
        className="grid min-w-0 gap-3 rounded-lg border border-[#E7EDF5] bg-[#F8FAFC] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(110px,1fr)_minmax(110px,1fr)_minmax(130px,0.9fr)_minmax(145px,1fr)_minmax(175px,1.8fr)_auto] lg:items-end lg:gap-3 lg:p-4">
        <input type="hidden" name="tab" value={filters.tab} />
        <input type="hidden" name="order" value={order} />
        {typeof raw.directory === "string" && raw.directory.length <= 1000
          ? <input type="hidden" name="directory" value={raw.directory} /> : null}
        <label className="flex min-w-0 flex-col gap-1.5 text-[12px] font-medium text-[#475569]">
          From
          <input type="date" name="from" defaultValue={filters.from} className={inputClass} aria-label="Activity start date UTC" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[12px] font-medium text-[#475569]">
          To
          <input type="date" name="to" defaultValue={filters.to} className={inputClass} aria-label="Activity end date UTC" />
        </label>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#475569]">Product</span>
          <AdminDirectorySelect name="product" label="Activity product" value={filters.product}
            options={[{value:"all", label:"All products"}, {value:"FLIGHT", label:"Flights"}, {value:"HOTEL", label:"Hotels"}, {value:"CAR", label:"Cars"}, {value:"PACKAGE", label:"Packages"}]} compact />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#475569]">Activity type</span>
          <AdminDirectorySelect name="stage" label="Activity event type" value={filters.stage}
            options={[{value:"all", label:"All activity types"}, {value:"SEARCH_COMPLETED", label:"Search completed"}, {value:"RESULTS_VIEWED", label:"Results viewed"}, {value:"OFFER_SELECTED", label:"Offer selected"}, {value:"PROVIDER_HANDOFF_STARTED", label:"Provider handoff"}, {value:"ACCOUNT_ACTIVITY", label:"Account activity"}]} compact />
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-[12px] font-medium text-[#475569] sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search within activity</span>
          <span className="relative block">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-[13px] text-[#94A3B8]" />
            <input name="q" defaultValue={filters.q} maxLength={80}
              placeholder="Route, destination, provider..." className={inputClass + " pl-9"} />
          </span>
        </label>
        <button type="submit"
          className="focus-ring h-11 whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-semibold text-white hover:bg-[#004BB8]/90">
          Apply Filter
        </button>
      </form>
    </section>

    <ActivityTimeline events={data.events} nextHref={nextHref} environment={environment} order={order}
      sortControl={
        <form action={basePath} method="get" className="min-w-[132px]">
          {Object.entries(sortParams).map(([key,value]) => <input key={key} type="hidden" name={key} value={value}/>)}
          <AdminDirectorySelect name="order" label="Activity order" value={order}
            options={[{value:"newest",label:"Newest first"},{value:"oldest",label:"Oldest first"}]} compact autoSubmit />
        </form>
      }
    />

    <section aria-labelledby="activity-related-title" className="min-w-0 space-y-3">
      <h2 id="activity-related-title" className="text-[15px] font-semibold text-[#020617]">Explore related records</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {related.map(({href,icon:Icon,title,subtitle}) =>
          <Link key={href} href={href}
            className="focus-ring group flex min-w-0 items-center gap-3 rounded-lg border border-[#D8E1EC] bg-white px-4 py-4 hover:border-[#94A3B8] hover:bg-[#F8FAFC]">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#004BB8]">
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#004BB8]">{title}</span>
              <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">{subtitle}</span>
            </span>
            <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-[#004BB8]" />
          </Link>
        )}
      </div>
    </section>

    <p className="flex min-w-0 items-start gap-2.5 rounded-lg bg-[#EFF6FF] px-4 py-3 text-[12px] leading-5 text-[#475569]">
      <Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-[#004BB8]" />
      <span>Only recorded, consented {environment} activity is displayed. Missing records do not establish that no visit occurred.
        Provider handoffs are not proof of a booking or payment.</span>
    </p>
  </div>;
}
