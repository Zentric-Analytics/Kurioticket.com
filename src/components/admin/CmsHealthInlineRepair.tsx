"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { X } from "lucide-react";

import { requestCmsDiscard } from "@/lib/cmsNavigationGuard";
import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";
import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";

type HomepageItem = NonNullable<ComponentProps<typeof HomepageCmsEditor>["initialItem"]>;
type FaqItem = NonNullable<ComponentProps<typeof FaqCmsEditor>["initialItem"]>;

type SupportedFlightRoute = {
  originCode: string;
  destinationCode: string;
};

type HotelOption = {
  canonicalId: string;
  label: string;
  name: string;
  country: string;
  countryCode: string;
  kind: string;
  searchValue: string;
};

type Props = {
  type: "HOMEPAGE_DESTINATION" | "FLIGHT_ROUTE" | "HOTEL_DESTINATION" | "FAQ";
  itemId: string;
  recordKey: string;
  markets: readonly string[];
  hotelOptions: HotelOption[];
  supportedFlightRoutes: SupportedFlightRoute[];
  onClose: () => void;
};

export function CmsHealthInlineRepair({
  type,
  itemId,
  recordKey,
  markets,
  hotelOptions,
  supportedFlightRoutes,
  onClose,
}: Props) {
  const [result, setResult] = useState<{ itemId: string; item: HomepageItem | FaqItem | null; error: string | null } | null>(null);
  const loading = result?.itemId !== itemId;
  const item = loading ? null : result?.item;
  const error = loading ? null : result?.error;

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/content/${encodeURIComponent(itemId)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.item) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Unable to load this CMS record.",
          );
        }
        return body.item as HomepageItem | FaqItem;
      })
      .then((nextItem) => {
        if (!cancelled) setResult({ itemId, item: nextItem, error: null });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setResult({ itemId, item: null, error: reason instanceof Error ? reason.message : "Unable to load this CMS record." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return (
    <section
      aria-label={`Repair ${recordKey}`}
      className="mt-5 border-t border-[#D8E1EC] pt-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-[14px] font-semibold text-[#020617]">
            Repair {recordKey}
          </h4>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Correct the record here. Save the draft and publish when needed; CMS Health refreshes after the update.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { if (requestCmsDiscard()) onClose(); }}
          className="focus-ring inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#D8E1EC] bg-white px-2.5 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC]"
        >
          <X size={13} aria-hidden="true" />
          Close repair
        </button>
      </div>

      {loading ? (
        <p className="py-5 text-[13px] text-[#64748B]" role="status">
          Loading CMS record…
        </p>
      ) : error ? (
        <p className="py-3 text-[13px] font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : item ? (
        <div className="pt-1">
          {type === "FAQ" ? (
            <FaqCmsEditor key={item.id} initialItem={item as FaqItem} />
          ) : (
            <HomepageCmsEditor
              key={item.id}
              section={
                type === "HOMEPAGE_DESTINATION"
                  ? "destinations"
                  : type === "FLIGHT_ROUTE"
                    ? "flight-routes"
                    : "hotel-destinations"
              }
              markets={markets}
              initialMarket={item.market}
              initialItem={item as HomepageItem}
              hotelOptions={hotelOptions}
              supportedFlightRoutes={supportedFlightRoutes}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
