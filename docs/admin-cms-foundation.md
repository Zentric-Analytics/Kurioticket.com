# Admin CMS foundation

This foundation moves Kurioticket toward a database-backed, audited content management system without switching public surfaces away from the existing code-backed content yet.

## Content types

The first CMS schema supports:

- `HOMEPAGE_DESTINATION`
- `FLIGHT_ROUTE`
- `HOTEL_DESTINATION`
- `FAQ`

Each content type has a strict server-side payload schema. Arbitrary HTML, JavaScript, CSS, and unstructured executable content are not accepted.

## Lifecycle

A content item stores both:

- `draftPayload` — the latest editable draft
- `publishedPayload` — the last explicitly published version

Supported states are:

- `DRAFT`
- `PUBLISHED`
- `HIDDEN`
- `ARCHIVED`

Saving a new draft never destroys the last published payload or changes its published market, locale, order, or visibility. Draft scope fields are separate from the last published scope. Public readers continue to serve the last published payload in its last published scope until an explicit publish, unless the item is hidden or archived.

Archive is intentionally terminal in this foundation. Restore/revision rollback can be added later using the revision snapshots.

## Versions and concurrency

Every mutation requires an `expectedVersion`.

Mutations use an optimistic version predicate inside a serializable transaction. If another admin has changed the item since it was opened, the update returns a conflict instead of silently overwriting newer work.

Every mutation increments the version.

## Revision history

Every successful mutation writes an immutable `CmsContentRevision` in the same transaction as the content change.

A revision snapshots both:

- draft payload and draft scope
- published payload and published scope

This preserves enough state for a future restore-version workflow, including the case where a published item has newer unpublished draft edits.

## Audit logging

Every successful CMS mutation also writes an `AdminAuditLog` row in the same transaction.

Initial actions are:

- `CMS_CONTENT_CREATED`
- `CMS_CONTENT_UPDATED`
- `CMS_CONTENT_PUBLISHED`
- `CMS_CONTENT_HIDDEN`
- `CMS_CONTENT_ARCHIVED`

The audit metadata contains safe identifiers and lifecycle fields, not the full content payload.

## Authorization

All CMS APIs use the existing canonical `requireAdminApiSession()` guard.

Draft creation and draft editing require ADMIN access.

On production, publish/hide/archive additionally require recent trusted reauthentication. Staging keeps the normal ADMIN boundary so content workflows can be tested safely.

## Public reads and fallback

`publicCmsContentService.ts` provides typed readers for each first-phase content type.

The public reader:

1. reads only rows with a real published payload,
2. excludes hidden and archived content,
3. validates stored published payloads again before returning them,
4. adds the stable CMS key as the public content id,
5. falls back to the existing code-backed datasets if the CMS database is unavailable, no CMS content has ever been published for that scope, or stored published content fails validation. Once a scope has published CMS ownership, hidden/archived rows keep that scope CMS-owned; if every item is hidden/archived, the public result is intentionally empty rather than resurrecting legacy fallback content.

Phase 1 intentionally does not import this service into the live public homepage or FAQ screens. Surface-by-surface migration happens in later CMS phases after the foundation is proven.

## Admin APIs

### Collection

`GET /api/admin/content`

Optional filters:

- `type`
- `status`
- `market`
- `locale`
- `limit` (1–100, default 50)
- `cursor`

List responses include `nextCursor`. Cursors are opaque and bound to the original filters; changing filters requires starting a new first-page request.

`POST /api/admin/content`

Creates a draft item.

### Item

`GET /api/admin/content/:id`

Returns the item plus recent revisions.

`PATCH /api/admin/content/:id`

Actions:

- `save_draft`
- `publish`
- `hide`
- `archive`

Every mutation requires `expectedVersion`.

## Deliberately deferred

Phase 1 does not yet add:

- editable admin forms
- preview UI
- revision restore UI
- media uploads
- drag-and-drop ordering
- public homepage migration
- public FAQ migration
- content-editor roles

Those belong to the later CMS phases after this storage, safety, and publishing boundary is stable.
