"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminPageShell";
import type { HomepageCmsSection } from "@/lib/adminHomepageCms";
import { getCmsUnpublishedChangeLabel } from "@/lib/adminCmsPublicationStatus";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";
import { ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { CmsEditorActions, type CmsEditorAction } from "@/components/admin/CmsEditorActions";
import { CmsLocationCombobox } from "@/components/admin/CmsLocationCombobox";
import { CmsExpandingTextField } from "@/components/admin/CmsExpandingTextField";
import { HomepageDestinationDraftPreview } from "@/components/admin/HomepageDestinationDraftPreview";
import { CmsRouteHotelDraftPreview } from "@/components/admin/CmsRouteHotelDraftPreview";
import type { CmsLocationOption } from "@/lib/adminCmsLocationOptions";

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
  publishedPayload: unknown;
  publishedMarket: string | null;
  publishedLocale: string | null;
  publishedSortOrder: number | null;
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

const editorControlClass = "h-9 rounded-lg border border-slate-300 bg-white text-[13px] font-normal text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus:border-[#004BB8]/40 focus:ring-2 focus:ring-[#004BB8]/15 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700";

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
  // Typing a new hotel search clears the draft ID, but the prior selected ID
  // must survive until selection so a different hotel cannot inherit its image.
  const selectedHotelIdRef = useRef(text(saved.canonicalId));
  const [hotelSearch, setHotelSearch] = useState(() =>
    hotelOptions.find((option) => option.canonicalId === text(saved.canonicalId))?.label
    ?? text(saved.canonicalId)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<CmsEditorAction | null>(null);

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
  const validMarket = section === "hotel-destinations" || markets.includes(market);
  const validDraft = validMarket && validateClientDraft(section, currentPayload, sortOrder);
  const unpublishedLabel = item ? getCmsUnpublishedChangeLabel(item) : null;

  function setField(name: string, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  function selectCountry(option: CmsLocationOption) {
    setFields((current) => ({
      ...current,
      country: option.value,
      ...(option.countryCode ? { countryCode: option.countryCode } : {}),
    }));
  }

  function selectCity(option: CmsLocationOption) {
    setFields((current) => ({
      ...current,
      city: option.value,
      ...(option.country ? { country: option.country } : {}),
      ...(option.countryCode ? { countryCode: option.countryCode } : {}),
    }));
  }

  function applyHotelOption(canonicalId: string) {
    const option = hotelOptions.find((entry) => entry.canonicalId === canonicalId);
    if (!option) {
      setField("canonicalId", canonicalId);
      return;
    }
    setHotelSearch(option.label);
    const previousCanonicalId = selectedHotelIdRef.current;
    selectedHotelIdRef.current = option.canonicalId;
    setFields((current) => ({
      ...current,
      canonicalId: option.canonicalId,
      name: option.name,
      ...(previousCanonicalId && previousCanonicalId !== option.canonicalId ? { image: "", imageAlt: "" } : {}),
      country: option.country,
      countryCode: option.countryCode,
      kind: option.kind,
      searchValue: option.searchValue,
    }));
  }

  function createDraft() {
    if (!validDraft || pending) return;
    setMessage(null);
    setError(null);
    setConflict(false);
    setActiveAction("create_draft");
    startTransition(async () => {
      try {
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
      } catch {
        setError("Unable to create draft. Check your connection and try again.");
      }
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
    if (!item || pending || !window.confirm("Archive this content? Archived content cannot be edited in this CMS phase.")) return;
    mutate("archive", {}, "Content archived.");
  }

  function mutate(
    action: "save_draft" | "publish" | "hide" | "archive",
    extra: Record<string, unknown>,
    success: string,
  ) {
    if (!item || pending) return;
    setMessage(null);
    setError(null);
    setActiveAction(action);
    startTransition(async () => {
      try {
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
          const serverError = typeof body.error === "string" ? body.error : "Unable to update content.";
          // A dependency/duplicate conflict is not a stale edit. Show the
          // actionable server reason without incorrectly offering Reload.
          const staleVersion = response.status === 409 &&
            /changed since it was opened|changed concurrently|refresh before|another admin session/i.test(serverError);
          setConflict(staleVersion);
          setError(staleVersion
            ? "This content changed in another admin session. Reload the latest version before making more edits."
            : serverError);
          return;
        }
        setConflict(false);
        setItem(body.item as CmsItem);
        setMarket(body.item.market ?? market);
        setSortOrder(String(body.item.sortOrder ?? Number(sortOrder)));
        setMessage(success);
        router.refresh();
      } catch {
        setError("Unable to update content. Check your connection and try again.");
      }
    });
  }

  const archived = item?.status === "ARCHIVED";

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-14">
      <section className="w-full min-w-0 max-w-[640px] space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <ContentSectionHeading>Content details</ContentSectionHeading>
            {item ? <ContentStatusPill status={item.status} /> : null}
          </div>
          <p className="mt-1 text-[13px] text-[#64748B]">Structured CMS content only. Save draft before publishing changes.</p>
        </div>

        {section !== "hotel-destinations" ? (
          <Field label="Market" className="max-w-[320px]">
            <AdminSelect className={editorControlClass} value={market} onChange={(event) => setMarket(event.target.value)} disabled={pending || archived} required>
              {!item ? <option value="">Select market</option> : null}
              {markets.map((value) => <option key={value} value={value}>{getCmsMarketName(value)}</option>)}
            </AdminSelect>
          </Field>
        ) : null}

        {section === "destinations" ? (
          <>
            <CmsLocationCombobox label="City" kind="city" value={fields.city ?? ""} countryCode={fields.countryCode ?? ""} onChange={(value) => setField("city", value)} onSelect={selectCity} disabled={pending || archived} className="max-w-[320px]" />
            <CmsLocationCombobox label="Country" kind="country" value={fields.country ?? ""} onChange={(value) => setFields((current) => ({ ...current, country: value, ...(value !== current.country ? { countryCode: "" } : {}) }))} onSelect={selectCountry} disabled={pending || archived} className="max-w-[320px]" />
            <div className="grid max-w-[512px] gap-4 sm:grid-cols-3 sm:items-start">
              <TextField label="Country code" name="countryCode" fields={fields} setField={setField} disabled={pending || archived} className="min-w-0" />
              <CmsLocationCombobox label="Origin IATA" kind="airport" value={fields.originCode ?? ""} onChange={(value) => setField("originCode", value)} disabled={pending || archived} className="min-w-0" />
              <CmsLocationCombobox label="Destination IATA" kind="airport" value={fields.destinationCode ?? ""} onChange={(value) => setField("destinationCode", value)} disabled={pending || archived} className="min-w-0" />
            </div>
            <CmsExpandingTextField label="Image" value={fields.image ?? ""} onChange={(value) => setField("image", value)} disabled={pending || archived} />
            <CmsExpandingTextField label="Image alt text" value={fields.imageAlt ?? ""} onChange={(value) => setField("imageAlt", value)} disabled={pending || archived} />
          </>
        ) : null}

        {section === "flight-routes" ? (
          <>
            <TextField label="Title" name="title" fields={fields} setField={setField} disabled={pending || archived} className="max-w-[448px]" />
            <div className="grid max-w-[496px] gap-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-start">
              <CmsLocationCombobox label="Origin city" kind="city" value={fields.originCity ?? ""} onChange={(value) => setField("originCity", value)} disabled={pending || archived} className="min-w-0" />
              <CmsLocationCombobox label="Origin IATA" kind="airport" value={fields.originCode ?? ""} onChange={(value) => setField("originCode", value)} disabled={pending || archived} className="min-w-0" />
              <CmsLocationCombobox label="Destination city" kind="city" value={fields.destinationCity ?? ""} onChange={(value) => setField("destinationCity", value)} disabled={pending || archived} className="min-w-0" />
              <CmsLocationCombobox label="Destination IATA" kind="airport" value={fields.destinationCode ?? ""} onChange={(value) => setField("destinationCode", value)} disabled={pending || archived} className="min-w-0" />
            </div>
            <Field label="Route note" className="max-w-[480px]">
              <AdminTextarea className={`${editorControlClass} h-auto min-h-24`} value={fields.routeNote ?? ""} onChange={(event) => setField("routeNote", event.target.value)} disabled={pending || archived} />
            </Field>
            <CmsExpandingTextField label="Image" value={fields.image ?? ""} onChange={(value) => setField("image", value)} disabled={pending || archived} />
            <CmsExpandingTextField label="Image alt text" value={fields.imageAlt ?? ""} onChange={(value) => setField("imageAlt", value)} disabled={pending || archived} />
          </>
        ) : null}

        {section === "hotel-destinations" ? (
          <>
            <CmsLocationCombobox
              label="Canonical hotel destination"
              kind="hotel"
              value={hotelSearch}
              selectedValue={fields.canonicalId ?? ""}
              hotelOptions={hotelOptions}
              onChange={(value) => {
                setHotelSearch(value);
                setField("canonicalId", "");
              }}
              onSelect={(option) => applyHotelOption(option.value)}
              disabled={pending || archived || item?.publishedVersion != null}
              className="max-w-[448px]"
            />
            <p className="max-w-[560px] text-[12px] leading-5 text-[#64748B]">
              {item?.publishedVersion != null
                ? "Canonical identity is locked after publication. Edit the display name or image here; create a new draft to manage a different destination."
                : "Choose a canonical destination to fill its trusted hotel-search details. Existing destinations cannot be duplicated."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" name="name" fields={fields} setField={setField} disabled={pending || archived} className="max-w-[320px]" />
              <CmsLocationCombobox label="Country" kind="country" value={fields.country ?? ""} onChange={(value) => setFields((current) => ({ ...current, country: value, ...(value !== current.country ? { countryCode: "" } : {}) }))} onSelect={selectCountry} disabled className="max-w-[320px]" />
              <TextField label="Country code" name="countryCode" fields={fields} setField={setField} disabled className="max-w-[160px]" />
              <Field label="Kind" className="max-w-[160px]">
                <AdminSelect className={editorControlClass + " cursor-pointer"} value={fields.kind ?? ""} onChange={(event) => setField("kind", event.target.value)} disabled>
                  {["city", "district", "landmark", "airport-area", "custom"].map((kind) => <option key={kind} value={kind}>{kind === "airport-area" ? "Airport area" : kind.charAt(0).toUpperCase() + kind.slice(1)}</option>)}
                </AdminSelect>
              </Field>
            </div>
            <TextField label="Search value" name="searchValue" fields={fields} setField={setField} disabled />
            <p className="text-[12px] leading-5 text-[#64748B]">Country, country code, type and search value come from the canonical catalogue and are read-only to keep public hotel searches reliable.</p>
            <CmsExpandingTextField label="Image (optional)" value={fields.image ?? ""} onChange={(value) => setField("image", value)} disabled={pending || archived} />
            <CmsExpandingTextField label="Image alt text (optional)" value={fields.imageAlt ?? ""} onChange={(value) => setField("imageAlt", value)} disabled={pending || archived} />
          </>
        ) : null}

        <Field label={section === "hotel-destinations" ? "Directory order" : "Order"} className="max-w-[128px]">
          <AdminInput className={editorControlClass} type="number" min={0} max={100000} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} disabled={pending || archived} />
        </Field>
        {section === "hotel-destinations" ? (
          <p className="text-[12px] leading-5 text-[#64748B]">Directory order controls the CMS listing and its published hotel reference order. Homepage Popular Stays cards retain their own curated order.</p>
        ) : null}

        <CmsEditorActions
          status={item?.status}
          pendingAction={pending ? activeAction : null}
          validDraft={validDraft}
          draftDirty={draftDirty}
          onCreate={createDraft}
          onSave={saveDraft}
          onPublish={publish}
          onHide={hide}
          onArchive={archive}
        />

        {section === "hotel-destinations" && item?.status === "PUBLISHED" ? (
          <p className="text-[12px] leading-5 text-[#64748B]">Hiding or archiving a hotel destination used by a published homepage card is blocked to prevent unexpectedly removing that card.</p>
        ) : null}
        {item && draftDirty ? <p className="text-[13px] leading-5 text-amber-700">Save this draft before publishing the current edits.</p> : null}
        {message ? <p className="text-[13px] leading-5 text-emerald-700" role="status">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] leading-5 text-rose-700" role="alert">{error}</p> : null}
        {conflict ? (
          <AdminButton type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reload latest
          </AdminButton>
        ) : null}
      </section>

      {section === "destinations" ? (
        <HomepageDestinationDraftPreview
          payload={currentPayload}
          marketName={getCmsMarketName(market)}
          order={sortOrder}
          version={item?.version}
          publishedVersion={item?.publishedVersion}
          unpublishedLabel={unpublishedLabel}
          unsaved={draftDirty}
        />
      ) : (
        <CmsRouteHotelDraftPreview
          section={section}
          payload={currentPayload}
          marketName={getCmsMarketName(section === "hotel-destinations" ? "GLOBAL" : market)}
          order={sortOrder}
          version={item?.version}
          publishedVersion={item?.publishedVersion}
          unpublishedLabel={unpublishedLabel}
          unsaved={draftDirty}
        />
      )}
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className="block min-h-5 text-[13px] font-medium leading-5 text-[#475569]">{label}</span><div className="mt-1.5">{children}</div></label>;
}

function TextField({
  label,
  name,
  fields,
  setField,
  disabled,
  className = "max-w-[448px]",
}: {
  label: string;
  name: string;
  fields: Record<string, string>;
  setField: (name: string, value: string) => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <AdminInput className={editorControlClass} value={fields[name] ?? ""} onChange={(event) => setField(name, event.target.value)} disabled={disabled} />
    </Field>
  );
}
