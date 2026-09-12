# KAYAK sandbox staging verification — September 12, 2026

## Environment and boundaries

Target: Kurioticket-web-staging in the user-confirmed Staging Workspace, branch
`dev`, https://staging.kurioticket.com. Production configuration is unchanged.
The renewed sandbox key is server-only. No real booking, checkout, payment,
customer-account change, or email was performed during these checks.

This integration covers the website, including responsive mobile web. It does
not claim native iOS/Android KAYAK search integration or production API approval.
Prices and availability are simulated, not live commercial inventory.

## Verified staging release

Release `08d2a8a99f7692b3a99f79f46c9b5d21ae66bcb5` became live after the build
worker correction. Browser badge matched. Two earlier failed deployments were
corrected: native SVG type leakage into the web-only install, and 47 page workers
exceeding Render's 8 GB build-memory limit. The corrected build uses two workers,
keeps type checking enabled, and requires no paid resource upgrade.

| Check | Observed result |
| --- | --- |
| Flight form to normal results route | BOS–JFK return, October 12–17, one adult: 425 simulated offers |
| Hotel lookup and normal results route | Boston selected from live sandbox lookup: 40 simulated offers, total-stay pricing |
| Car form to normal results route | BOS same-airport/noon rental: first request timed out safely; explicit retry returned 116 simulated offers with total pricing |
| Flight pagination | 20 cards expanded to 40; original 425-result status preserved |
| Click-out | Opened KAYAK's explicit sandbox-clickout page, not a booking flow |
| Empty search | Forced empty car search displayed no-results and no fabricated offers |
| Unsupported criteria | Business-class flight URL displayed the adults/economy-only rejection |
| Phone-width rendering | Flights, hotels and cars at 390×844: cards and labels readable, document width 375, no horizontal document overflow |
| Browser errors | No captured error-level console messages on the three result tabs |
| Health | HTTP 200 |
| Origin and body validation | Invalid origin 403; invalid body 400; both no-store and noindex |
| Production sandbox boundary | POST to the public production sandbox route returned 404 |

Counts are observations of sandbox inventory, not fixed expectations. The timeout
is a tested recoverable provider response, not a guarantee of uninterrupted KAYAK
availability. Search button disabled while requests were pending.

## Follow-up runtime findings

The final log review found PostgreSQL void-result deserialization during feature
control bootstrap, causing fallback evaluation. Bootstrap and mutation now execute
the same transaction-scoped lock without reading a void result row. Permission,
environment ownership and transaction behavior are retained.

A deliberate invalid forwarding-header probe returned the route's network-address
error, proving the previous first-XFF lookup was caller-influenced on this deployment.
The sandbox now selects Cloudflare's edge address only on Render and rejects missing
or malformed values. Unit tests cover spoofed forwarding values and fail-closed
behavior. These follow-up corrections still require deployment and fresh verification.

References for the deployment-specific network boundary:
- [Render public ingress and client addresses](https://render.com/articles/how-render-handles-ddos-attacks)
- [Cloudflare request-header behavior](https://developers.cloudflare.com/fundamentals/reference/http-headers/)

## Validation and limits

The worker-limit release passed 3,108 root tests and its full production build.
The subsequent feature-control correction passed 3,109 tests and build before
the edge-address correction was added. Final combined results are pending.
Earlier runtime and development dependency audits reported zero known findings.
Full lint had zero errors but 68 non-blocking warnings; those are not claimed fixed.
Broader standalone flight-detail localization remains outside the sandbox completion
claim, as recorded in the baseline validation report.

Per-client and per-vertical quotas remain in-process for this single-instance
staging preview. Scaling/public-production rollout needs shared limits and separate
partner approval. No production deployment or production KAYAK readiness is claimed.
