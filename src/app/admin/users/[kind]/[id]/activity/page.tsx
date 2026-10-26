import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Building2, CarFront, ChevronRight, CircleDot, Plane, Search, UserRound,
} from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { requireAdminSession } from "@/lib/auth-guards";
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
const inputClass = "focus-ring h-10 min-w-0 w-full rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-normal text-[#020617] placeholder:text-[#64748B] hover:border-[#94A3B8]";

function ProductIcon({ product }: { product: string | null | undefined }) {
  if (product === "FLIGHT") return <Plane size={16} aria-hidden="true" />;
  if (product === "HOTEL") return <Building2 size={16} aria-hidden="true" />;
  if (product === "CAR") return <CarFront size={16} aria-hidden="true" />;
  return <CircleDot size={16} aria-hidden="true" />;
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
  return <div className="min-w-0"><dt className="text-[12px] font-medium text-[#64748B]">{label}</dt><dd className="mt-1 min-w-0 break-words text-[13px] font-medium text-[#020617]">{children}</dd></div>;
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

  return <div className="min-w-0 space-y-5 bg-white">
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 rounded-sm hover:text-[#004BB8]"><ArrowLeft size={15} aria-hidden="true" /> Users</Link>
      <span aria-hidden="true">/</span>
      <span className="max-w-56 truncate">{data.title}</span><span aria-hidden="true">/</span>
      <span className="font-medium text-[#020617]">Activity</span>
    </nav>

    <section aria-label="Customer identity" className="border-b border-[#D8E1EC] pb-4">
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569]"><UserRound size={17} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight text-[#020617]">{data.title}</h1>
            <span className="text-[12px] font-medium text-[#475569]">{kind === "guest" ? "Guest" : "Registered"}</span>
            <span className="text-[12px] font-semibold capitalize text-[#475569]">{environment} records</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-[#475569]">
            <span className="break-all">{kind === "guest" ? "Guest ID: " : "User ID: "}{id}</span>
            <CopyIdentityId id={id} kind={kind} />
          </div>
          {data.email ? <p className="mt-1 break-all text-[12px] text-[#475569]">{data.email}</p>
            : <p className="mt-1 text-[12px] text-[#475569]">Unregistered visitor with active analytics consent</p>}
        </div>
        <dl className="grid w-full gap-4 border-t border-[#E7ECF5] pt-3 sm:grid-cols-3 xl:w-auto xl:min-w-[480px] xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <Field label={kind === "guest" ? "Identity" : "Account status"}>{kind === "guest" ? "Guest · Not an account" : data.status}</Field>
          <Field label={kind === "guest" ? "First seen" : "Joined"}>{format(data.firstSeenAt)}</Field>
          <Field label={kind === "guest" ? "Last seen" : "Latest matching activity"}>{data.lastSeenAt ? format(data.lastSeenAt) : "—"}</Field>
        </dl>
      </div>
    </section>

    <section className="min-w-0 border-b border-[#D8E1EC] pb-3" aria-label="Activity filters">
      <nav aria-label="Activity tabs" className="flex max-w-full gap-5 overflow-x-auto border-b border-[#E7ECF5]">
        {tabs.map(tab => <Link key={tab.value}
          href={activityHref(basePath, queryParams, { tab: tab.value, cursor: null })}
          aria-current={filters.tab === tab.value ? "page" : undefined}
          className={"focus-ring relative shrink-0 whitespace-nowrap rounded-sm py-3 text-[13px] font-medium text-[#475569] hover:text-[#020617] " +
            (filters.tab === tab.value ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#004BB8]" : "")}>
          {tab.label}
        </Link>)}
      </nav>
      <form action={basePath} method="get" className="flex min-w-0 flex-wrap items-end gap-3 py-3 lg:flex-nowrap lg:gap-2 xl:gap-3">
        <input type="hidden" name="tab" value={filters.tab} />
        {typeof raw.directory === "string" ? <input type="hidden" name="directory" value={raw.directory.slice(0, 1000)} /> : null}
        <label className="flex w-full min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569] sm:w-[calc(50%_-_6px)] lg:w-[150px] lg:shrink-0 xl:w-[165px]">
          From (UTC)
          <input type="date" name="from" defaultValue={filters.from} className={inputClass} aria-label="Activity start date UTC" />
        </label>
        <label className="flex w-full min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569] sm:w-[calc(50%_-_6px)] lg:w-[150px] lg:shrink-0 xl:w-[165px]">
          To (UTC)
          <input type="date" name="to" defaultValue={filters.to} className={inputClass} aria-label="Activity end date UTC" />
        </label>
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-[calc(50%_-_6px)] lg:w-[155px] lg:shrink-0 xl:w-[170px]">
          <span className="text-[12px] font-medium text-[#475569]">Product</span>
          <AdminDirectorySelect name="product" label="Activity product" value={filters.product}
            options={[{value:"all", label:"All products"}, {value:"FLIGHT", label:"Flights"}, {value:"HOTEL", label:"Hotels"}, {value:"CAR", label:"Cars"}, {value:"PACKAGE", label:"Packages"}]} compact />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-[calc(50%_-_6px)] lg:w-[175px] lg:shrink-0 xl:w-[205px]">
          <span className="text-[12px] font-medium text-[#475569]">Activity type</span>
          <AdminDirectorySelect name="stage" label="Activity event type" value={filters.stage}
            options={[{value:"all", label:"All activity types"}, {value:"SEARCH_COMPLETED", label:"Search completed"}, {value:"RESULTS_VIEWED", label:"Results viewed"}, {value:"OFFER_SELECTED", label:"Offer selected"}, {value:"PROVIDER_HANDOFF_STARTED", label:"Provider handoff"}, {value:"ACCOUNT_ACTIVITY", label:"Account activity"}]} compact />
        </div>
        <label className="flex w-full min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569] sm:flex-1 lg:min-w-[150px] xl:min-w-[170px]">
          Search within activity
          <span className="relative block"><Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-[#94A3B8]" />
            <input name="q" defaultValue={filters.q} maxLength={80} placeholder="Route, destination, provider..." className={inputClass + " pl-9"} /></span>
        </label>
        <button type="submit" className="focus-ring h-10 w-full shrink-0 whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-semibold text-white hover:bg-[#004BB8]/90 sm:w-auto">Apply Filter</button>
      </form>
    </section>

    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <ActivityTimeline events={data.events} nextHref={nextHref} environment={environment} />
      <aside className="min-w-0 space-y-5" aria-label="Customer details">
        <section className="border-b border-[#D8E1EC] pb-4">
          <h2 className="border-b border-[#E7ECF5] pb-3 text-[15px] font-semibold text-[#020617]">Identity details</h2>
          <dl className="mt-3 grid gap-3">
            {data.role ? <Field label="Account role">{data.role}</Field> : null}
            <Field label="Analytics consent">{kind === "guest" ? "Granted" : "Required for linked guest events"}</Field>
            <Field label="Products on this page">
              {productsInPage.length ? <div className="flex flex-wrap gap-3">{productsInPage.map(product => <span key={product} className="inline-flex items-center gap-1 text-[12px] text-[#475569]"><ProductIcon product={product} /> {product}</span>)}</div> : "—"}
            </Field>
          </dl>
        </section>
        <section className="border-b border-[#D8E1EC] pb-3">
          <h2 className="border-b border-[#E7ECF5] pb-3 text-[15px] font-semibold text-[#020617]">Related records</h2>
          <div className="divide-y divide-[#E7ECF5]">
            {[
              { label: "View all searches", href: searchesHref, help: "Searches attributed to this identity" },
              { label: "View journeys", href: journeysHref, help: "Consented journeys and recorded stages" },
              { label: "View provider handoffs", href: handoffsHref, help: "Outbound provider referral records" },
            ].map(item => <Link key={item.href} href={item.href} className="focus-ring flex items-center justify-between gap-2 rounded-sm py-3 hover:text-[#004BB8]">
              <span className="min-w-0"><span className="block text-[13px] font-medium text-[#020617]">{item.label}</span><span className="mt-1 block text-[12px] text-[#475569]">{item.help}</span></span>
              <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-[#004BB8]" />
            </Link>)}
          </div>
        </section>
        <section>
          <h2 className="text-[15px] font-semibold text-[#020617]">About this activity</h2>
          <p className="mt-2 text-[12px] leading-5 text-[#475569]">Only recorded {environment} events are displayed. Guest activity requires ongoing analytics consent. Provider handoffs are not proof of a booking or payment.</p>
          <p className="mt-2 text-[12px] leading-5 text-[#475569]">Unlinked historical records are shown separately; missing stages are not inferred. Internal notes have not been enabled.</p>
        </section>
      </aside>
    </div>
  </div>;
}
