# Admin CMS production hardening

Phase 4 hardens the CMS introduced in Phases 1–3 without redesigning public surfaces.

## Revision restore

Historical revisions can be restored from the FAQ and homepage content detail pages.

Restore behavior is deliberately draft-only:

- the selected historical draft payload, market, locale and order are validated against current CMS rules;
- optimistic item versioning prevents a stale restore from overwriting newer work;
- restore creates a new immutable `RESTORED` revision and `CMS_CONTENT_RESTORED` audit event;
- the currently published payload and visibility remain unchanged;
- the administrator must explicitly Publish before restored content can become live.

Archived content remains terminal in this phase and cannot be restored in place.

## Scope health

`/admin/content/health` reports every active CMS scope with:

- invalid draft payloads;
- invalid published payloads;
- published-state records missing a published payload;
- duplicate draft order values;
- duplicate published order values;
- non-contiguous draft ordering;
- unpublished draft changes;
- legacy fallback policy state.

Health reads fail closed: unavailable CMS storage is shown as unavailable rather than healthy.

## Draft order normalization

Draft order normalization is scope-level and protected by `expectedScopeVersion`.

Normalization:

- sorts current non-archived draft records by the current order/key/id;
- rewrites draft order to a contiguous 0..N sequence;
- increments every changed item version;
- writes an immutable `ORDER_NORMALIZED` revision for each changed item;
- writes one `CMS_ORDER_NORMALIZED` admin audit event;
- does not change `publishedSortOrder` and therefore does not reorder production content automatically.

Each changed record must still be explicitly published to move its normalized order live.

## Legacy fallback policy

Each CMS scope now has a versioned, reversible legacy fallback policy.

Retiring fallback:

- requires recent trusted authentication in production;
- requires `expectedScopeVersion`;
- is blocked if published CMS payloads are invalid;
- is blocked if published order collisions exist;
- writes `CMS_LEGACY_FALLBACK_RETIRED` to Admin Logs.

Reactivation uses the same versioned boundary and writes `CMS_LEGACY_FALLBACK_REACTIVATED`.

When fallback is retired and a stored published payload fails validation, the CMS reader fails closed to an empty CMS result instead of resurrecting code-backed content. Database-level unavailability still retains the existing availability fallback because the retired scope cannot be safely read while storage itself is unavailable.

## Fallback monitoring

Public CMS readers emit structured operational log records under `[cms:public-fallback]` with one of these reasons:

- `storage_unavailable`
- `scope_uninitialized`
- `invalid_published_payload`
- `read_error`

This provides rollout visibility without adding a second CMS telemetry database.

## Concurrency recovery

FAQ and homepage editors now identify HTTP 409 conflicts as stale-edit conflicts and offer **Reload latest**.

Scope hardening actions use a separate scope version so two administrators cannot silently overwrite ordering or fallback-policy changes.

## Audit model

Phase 4 continues using the existing `AdminAuditLog` instead of creating a parallel CMS audit system.

New audit actions include:

- `CMS_CONTENT_RESTORED`
- `CMS_ORDER_NORMALIZED`
- `CMS_LEGACY_FALLBACK_RETIRED`
- `CMS_LEGACY_FALLBACK_REACTIVATED`

CMS Health links directly to Admin Logs for investigation.
