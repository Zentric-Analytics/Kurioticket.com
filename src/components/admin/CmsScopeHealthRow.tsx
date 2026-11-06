"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { CmsHealthInlineRepair } from "@/components/admin/CmsHealthInlineRepair";
import { CmsScopeHardeningActions } from "@/components/admin/CmsScopeHardeningActions";

type CmsType =
  | "HOMEPAGE_DESTINATION"
  | "FLIGHT_ROUTE"
  | "HOTEL_DESTINATION"
  | "FAQ";

type RecordIssue = {
  id: string;
  key: string;
  details?: string[];
};

type OrderCollision = {
  order: number;
  ids: string[];
  items?: Array<{ id: string; key: string }>;
};

type Integrity = {
  healthy: boolean;
  scopeVersion: number | null;
  legacyFallbackRetired: boolean;
  fallbackRetirementEligible: boolean;
  invalidDrafts: RecordIssue[];
  invalidPublished: RecordIssue[];
  orphanPublished: Array<{ id: string; key: string }>;
  draftOrderCollisions: OrderCollision[];
  publishedOrderCollisions: OrderCollision[];
  draftOrderNeedsNormalization: boolean;
  unpublishedChanges: number;
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
  type: CmsType;
  market: string;
  locale: string;
  marketName: string;
  localeName: string;
  integrity: Integrity;
  markets: readonly string[];
  hotelOptions: HotelOption[];
};

const tableCellClass =
  "px-3 py-3 align-middle text-[13px] text-[#020617]";

type RepairTarget = {
  id: string;
  key: string;
};

export function CmsScopeHealthRow({
  type,
  market,
  locale,
  marketName,
  localeName,
  integrity,
  markets,
  hotelOptions,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [repairTarget, setRepairTarget] = useState<RepairTarget | null>(null);
  const panelId = useId();

  const issueCount =
    integrity.invalidDrafts.length +
    integrity.invalidPublished.length +
    integrity.orphanPublished.length +
    integrity.draftOrderCollisions.length +
    integrity.publishedOrderCollisions.length +
    (integrity.draftOrderNeedsNormalization ? 1 : 0);

  const affectedPublishedCollisionRecords = useMemo(
    () =>
      integrity.publishedOrderCollisions.flatMap((collision) =>
        (collision.items ?? collision.ids.map((id) => ({ id, key: id }))).map(
          (item) => ({ ...item, order: collision.order }),
        ),
      ),
    [integrity.publishedOrderCollisions],
  );

  const toggleDetails = () => {
    setExpanded((current) => !current);
    if (expanded) setRepairTarget(null);
  };

  return (
    <>
      <tr className={expanded ? "bg-white" : "hover:bg-[#F8FAFC]"}>
        <th
          scope="row"
          className={tableCellClass + " text-left font-normal"}
        >
          <button
            type="button"
            onClick={toggleDetails}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="focus-ring group inline-flex max-w-full items-start gap-2 rounded-sm text-left"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{marketName}</span>
              <span className="mt-0.5 block text-[12px] text-[#64748B]">
                {localeName}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#94A3B8]">
                {market} · {locale} · v{integrity.scopeVersion ?? "—"}
              </span>
            </span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={
                expanded
                  ? "mt-0.5 shrink-0 rotate-180 text-[#64748B] transition-transform"
                  : "mt-0.5 shrink-0 text-[#64748B] transition-transform"
              }
            />
          </button>
        </th>

        <td className={tableCellClass}>
          <CmsStatusIndicator
            label={integrity.healthy ? "Healthy" : "Needs attention"}
            tone={integrity.healthy ? "good" : "warn"}
          />
        </td>

        <td className={tableCellClass + " text-[12px] leading-5 text-[#475569]"}>
          <button
            type="button"
            onClick={toggleDetails}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="focus-ring rounded-sm text-left hover:underline"
          >
            {integrity.healthy ? (
              <span>No issues</span>
            ) : (
              <span className="font-medium text-[#0F172A]">
                {issueCount} issue{issueCount === 1 ? "" : "s"}
              </span>
            )}
          </button>

          {!integrity.healthy ? (
            <div className="mt-0.5 space-y-0.5">
              {integrity.invalidDrafts.length > 0 ? (
                <p>
                  {integrity.invalidDrafts.length} invalid draft
                  {integrity.invalidDrafts.length === 1 ? "" : "s"}
                </p>
              ) : null}
              {integrity.invalidPublished.length > 0 ? (
                <p>{integrity.invalidPublished.length} invalid published</p>
              ) : null}
              {integrity.orphanPublished.length > 0 ? (
                <p>{integrity.orphanPublished.length} orphan published</p>
              ) : null}
              {integrity.draftOrderCollisions.length > 0 ? (
                <p>
                  {integrity.draftOrderCollisions.length} draft order collision
                  {integrity.draftOrderCollisions.length === 1 ? "" : "s"}
                </p>
              ) : null}
              {integrity.draftOrderNeedsNormalization ? (
                <p>Draft order needs normalization</p>
              ) : null}
              {integrity.publishedOrderCollisions.length > 0 ? (
                <p>
                  {integrity.publishedOrderCollisions.length} published order
                  collision
                  {integrity.publishedOrderCollisions.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ) : null}
        </td>

        <td className={tableCellClass}>
          {integrity.legacyFallbackRetired ? "Retired" : "Available"}
        </td>

        <td className={tableCellClass}>
          {integrity.unpublishedChanges === 0
            ? "None"
            : `${integrity.unpublishedChanges} change${integrity.unpublishedChanges === 1 ? "" : "s"}`}
        </td>
      </tr>

      {expanded ? (
        <tr id={panelId} className="bg-white">
          <td colSpan={5} className="p-0">
            <div className="border-l-[3px] border-[#004BB8] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#020617]">
                    {marketName} health details
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                    Review the detected problems and resolve them from this scope.
                  </p>
                </div>

                {integrity.scopeVersion ? (
                  <CmsScopeHardeningActions
                    type={type}
                    market={market}
                    locale={locale}
                    scopeVersion={integrity.scopeVersion}
                    legacyFallbackRetired={integrity.legacyFallbackRetired}
                    fallbackRetirementEligible={
                      integrity.fallbackRetirementEligible
                    }
                    draftOrderCollisionCount={
                      integrity.draftOrderCollisions.length
                    }
                    draftOrderNeedsNormalization={
                      integrity.draftOrderNeedsNormalization
                    }
                  />
                ) : null}
              </div>

              {integrity.healthy ? (
                <p className="mt-4 border-t border-[#E7ECF5] pt-4 text-[13px] text-[#475569]">
                  No integrity problems are currently detected for this scope.
                </p>
              ) : (
                <div className="mt-4 border-t border-[#E7ECF5]">
                  {integrity.invalidDrafts.map((issue) => (
                    <IssueRow
                      key={`draft:${issue.id}`}
                      recordKey={issue.key}
                      issue="Invalid draft"
                      details={
                        issue.details?.length
                          ? issue.details.join(" · ")
                          : "The draft payload does not satisfy CMS validation."
                      }
                      action={
                        <FixButton
                          active={repairTarget?.id === issue.id}
                          onClick={() =>
                            setRepairTarget({ id: issue.id, key: issue.key })
                          }
                        />
                      }
                    />
                  ))}

                  {integrity.invalidPublished.map((issue) => (
                    <IssueRow
                      key={`published:${issue.id}`}
                      recordKey={issue.key}
                      issue="Invalid published content"
                      details={
                        issue.details?.length
                          ? `${issue.details.join(" · ")} Review the draft and publish a valid replacement.`
                          : "The published snapshot is invalid. Review the draft and publish a valid replacement."
                      }
                      action={
                        <FixButton
                          active={repairTarget?.id === issue.id}
                          onClick={() =>
                            setRepairTarget({ id: issue.id, key: issue.key })
                          }
                        />
                      }
                    />
                  ))}

                  {integrity.orphanPublished.map((issue) => (
                    <IssueRow
                      key={`orphan:${issue.id}`}
                      recordKey={issue.key}
                      issue="Missing published snapshot"
                      details="This record is marked published but has no published payload. Review the draft and publish it again."
                      action={
                        <FixButton
                          active={repairTarget?.id === issue.id}
                          onClick={() =>
                            setRepairTarget({ id: issue.id, key: issue.key })
                          }
                        />
                      }
                    />
                  ))}

                  {integrity.draftOrderCollisions.map((collision) => (
                    <IssueRow
                      key={`draft-order:${collision.order}`}
                      recordKey={
                        collision.items?.map((item) => item.key).join(", ") ||
                        `${collision.ids.length} records`
                      }
                      issue="Draft order collision"
                      details={`Draft order ${collision.order} is assigned to more than one record.`}
                      action={
                        integrity.scopeVersion ? (
                          <CmsScopeHardeningActions
                            type={type}
                            market={market}
                            locale={locale}
                            scopeVersion={integrity.scopeVersion}
                            legacyFallbackRetired={
                              integrity.legacyFallbackRetired
                            }
                            fallbackRetirementEligible={
                              integrity.fallbackRetirementEligible
                            }
                            draftOrderCollisionCount={
                              integrity.draftOrderCollisions.length
                            }
                            draftOrderNeedsNormalization={
                              integrity.draftOrderNeedsNormalization
                            }
                            mode="normalize"
                          />
                        ) : null
                      }
                    />
                  ))}

                  {integrity.draftOrderNeedsNormalization ? (
                    <IssueRow
                      recordKey={marketName}
                      issue="Draft order needs normalization"
                      details="Draft ordering is not sequential for this scope."
                      action={
                        integrity.scopeVersion ? (
                          <CmsScopeHardeningActions
                            type={type}
                            market={market}
                            locale={locale}
                            scopeVersion={integrity.scopeVersion}
                            legacyFallbackRetired={
                              integrity.legacyFallbackRetired
                            }
                            fallbackRetirementEligible={
                              integrity.fallbackRetirementEligible
                            }
                            draftOrderCollisionCount={
                              integrity.draftOrderCollisions.length
                            }
                            draftOrderNeedsNormalization={
                              integrity.draftOrderNeedsNormalization
                            }
                            mode="normalize"
                          />
                        ) : null
                      }
                    />
                  ) : null}

                  {integrity.publishedOrderCollisions.map((collision) => (
                    <IssueRow
                      key={`published-order:${collision.order}`}
                      recordKey={
                        collision.items?.map((item) => item.key).join(", ") ||
                        `${collision.ids.length} records`
                      }
                      issue="Published order collision"
                      details={`Published order ${collision.order} is shared by multiple records. Adjust a draft order and republish the affected record.`}
                      action={
                        <div className="flex flex-wrap gap-1.5">
                          {(collision.items ??
                            affectedPublishedCollisionRecords.filter(
                              (item) => item.order === collision.order,
                            )
                          ).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setRepairTarget({ id: item.id, key: item.key })
                              }
                              className="focus-ring inline-flex h-8 items-center rounded-md border border-[#D8E1EC] bg-white px-2.5 text-[12px] font-medium text-[#020617] hover:bg-[#F8FAFC]"
                            >
                              Fix {item.key}
                            </button>
                          ))}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}

              {repairTarget ? (
                <CmsHealthInlineRepair
                  type={type}
                  itemId={repairTarget.id}
                  recordKey={repairTarget.key}
                  markets={markets}
                  hotelOptions={hotelOptions}
                  onClose={() => setRepairTarget(null)}
                />
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function FixButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex h-8 items-center rounded-md border border-[#D8E1EC] bg-white px-2.5 text-[12px] font-medium text-[#020617] hover:bg-[#F8FAFC]"
    >
      {active ? "Repair open" : "Fix"}
    </button>
  );
}

function IssueRow({
  recordKey,
  issue,
  details,
  action,
}: {
  recordKey: string;
  issue: string;
  details: string;
  action: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-[#E7ECF5] py-3 last:border-b-0 lg:grid-cols-[minmax(180px,0.8fr)_minmax(180px,0.8fr)_minmax(320px,1.8fr)_auto] lg:items-center lg:gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
          Record
        </p>
        <p className="mt-0.5 break-all text-[13px] font-medium text-[#020617]">
          {recordKey}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
          Issue
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-amber-700">{issue}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
          What needs fixing
        </p>
        <p className="mt-0.5 text-[12px] leading-5 text-[#475569]">{details}</p>
      </div>
      <div className="lg:justify-self-end">{action}</div>
    </div>
  );
}

function CmsStatusIndicator({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn";
}) {
  const text = tone === "good" ? "text-emerald-700" : "text-amber-700";
  const dot = tone === "good" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${text}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
      />
      {label}
    </span>
  );
}
