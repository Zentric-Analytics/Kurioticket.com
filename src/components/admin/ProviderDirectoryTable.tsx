"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";

export type ProviderStatusTone = "good" | "bad" | "warn" | "neutral";

export type ProviderDirectoryRecord = {
  id: string;
  name: string;
  products: string;
  shortLabel: string | null;
  readiness: { label: string; tone: ProviderStatusTone };
  health: { label: string; tone: ProviderStatusTone };
  lastActivity: { text: string; iso: string | null };
  detail: {
    environment: string;
    configured: string;
    search: string;
    booking: string;
    externalHandoff: string | null;
    lastSuccess: { text: string; iso: string | null };
    lastFailure: { text: string; iso: string | null };
    note: string;
  };
  canRetestDuffel: boolean;
};

const headingClass = "px-3 py-3 text-left text-[12px] font-medium uppercase text-[#475569]";
const cellClass = "px-3 py-3 align-middle text-[13px] text-[#020617]";

const tones: Record<ProviderStatusTone, { text: string; dot: string }> = {
  good: { text: "text-emerald-700", dot: "bg-emerald-500" },
  bad: { text: "text-rose-700", dot: "bg-rose-500" },
  warn: { text: "text-amber-700", dot: "bg-amber-500" },
  neutral: { text: "text-[#475569]", dot: "bg-slate-400" },
};

function Status({ label, tone }: { label: string; tone: ProviderStatusTone }) {
  const style = tones[tone];
  return <span className={"inline-flex items-center gap-1.5 text-[12px] font-medium " + style.text}>
    <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + style.dot} aria-hidden="true" />
    {label}
  </span>;
}

function Time({ value }: { value: { text: string; iso: string | null } }) {
  return value.iso
    ? <time dateTime={value.iso} className="whitespace-nowrap tabular-nums">{value.text}</time>
    : <span className="text-[12px] text-[#64748B]">{value.text}</span>;
}

function Fact({ label, value }: { label: string; value: string | { text: string; iso: string | null } }) {
  return <div className="min-w-0">
    <dt className="text-[12px] text-[#64748B]">{label}</dt>
    <dd className="mt-1 text-[13px] text-[#020617]">
      {typeof value === "string" ? value : <Time value={value} />}
    </dd>
  </div>;
}

/** The provider row is always short; configuration and retest controls appear
 * only after explicit disclosure, without navigating away from the table. */
export function ProviderDirectoryTable({ rows }: { rows: ProviderDirectoryRecord[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <div className="mt-2 min-w-0 overflow-x-auto" role="region"
    aria-labelledby="provider-directory" tabIndex={0}>
    <table className="w-full min-w-[820px] table-fixed text-left text-[13px]">
      <caption className="sr-only">
        Provider product coverage, readiness, search health and recent activity.
        Expand a provider for configuration, diagnostic timestamps and supported actions.
      </caption>
      <colgroup>
        <col className="w-[29%]" />
        <col className="w-[18%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
        <col className="w-[19%]" />
      </colgroup>
      <thead className="border-b border-[#D8E1EC]">
        <tr>
          <th scope="col" className={headingClass}>Provider</th>
          <th scope="col" className={headingClass}>Products</th>
          <th scope="col" className={headingClass}>Readiness</th>
          <th scope="col" className={headingClass}>Health</th>
          <th scope="col" className={headingClass}>Last activity</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E7ECF5]">
        {rows.map(row => {
          const open = expanded === row.id;
          return <Fragment key={row.id}>
            <tr className="hover:bg-[#F8FAFC]">
              <th scope="row" className={cellClass + " font-normal"}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{row.name}</span>
                  <button type="button"
                    aria-controls={"provider-details-" + row.id}
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : row.id)}
                    className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                    {open ? "Hide details" : "Details"}
                    <ChevronDown aria-hidden="true" size={13} className={open ? "rotate-180" : ""} />
                  </button>
                </div>
                {row.shortLabel ? <span className="mt-0.5 block text-[12px] leading-4 text-[#64748B]">{row.shortLabel}</span> : null}
              </th>
              <td className={cellClass}>{row.products}</td>
              <td className={cellClass}><Status {...row.readiness} /></td>
              <td className={cellClass}><Status {...row.health} /></td>
              <td className={cellClass}><Time value={row.lastActivity} /></td>
            </tr>
            <tr id={"provider-details-" + row.id} hidden={!open} className="bg-white">
              <td colSpan={5} className="border-l-2 border-[#004BB8] px-4 py-4">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Fact label="Environment" value={row.detail.environment} />
                  <Fact label="Credentials" value={row.detail.configured} />
                  <Fact label="Search" value={row.detail.search} />
                  <Fact label="Booking" value={row.detail.booking} />
                  {row.detail.externalHandoff !== null
                    ? <Fact label="External handoff" value={row.detail.externalHandoff} />
                    : null}
                  <Fact label="Last success" value={row.detail.lastSuccess} />
                  <Fact label="Last failure" value={row.detail.lastFailure} />
                </dl>
                {row.detail.note ? (
                  <p className="mt-3 text-[12px] leading-5 text-[#475569]">{row.detail.note}</p>
                ) : null}
                {row.canRetestDuffel ? (
                  <div className="mt-3 flex min-w-0 flex-wrap items-start gap-x-4 gap-y-2 border-t border-[#E7ECF5] pt-3">
                    <ProviderRetestButton />
                    <p className="max-w-xl text-[12px] leading-5 text-[#64748B]">
                      A retest makes a real Duffel health request and records an admin audit event.
                      It does not verify booking readiness.
                    </p>
                  </div>
                ) : null}
              </td>
            </tr>
          </Fragment>;
        })}
      </tbody>
    </table>
  </div>;
}
