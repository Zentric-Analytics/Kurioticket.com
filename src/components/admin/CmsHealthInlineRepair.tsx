"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { X } from "lucide-react";

import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";
import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";

type HomepageItem = NonNullable<ComponentProps<typeof HomepageCmsEditor>["initialItem"]>;
type FaqItem = NonNullable<ComponentProps<typeof FaqCmsEditor>["initialItem"]>;

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
  onClose: () => void;
};

export function CmsHealthInlineRepair({
  type,
  itemId,
  recordKey,
  markets,
  hotelOptions,
  onClose,
}: Props) {
  const [item, setItem] = useState<HomepageItem | FaqItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);

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
        if (!cancelled) setItem(nextItem);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load this CMS record.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
          onClick={onClose}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D8E1EC] bg-white px-2.5 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC]"
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
        <div className="rounded-lg border border-[#E7ECF5] bg-white p-4">
          {type === "FAQ" ? (
            <FaqCmsEditor initialItem={item as FaqItem} />
          ) : (
            <HomepageCmsEditor
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
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
