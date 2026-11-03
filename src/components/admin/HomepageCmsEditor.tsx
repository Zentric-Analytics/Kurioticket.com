"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminPageShell";
import type { HomepageCmsSection } from "@/lib/adminHomepageCms";
import { ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";

type CmsItem = {
  id: string;
  key: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  locale: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  draftPayload: unknown;
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

const sectionType = {
  destinations: "HOMEPAGE_DESTINATION",
  "flight-routes": "FLIGHT_ROUTE",
  "hotel-destinations": "HOTEL_DESTINATION",
} as const;

function payloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function HomepageCmsEditor({
  section,
  markets,
  initialMarket,
  initialItem,
  hotelOptions = [],
  listQuery = "",
}: {
  section: HomepageCmsSection;
  markets: readonly string[];
  initialMarket: string;
  initialItem?: CmsItem;
  hotelOptions?: HotelOption[];
  listQuery?: string;
}) {
  const router = useRouter();
  const saved = useMemo(() => payloadRecord(initialItem?.draftPayload), [initialItem]);
  const [item, setItem] = useState<CmsItem | undefined>(initialItem);
  const [market, setMarket] = useState(initialItem?.market ?? initialMarket);
  const [sortOrder, setSortOrder] = useState(String(initialItem?.sortOrder ?? 0));
  const [fields, setFields] = useState<Record<string, string>>(() => initialFields(section, saved));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentPayload = buildPayload(section, fields);
  const savedPayload = initialFields(section, payloadRecord(item?.draftPayload));
  const draftDirty = Boolean(
    item &&
    (
      JSON.stringify(currentPayload) !== JSON.stringify(buildPayload(section, savedPayload)) ||
      Number(sortOrder) !== item.sortOrder ||
      market !== item.market
    )
  );
  const validDraft = validateClientDraft(section, currentPayload, sortOrder);
  const unpublished = Boolean(
    item?.publishedVersion !== null &&
    item?.publishedVersion !== undefined &&
    item.version !== item.publishedVersion,
  );

  function setField(name: string, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  function applyHotelOption(canonicalId: string) {
    const option = hotelOptions.find((entry) => entry.canonicalId === canonicalId);
    if (!option) {
      setField("canonicalId", canonicalId);
      return;
    }
    setFields((current) => ({
      ...current,
      canonicalId: option.canonicalId,
      name: option.name,
      country: option.country,
      countryCode: option.countryCode,
      kind: option.kind,
      searchValue: option.searchValue,
    }));
  }

  function createDraft() {
    if (!validDraft) return;
    setMessage(null);
    setError(null);
    setConflict(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: sectionType[section],
          key: `${section.replaceAll("-", "")}-${crypto.randomUUID()}`,
          market: section === "hotel-destinations" ? "GLOBAL" : market,
          locale: "en",
          sortOrder: Number(sortOrder),
          payload: currentPayload,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item?.id) {
        setError(typeof body.error === "string" ? body.error : "Unable to create draft.");
        return;
      }
      router.replace(`/admin/content/homepage/${section}/${encodeURIComponent(body.item.id)}${listQuery ? "?" + listQuery : ""}`);
      router.refresh();
    });
  }

  function saveDraft() {
    if (!item || !validDraft) return;
    mutate("save_draft", {
      payload: currentPayload,
      market: section === "hotel-destinations" ? "GLOBAL" : market,
      locale: "en",
      sortOrder: Number(sortOrder),
    }, "Draft saved.");
  }

  function publish() {
    if (!item || !validDraft || draftDirty) return;
    mutate("publish", {}, "Content published.");
  }

  function hide() {
    if (!item) return;
    mutate("hide", {}, "Content hidden from the public scope.");
  }

  function archive() {
    if (!item || !window.confirm("Archive this content? Archived content cannot be edited in this CMS phase.")) return;
    mutate("archive", {}, "Content archived.");
  }

  function mutate(
    action: "save_draft" | "publish" | "hide" | "archive",
    extra: Record<string, unknown>,
    success: string,
  ) {
    if (!item) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedVersion: item.version,
          ...extra,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item) {
        if (response.status === 409) {
          setConflict(true);
          setError("This content changed in another admin session. Reload the latest version before making more edits.");
        } else {
          setError(typeof body.error === "string" ? body.error : "Unable to update content.");
        }
        return;
      }
      setConflict(false);
      setItem(body.item as CmsItem);
      setMarket(body.item.market ?? market);
      setSortOrder(String(body.item.sortOrder ?? Number(sortOrder)));
      setMessage(success);
      router.refresh();
    });
  }

  const archived = item?.status === "ARCHIVED";

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-14 [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:h-9 [&_select]:h-9 [&_input]:text-[13px] [&_select]:text-[13px] [&_textarea]:text-[13px] [&_input]:font-normal [&_select]:font-normal">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <ContentSectionHeading>{item ? "Edit content" : "Create draft"}</ContentSectionHeading>
            <p className="mt-1 text-[13px] text-[#64748B]">Structured CMS content only. Save draft before publishing changes.</p>
          </div>
          {item ? <ContentStatusPill status={item.status} /> : null}
        </div>

        {section !== "hotel-destinations" ? (
          <Field label="Market">
            <AdminSelect value={market} onChange={(event) => setMarket(event.target.value)} disabled={pending || archived}>
              {markets.map((value) => <option key={value} value={value}>{value}</option>)}
            </AdminSelect>
          </Field>
        ) : null}

        {section === "destinations" ? (
          <>
            <TextField label="City" name="city" fields={fields} setField={setField} disabled={pending || archived} />
            <TextField label="Country" name="country" fields={fields} setField={setField} disabled={pending || archived} />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Country code" name="countryCode" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Origin IATA" name="originCode" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Destination IATA" name="destinationCode" fields={fields} setField={setField} disabled={pending || archived} />
            </div>
            <TextField label="Image" name="image" fields={fields} setField={setField} disabled={pending || archived} />
            <TextField label="Image alt text" name="imageAlt" fields={fields} setField={setField} disabled={pending || archived} />
          </>
        ) : null}

        {section === "flight-routes" ? (
          <>
            <TextField label="Title" name="title" fields={fields} setField={setField} disabled={pending || archived} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Origin city" name="originCity" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Origin IATA" name="originCode" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Destination city" name="destinationCity" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Destination IATA" name="destinationCode" fields={fields} setField={setField} disabled={pending || archived} />
            </div>
            <Field label="Route note">
              <AdminTextarea value={fields.routeNote ?? ""} onChange={(event) => setField("routeNote", event.target.value)} disabled={pending || archived} />
            </Field>
            <TextField label="Image" name="image" fields={fields} setField={setField} disabled={pending || archived} />
            <TextField label="Image alt text" name="imageAlt" fields={fields} setField={setField} disabled={pending || archived} />
          </>
        ) : null}

        {section === "hotel-destinations" ? (
          <>
            <Field label="Canonical hotel destination">
              <AdminSelect value={fields.canonicalId ?? ""} onChange={(event) => applyHotelOption(event.target.value)} disabled={pending || archived}>
                <option value="">Select canonical destination</option>
                {hotelOptions.map((option) => <option key={option.canonicalId} value={option.canonicalId}>{option.label}</option>)}
              </AdminSelect>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" name="name" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Country" name="country" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Country code" name="countryCode" fields={fields} setField={setField} disabled={pending || archived} />
              <TextField label="Kind" name="kind" fields={fields} setField={setField} disabled={pending || archived} />
            </div>
            <TextField label="Search value" name="searchValue" fields={fields} setField={setField} disabled={pending || archived} />
            <TextField label="Image (optional)" name="image" fields={fields} setField={setField} disabled={pending || archived} />
            <TextField label="Image alt text (optional)" name="imageAlt" fields={fields} setField={setField} disabled={pending || archived} />
          </>
        ) : null}

        <Field label="Order">
          <AdminInput type="number" min={0} max={100000} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} disabled={pending || archived} />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-4 [&_button]:rounded-lg [&_button]:text-[13px] [&_button]:font-medium [&_button]:shadow-none">
          {!item ? (
            <AdminButton type="button" onClick={createDraft} loading={pending} disabled={!validDraft}>Create draft</AdminButton>
          ) : !archived ? (
            <>
              <AdminButton type="button" variant="secondary" onClick={saveDraft} loading={pending} disabled={!validDraft}>Save draft</AdminButton>
              <AdminButton type="button" onClick={publish} loading={pending} disabled={!validDraft || draftDirty}>Publish</AdminButton>
              {item.status === "PUBLISHED" ? <AdminButton type="button" variant="secondary" onClick={hide} loading={pending}>Hide</AdminButton> : null}
              <AdminButton type="button" variant="destructive" onClick={archive} loading={pending}>Archive</AdminButton>
            </>
          ) : null}
        </div>

        {item && draftDirty ? <p className="text-sm font-bold text-amber-700">Save this draft before publishing the current edits.</p> : null}
        {message ? <p className="text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
        {conflict ? (
          <AdminButton type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reload latest
          </AdminButton>
        ) : null}
      </section>

      <aside className="h-fit min-w-0 lg:sticky lg:top-24">
        <ContentSectionHeading>Draft preview</ContentSectionHeading>
        <h2 className="mt-2 text-[15px] font-semibold text-[#111827]">{previewTitle(section, currentPayload)}</h2>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-[#475569]">{previewDetail(section, currentPayload)}</p>
        <div className="mt-4 grid gap-2 border-t border-[#E5E7EB] pt-4 text-[12px] text-[#64748B]">
          <span>Market: {section === "hotel-destinations" ? "GLOBAL" : market}</span>
          <span>Order: {sortOrder || "0"}</span>
          {item ? <span>Draft v{item.version} · Published {item.publishedVersion ? `v${item.publishedVersion}` : "none"} · Unpublished changes: {unpublished ? "yes" : "no"}</span> : null}
        </div>
      </aside>
    </div>
  );
}

function initialFields(
  section: HomepageCmsSection,
  raw: Record<string, unknown>,
): Record<string, string> {
  if (section === "destinations") {
    return {
      city: text(raw.city),
      country: text(raw.country),
      countryCode: text(raw.countryCode),
      originCode: text(raw.originCode),
      destinationCode: text(raw.destinationCode),
      image: text(raw.image),
      imageAlt: text(raw.imageAlt),
    };
  }
  if (section === "flight-routes") {
    return {
      title: text(raw.title),
      originCity: text(raw.originCity),
      originCode: text(raw.originCode),
      destinationCity: text(raw.destinationCity),
      destinationCode: text(raw.destinationCode),
      routeNote: text(raw.routeNote),
      image: text(raw.image),
      imageAlt: text(raw.imageAlt),
    };
  }
  return {
    name: text(raw.name),
    country: text(raw.country),
    countryCode: text(raw.countryCode),
    kind: text(raw.kind, "city"),
    searchValue: text(raw.searchValue),
    canonicalId: text(raw.canonicalId),
    image: text(raw.image),
    imageAlt: text(raw.imageAlt),
  };
}

function buildPayload(section: HomepageCmsSection, fields: Record<string, string>) {
  if (section === "destinations") {
    return {
      city: fields.city?.trim() ?? "",
      country: fields.country?.trim() ?? "",
      ...(fields.countryCode?.trim() ? { countryCode: fields.countryCode.trim().toUpperCase() } : {}),
      destinationCode: fields.destinationCode?.trim().toUpperCase() ?? "",
      originCode: fields.originCode?.trim().toUpperCase() ?? "",
      image: fields.image?.trim() ?? "",
      imageAlt: fields.imageAlt?.trim() ?? "",
    };
  }
  if (section === "flight-routes") {
    return {
      title: fields.title?.trim() ?? "",
      originCity: fields.originCity?.trim() ?? "",
      originCode: fields.originCode?.trim().toUpperCase() ?? "",
      destinationCity: fields.destinationCity?.trim() ?? "",
      destinationCode: fields.destinationCode?.trim().toUpperCase() ?? "",
      routeNote: fields.routeNote?.trim() ?? "",
      image: fields.image?.trim() ?? "",
      imageAlt: fields.imageAlt?.trim() ?? "",
    };
  }
  return {
    name: fields.name?.trim() ?? "",
    country: fields.country?.trim() ?? "",
    countryCode: fields.countryCode?.trim().toUpperCase() ?? "",
    kind: fields.kind?.trim() ?? "",
    searchValue: fields.searchValue?.trim() ?? "",
    canonicalId: fields.canonicalId?.trim() ?? "",
    ...(fields.image?.trim() ? { image: fields.image.trim() } : {}),
    ...(fields.imageAlt?.trim() ? { imageAlt: fields.imageAlt.trim() } : {}),
  };
}

function validateClientDraft(section: HomepageCmsSection, payload: Record<string, unknown>, sortOrder: string) {
  const order = Number(sortOrder);
  if (!Number.isInteger(order) || order < 0) return false;
  const required =
    section === "destinations"
      ? ["city", "country", "destinationCode", "originCode", "image", "imageAlt"]
      : section === "flight-routes"
        ? ["title", "originCity", "originCode", "destinationCity", "destinationCode", "routeNote", "image", "imageAlt"]
        : ["name", "country", "countryCode", "kind", "searchValue", "canonicalId"];
  return required.every((key) => typeof payload[key] === "string" && String(payload[key]).trim().length > 0);
}

function previewTitle(section: HomepageCmsSection, payload: Record<string, unknown>) {
  if (section === "destinations") return String(payload.city || "Destination");
  if (section === "flight-routes") return String(payload.title || "Flight route");
  return String(payload.name || "Hotel destination");
}

function previewDetail(section: HomepageCmsSection, payload: Record<string, unknown>) {
  if (section === "destinations") return `${payload.country || ""} · ${payload.originCode || ""} → ${payload.destinationCode || ""}`;
  if (section === "flight-routes") return `${payload.originCity || ""} (${payload.originCode || ""}) → ${payload.destinationCity || ""} (${payload.destinationCode || ""})\n${payload.routeNote || ""}`;
  return `${payload.country || ""} · ${payload.searchValue || ""}\n${payload.canonicalId || ""}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[12px] font-medium text-[#64748B]">{label}</span><div className="mt-2">{children}</div></label>;
}

function TextField({
  label,
  name,
  fields,
  setField,
  disabled,
}: {
  label: string;
  name: string;
  fields: Record<string, string>;
  setField: (name: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field label={label}>
      <AdminInput value={fields[name] ?? ""} onChange={(event) => setField(name, event.target.value)} disabled={disabled} />
    </Field>
  );
}
