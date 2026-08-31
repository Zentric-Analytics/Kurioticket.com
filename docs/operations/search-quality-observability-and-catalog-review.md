# Search quality observability and catalogue review

The Phase 7 foundation does not transmit analytics and does not change a deployed catalogue. `createDiscoveryQualityInstrumentation()` is disabled unless an application explicitly supplies a sink. No sink is configured in this repository.

## Privacy-reviewed event boundary

The versioned event contains only product, coarse outcome/source/count/rank/latency buckets, match tier, recovery classification and static-coverage classification. It cannot accept raw query text, labels, location IDs, coordinates, account/session/device identifiers, IP addresses, provider payloads, precise timestamps or browsing history. Sink failures are swallowed so discovery remains functional.

Production activation is a separate privacy/legal/operations release decision. Before supplying a sink, owners must:

1. document purpose, lawful basis, retention, aggregation threshold, access ownership and deletion process;
2. complete privacy and security review, including regional consent requirements;
3. verify the sink cannot enrich these events with identity, precise time, URL/referrer or raw provider data;
4. establish dashboards and alerts using aggregated cohorts only, with minimum-volume suppression;
5. test disabled, degraded and sink-failure behavior, then obtain named product/privacy/operations approval;
6. record a kill switch and rollback owner. Removing the sink must immediately restore no-op behavior.

## Catalogue request and candidate workflow

`CatalogReviewManifest` is the file/interface boundary for missing-location requests or ingestion candidates. A future feedback endpoint may construct a candidate only after abuse, privacy and retention review; the current UI must not imply that feedback is sent. No database schema or admin UI is introduced.

Candidate lifecycle is `proposed → needs-evidence → approved → promoted → rolled-back`. Candidates may also be rejected with a reason. Promotion cannot be reached directly from proposed. Approved candidates require evidence references; rejected and rolled-back candidates require a decision reason. IDs are deterministic from normalized kind and submitted value, duplicate IDs fail validation, and review reports sort promotable IDs and expose counts without claiming availability.

The example manifest is `config/location-catalog/review-manifest.example.json`. Operators validate and review evidence, licensing, labels, aliases, coordinates/codes where applicable, duplicate identity, and product-specific static coverage. Promotion remains a separate small catalogue PR with focused search/URL tests, a release owner and an identified previous catalogue version. Rollback reverts that promotion PR; it never rewrites request history.

## Ownership and release gates

- Data/catalogue owner: evidence, licensing, identity resolution and static-coverage truth.
- Search product owner: recovery copy, ranking impact and URL/form compatibility.
- Privacy/security owner: event activation and retention/access controls.
- Operations owner: sink health, aggregation, kill switch, catalogue release and rollback.

Release requires a valid deterministic report, zero unresolved duplicate IDs, explicit approval evidence, focused matching/form tests, build/type checks, visible desktop/responsive validation and—when available—physical mobile validation. Static catalogue coverage never implies provider inventory or live availability.

