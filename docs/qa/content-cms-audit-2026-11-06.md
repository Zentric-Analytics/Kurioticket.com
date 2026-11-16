# Content CMS audit fixes — 6 November 2026

This follow-up covers the 18 findings in `Kurioticket_Content_CMS_Audit_2026-11-06.pdf`, on top of the deployed downward dropdown changes in PR #6750. The Content hub, Homepage overview, destination and flight directories, hotel directory, FAQ directory, new/edit forms, revision history and CMS Health were included.

| Finding | Resolution |
| --- | --- |
| 1. Paragraph validation | FAQ answers and route notes accept normal paragraph breaks; other control characters and multiline labels remain invalid. Browser and server share the same payload schemas. |
| 2. Unsaved navigation | New and existing forms, reorder mode and inline repair warn before discarding edits. Links, history traversal and tab closure are protected; in-flight operations block ordinary navigation. Revision restore locks the editor and all restore controls until it settles. |
| 3. Validation parity | Blank, fractional, negative and over-limit Order values fail client validation. All text limits and approved image rules match the server. Field-level API issues appear beside their controls and clear on correction. |
| 4. Duplicate hotels | Available canonical choices exclude identities owned by another active record. Matching managed destinations link to their editor; an all-managed state links to the directory. Backend uniqueness, canonical identity and publication dependency guards remain enforced. |
| 5. Reorder identification | Card labels and accessible movement controls include country and origin → destination IATA codes. |
| 6. Reorder dirty state | Dirty state compares the current ID sequence with its baseline. Moving a card back removes the warning and disables Save. |
| 7. FAQ ordering | The complete filtered FAQ directory is ordered by draft Order with deterministic tie-breakers before paging. Scoped keyset cursors preserve access beyond 100 records. Published order remains independent until publishing. |
| 8. Publication warnings | FAQ lists, FAQ editors and CMS Health compare actual draft/published content, order, market and locale snapshots. No-op version bumps do not create false warnings. |
| 9. Homepage overview scope | Destination and flight counts cover all supported markets and are labelled as published counts. Partial setup is detected across all markets. |
| 10. CMS Health counts | Scope counts are labelled “Total scopes” and grouped as scopes. |
| 11. Network failures | Restore, initialize and scope actions catch rejected requests, expose retry advice and leave pending state. |
| 12. Storage versus setup | Unavailable storage has contextual Retry controls. Missing and partial setup have separate messages and setup/health links. New-item pages retain their current context during outages. |
| 13. Older revisions | Version-keyset history pages expose older snapshots past the previous 50-revision limit. Restore continues to validate revision ownership, expected version, canonical identity and payload integrity. |
| 14. FAQ preview | Preview scrolls with the page and uses the existing content typography and paragraph presentation. |
| 15. Cursors | CMS action controls use a pointer; disabled controls retain not-allowed cursors. Text inputs and dropdown attachment/direction from #6750 are preserved. |
| 16. Unfinished copy | Archive confirmation explains that archived content cannot be edited or restored here. Editor and revision copy no longer refer to a temporary CMS phase. |
| 17. Stale feedback | Editing clears transient success and field errors. Success messages can be dismissed. Genuine version conflicts retain their reload advice. |
| 18. Airport empty states | Restricted selectors advise choosing a supported route; manual IATA advice appears only where manual entry is enabled. Airport search still accepts full airport/city names. |

## Validation

- `npm run test:cms`: 104 checks, including mounted React interactions, rejected network requests, pending restores, unsaved navigation, duplicate hotel choices, complete 120-revision traversal and FAQ paging through 205 records.
- The required PR gate runs this CMS suite.
- Prisma schema validation and client generation pass. No database migration is added.
- Changed TypeScript/TSX files pass lint; `npx tsc --noEmit` passes after generating Next route types.
- Production compilation, type checking and prerendering pass with the local Turbopack filesystem cache temporarily disabled to avoid a container cache failure. The original Next configuration is restored.
- Full-repository lint reports 55 existing errors and 25 warnings; none of its errors are in files changed by this PR.
- `CMS_QA_SMOKE=1 node qa/admin-content-cms/run.mjs`: all five fixture views compile and return HTTP 200. It renders real controls with synthetic records; its API handlers reject all writes.

Local DOM and mocked storage tests do not substitute for a deployed lifecycle check. No live content was created, published, hidden, archived or restored during this follow-up. Candidate desktop/mobile screenshots are not attached from this environment. After deployment, verify the normal draft → save → publish → hide flow on a disposable staging record and confirm the same paragraph text on the public surface.
