import { Info, Package, Users } from "lucide-react";

import type { ConfirmedTripsOperationsSnapshot } from "@/services/adminConfirmedTripsOperationsService";

type Props = { operations: ConfirmedTripsOperationsSnapshot | null };

const countFormat = new Intl.NumberFormat("en-US");
const timestampFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const productLabels: Record<string, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
  CAR: "Car",
  PACKAGE: "Package",
};

function BreakdownCount({ count }: { count: number }) {
  return (
    <span aria-label={countFormat.format(count) + " provider-confirmed trips"}
      className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-indigo-700">
      {countFormat.format(count)}
    </span>
  );
}

function BreakdownMessage({ title, text, icon: Icon }: {
  title: string;
  text: string;
  icon: typeof Info;
}) {
  return (
    <div role="status" className="mt-3 flex min-w-0 items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
      <div className="min-w-0">
        <p className="break-words text-xs font-semibold leading-5 text-slate-800">{title}</p>
        <p className="mt-0.5 break-words text-xs leading-5 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

/** No placeholder records are generated: a null snapshot and an empty snapshot are different states. */
export function ConfirmedTripsBreakdowns({ operations }: Props) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <section aria-labelledby="trips-by-product-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Package size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="trips-by-product-title" className="text-base font-semibold leading-6 text-slate-950">Confirmed trips by product</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Provider-confirmed trips grouped by product.</p>
          </div>
        </div>
        {!operations ? (
          <BreakdownMessage icon={Info} title="Product breakdown unavailable"
            text="Confirmed-trip records could not be loaded from the connected database. No counts are assumed." />
        ) : operations.byProduct.length ? (
          <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {operations.byProduct.map((item) => (
              <div key={item.tripType} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 break-words text-xs font-medium leading-5 text-slate-800">
                  {productLabels[item.tripType] || item.tripType}
                </span>
                <BreakdownCount count={item.count} />
              </div>
            ))}
          </div>
        ) : (
          <BreakdownMessage icon={Package} title="No provider-confirmed trips are recorded yet."
            text="A product breakdown will appear after accepted signed confirmations are recorded." />
        )}
      </section>

      <section aria-labelledby="trips-by-provider-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Users size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="trips-by-provider-title" className="text-base font-semibold leading-6 text-slate-950">Confirmed trips by provider</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Provider-confirmed trips grouped by provider.</p>
          </div>
        </div>
        {!operations ? (
          <BreakdownMessage icon={Info} title="Provider breakdown unavailable"
            text="Confirmed-trip records could not be loaded from the connected database. No providers or counts are assumed." />
        ) : operations.byProvider.length ? (
          <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {operations.byProvider.map((item) => (
              <div key={item.provider} className="flex min-w-0 items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-medium leading-5 text-slate-800">{item.provider}</p>
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-600">
                    {item.lastConfirmationAt ? "Last confirmation " + timestampFormat.format(new Date(item.lastConfirmationAt)) : "No timestamp"}
                  </p>
                </div>
                <BreakdownCount count={item.count} />
              </div>
            ))}
          </div>
        ) : (
          <BreakdownMessage icon={Users} title="No provider confirmation feed has produced a confirmed trip yet."
            text="A provider breakdown will appear after genuine signed confirmations are accepted." />
        )}
      </section>
    </div>
  );
}
