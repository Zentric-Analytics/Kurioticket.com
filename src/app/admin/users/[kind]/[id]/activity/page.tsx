import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, Building2, CalendarDays, CarFront, CircleDot, ExternalLink,
  ListChecks, MousePointerClick, Plane, Search, UserRound,
} from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { requireAdminSession } from "@/lib/auth-guards";
import { activityHref, groupActivityRows, parseActivityFilters, relatedJourneysWindow, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { ADMIN_IDENTITY_SORTS } from "@/lib/adminIdentityDirectory";
import type { ActivityRow } from "@/lib/adminIdentityJourney";
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
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600";
const inputClass = "h-10 min-w-0 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function ProductIcon({ product }: { product: string | null | undefined }) {
  if (product === "FLIGHT") return <Plane size={16} aria-hidden="true" />;
  if (product === "HOTEL") return <Building2 size={16} aria-hidden="true" />;
  if (product === "CAR") return <CarFront size={16} aria-hidden="true" />;
  return <CircleDot size={16} aria-hidden="true" />;
}
function EventIcon({ stage }: { stage: ActivityRow["stage"] }) {
  if (stage === "SEARCH_COMPLETED") return <Search size={17} aria-hidden="true" />;
  if (stage === "RESULTS_VIEWED") return <ListChecks size={17} aria-hidden="true" />;
  if (stage === "OFFER_SELECTED") return <MousePointerClick size={17} aria-hidden="true" />;
  if (stage === "PROVIDER_HANDOFF_STARTED") return <ExternalLink size={17} aria-hidden="true" />;
  return <CircleDot size={17} aria-hidden="true" />;
}
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
  for (const key of ["tab", "stage", "product", "from", "to", "q", "cursor", "directory"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 1100) result[key] = value;
  }
  return result;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 min-w-0 break-words text-sm font-medium text-slate-900">{children}</dd></div>;
}
function detailHref(row: ActivityRow, environment: string, now: Date) {
  if (row.journeyId) {
    const to = new Date(Math.min(now.getTime(), row.at.getTime() + 86_400_000)).toISOString();
    const from = new Date(row.at.getTime() - 86_400_000).toISOString();
    return "/admin/journeys/" + encodeURIComponent(row.journeyId)
      + "?" + new URLSearchParams({ from, to, environment }).toString();
  }
  if (row.searchHistoryId) return "/admin/searches/" + encodeURIComponent(row.searchHistoryId)
    + "?" + new URLSearchParams({ environment }).toString();
  return null;
}
function ActivityTimeline({ events, nextHref, environment }: { events: ActivityRow[]; nextHref: string | null; environment: string }) {
  const groups = groupActivityRows(events);
  const now = new Date();
  return <section aria-labelledby="activity-timeline-title" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
      <h2 id="activity-timeline-title" className="text-base font-semibold text-slate-950">Activity timeline</h2>
      <span className="text-xs text-slate-500">Newest recorded first · {events.length} on this page</span>
    </div>
    {!events.length ? <div className="px-5 py-12 text-center text-sm text-slate-600">
      <p className="font-medium text-slate-800">No recorded activity is linked to this identity here.</p>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
        This view shows only records attributed to the identity in the {environment} environment that match the selected filters.
        Searches without an eligible identity link, and searches made on another environment, will not appear here.
      </p>
    </div> : (
      <div className="space-y-5 p-4 sm:p-5">
        {groups.map(group => <section key={group.key} aria-label={group.journeyId ? "Recorded journey " + group.journeyId : "Other recorded activity"} className="overflow-hidden rounded-xl border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200">
                <ProductIcon product={group.products[0]} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  {group.journeyId ? "Journey · " + (group.startedAt ? format(group.startedAt) : group.journeyId.slice(0, 10)) : "Other recorded activity"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {group.products.join(" · ") || "Other activity"}
                  {group.journeyId ? " · " + group.journeyId.slice(0, 12) + "…" : " · Not linked to a journey"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">{group.events.length} recorded events</span>
          </div>
          <ol className="divide-y divide-slate-100 px-4">
            {group.events.map(row => {
              const href = detailHref(row, environment, now);
              return <li key={row.id} className="flex gap-3 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                  <EventIcon stage={row.stage} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <time dateTime={row.at.toISOString()} className="text-xs text-slate-500">{format(row.at)}</time>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600">{row.detail || "No additional details recorded"}</p>
                  {href ? <Link href={href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline">
                    {row.journeyId ? "Open journey" : "Open search"} <ArrowUpRight size={12} aria-hidden="true" />
                  </Link> : null}
                </div>
              </li>;
            })}
          </ol>
        </section>)}
      </div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
      <p className="text-xs text-slate-500">Only recorded events are shown. Older events are loaded on demand.</p>
      {nextHref ? <Link className={buttonClass} href={nextHref}>Older activity <ArrowUpRight size={15} aria-hidden="true" /></Link> : null}
    </div>
  </section>;
}

export default async function AdminIdentityActivityPage({ params, searchParams }: PageProps) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const raw = await searchParams;
  const filtersResult = parseActivityFilters(raw);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  const backHref = safeDirectoryHref(raw);
  const queryParams = activityParams(raw);
  if (!filtersResult.ok) return <div className="space-y-4">
    <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
    <AdminEmptyState title="Invalid activity filters" message={filtersResult.error}
      action={<Link className={buttonClass} href={basePath}>Reset activity filters</Link>} />
  </div>;
  const filters: ActivityFilters = filtersResult.filters;
  const result = await loadAdminIdentityActivity(kind, id, filters, typeof raw.cursor === "string" ? raw.cursor : undefined);
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">
    <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
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
  const productsInPage = [...new Set(data.events.map(row => row.product).filter(Boolean))] as string[];

  return <div className="min-w-0 space-y-4">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Link href={backHref} className="inline-flex items-center gap-2 hover:text-slate-900"><ArrowLeft size={15} aria-hidden="true" /> Users</Link>
      <span aria-hidden="true">/</span>
      <span className="max-w-56 truncate">{data.title}</span><span aria-hidden="true">/</span>
      <span className="font-medium text-slate-900">Activity</span>
    </nav>

    <Card variant="flat" className="border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <UserRound size={23} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{data.title}</h1>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{kind === "guest" ? "Guest" : "Registered"}</span>
            <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-slate-600">{environment} records</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-slate-500">
            <span className="break-all">{kind === "guest" ? "Guest ID: " : "User ID: "}{id}</span>
            <CopyIdentityId id={id} kind={kind} />
          </div>
          {data.email ? <p className="mt-1 break-all text-xs text-slate-500">{data.email}</p>
            : <p className="mt-1 text-xs text-slate-500">Unregistered visitor with active analytics consent</p>}
        </div>
        <dl className="grid w-full gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 xl:w-auto xl:min-w-[480px] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <Field label={kind === "guest" ? "Identity" : "Account status"}>{kind === "guest" ? "Guest · Not an account" : data.status}</Field>
          <Field label={kind === "guest" ? "First seen" : "Joined"}>{format(data.firstSeenAt)}</Field>
          <Field label={kind === "guest" ? "Last seen" : "Latest matching activity"}>{data.lastSeenAt ? format(data.lastSeenAt) : "—"}</Field>
        </dl>
      </div>
    </Card>

    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Activity filters">
      <nav aria-label="Activity tabs" className="flex max-w-full gap-5 overflow-x-auto border-b border-slate-100 px-5">
        {tabs.map(tab => <Link key={tab.value}
          href={activityHref(basePath, queryParams, { tab: tab.value, cursor: null })}
          aria-current={filters.tab === tab.value ? "page" : undefined}
          className={"relative shrink-0 whitespace-nowrap py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 " +
            (filters.tab === tab.value ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600" : "")}>
          {tab.label}
        </Link>)}
      </nav>
      <form action={basePath} method="get" className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[170px_170px_170px_220px_minmax(120px,1fr)_auto]">
        <input type="hidden" name="tab" value={filters.tab} />
        {typeof raw.directory === "string" ? <input type="hidden" name="directory" value={raw.directory.slice(0, 1000)} /> : null}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From (UTC)
          <input type="date" name="from" defaultValue={filters.from} className={inputClass} aria-label="Activity start date UTC" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To (UTC)
          <input type="date" name="to" defaultValue={filters.to} className={inputClass} aria-label="Activity end date UTC" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Product
          <select name="product" defaultValue={filters.product} className={inputClass} aria-label="Activity product">
            <option value="all">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option>
            <option value="CAR">Cars</option><option value="PACKAGE">Packages</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Activity type
          <select name="stage" defaultValue={filters.stage} className={inputClass} aria-label="Activity event type">
            <option value="all">All activity types</option>
            <option value="SEARCH_COMPLETED">Search completed</option>
            <option value="RESULTS_VIEWED">Results viewed</option>
            <option value="OFFER_SELECTED">Offer selected</option>
            <option value="PROVIDER_HANDOFF_STARTED">Provider handoff</option>
            <option value="ACCOUNT_ACTIVITY">Account activity</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search within activity
          <span className="relative block"><Search size={15} aria-hidden="true" className="absolute left-3 top-3 text-slate-400" />
            <input name="q" defaultValue={filters.q} maxLength={80} placeholder="Route, destination, provider..." className={inputClass + " pl-9"} /></span>
        </label>
        <button type="submit" className="mt-auto h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Apply</button>
      </form>
    </section>

    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
      <ActivityTimeline events={data.events} nextHref={nextHref} environment={environment} />
      <aside className="min-w-0 space-y-4" aria-label="Customer details">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-slate-950">Identity details</h2>
          <dl className="mt-4 grid gap-4">
            <Field label="Identity type">{kind === "guest" ? "Guest visitor" : "Registered user"}</Field>
            <Field label={kind === "guest" ? "Guest ID" : "User ID"}><span className="break-all font-mono text-xs">{id}</span></Field>
            {data.role ? <Field label="Account role">{data.role}</Field> : null}
            <Field label="Status">{data.status}</Field>
            <Field label="First recorded">{format(data.firstSeenAt)}</Field>
            <Field label={kind === "guest" ? "Last seen" : "Latest matching activity"}>{data.lastSeenAt ? format(data.lastSeenAt) : "—"}</Field>
            <Field label="Analytics consent">{kind === "guest" ? "Granted" : "Required for linked guest events"}</Field>
            <Field label="Products on this page">
              {productsInPage.length ? <div className="flex flex-wrap gap-2">{productsInPage.map(product => <span key={product} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs"><ProductIcon product={product} /> {product}</span>)}</div> : "—"}
            </Field>
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-slate-950">Related records</h2>
          <div className="mt-2 divide-y divide-slate-100 text-sm">
            {[
              { label: "View all searches", href: searchesHref, help: "Searches attributed to this identity" },
              { label: "View journeys", href: journeysHref, help: "Consented journeys and recorded stages" },
              { label: "View provider handoffs", href: handoffsHref, help: "Outbound provider referral records" },
            ].map(item => <Link key={item.href} href={item.href} className="flex items-center justify-between gap-2 py-3 hover:text-indigo-700">
              <span className="min-w-0"><span className="block font-medium">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.help}</span></span>
              <ArrowUpRight size={16} aria-hidden="true" className="shrink-0" />
            </Link>)}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><CalendarDays size={16} /> About this activity</h2>
          <p className="mt-2 text-xs leading-5 text-slate-600">Only recorded {environment} events are displayed. Guest activity requires ongoing analytics consent. Provider handoffs are not proof of a booking or payment.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Unlinked historical records are shown separately; missing stages are not inferred. Internal notes have not been enabled.</p>
        </section>
      </aside>
    </div>
  </div>;
}
