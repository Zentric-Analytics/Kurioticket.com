# Guest Activity and country: staging repair

## Intended behavior

The Online Users **View Activity** action uses the same overview and full Activity
workspace as Users Directory. An anonymous live session can open a recorded guest
only when it presents an already-issued, server-verified history credential. The
temporary roster reference, country, device, browser and timestamps are never used
to guess a historical owner.

| Evidence on the accepted heartbeat | Destination |
| --- | --- |
| Existing consented, unlinked Visitor credential | That Visitor's canonical guest Activity |
| Existing signed operational search credential and matching recorded history | That operational session's canonical guest Activity |
| No eligible credential or no recorded operational history yet | Shared Activity layout showing current verified access and unavailable history |
| Expired/stale/ambiguous reference | Shared unavailable state |

Operational history remains separate from consented page views, saved/shared
activity and journeys. The full Activity interface keeps the same controls and
categories; unsupported categories are visibly disabled. Missing data is not
reported as a measured zero. Registered-account identity and authorization are
unchanged.

## Ownership and lifecycle

- Staging-only association fields live on `OnlinePresenceSession`: kind, existing
  owner ID, observation time and expiry. They contain no credential or token hash.
- Presence still uses its own memory-only signed credential. History proof neither
  creates the presence identity nor changes online counts. Initial credential
  bootstrap performs no history lookup or write.
- Web reuses existing cookies. Updated native clients forward existing memory
  credentials only to the exact staging origin and only from an explicit guest
  context. Native operational proof requires a matching platform-bound v2 token.
- A Visitor lookup is read-only and requires current consent, enabled tracking,
  no current account and no identity links. It does not touch `Visitor.lastSeenAt`.
  Consent and ownership are checked again while holding a Visitor row lock through
  the accepted presence write, then checked again before Admin navigation.
- Guest owner, account state and heartbeat time are written atomically. Missing or
  invalid proof clears the tuple, including below the ordinary write throttle.
  Older writes cannot restore it. At equal timestamps, clearing and account
  promotion take precedence. Optional-write fallback keeps presence available and
  invalidates the earlier optional observation; an exact tie advances its logical
  observation by one millisecond without allowing an account downgrade.
- Admin navigation requires a fresh 90-second row, exact observation timestamp,
  unexpired proof, and current source eligibility. Freshness is checked again after
  asynchronous database reads. Target IDs remain outside the generic roster API.
- The canonical Activity reader refuses an existing but ineligible Visitor before
  attempting operational lookup, preventing a source change after withdrawal.
- Expired/stale owner tuples are cleared by bounded best-effort cleanup. Inactive
  presence rows use the existing 15-minute retention sweep. Eligibility never
  depends on cleanup succeeding or on deletion occurring at an exact deadline.

## Country and device behavior

Recorded guest device/browser observations were introduced by PR #6991. This
repair makes the corresponding existing history reachable from a verified live
guest. An old record lacking device/browser evidence remains unavailable; no
historical device values are fabricated or backfilled.

Country activation is independent of history ownership and first-access preview.
The approved staging settings are:

```text
GUEST_LIVE_COUNTRY_ENABLED=true
GUEST_LIVE_RENDER_INGRESS_VERIFIED=true
GUEST_FIRST_ACCESS_PREVIEW=false
```

The ingress flag records the reviewed staging network assumption. Render's public
Cloudflare ingress owns the connecting-IP header; Render private callers do not
pass through that public edge. The reviewed workspace had only first-party trusted
private callers. Reassess that assumption if workspace membership, private callers,
regions, preview services or network routing change.

Country lookup uses the existing IPinfo Lite configuration, with a short deadline,
bounded concurrency/cache and country-only presence storage. This processes a
verified public IP even for an operational guest who declines optional analytics;
it does not require or grant analytics consent. Missing trusted evidence or lookup
failure leaves country unavailable while presence continues.

The shared public-IP classifier now uses numeric subnet checks. Expanded/compressed
IPv6, IPv4-mapped private addresses, zone IDs and reserved ranges receive consistent
validation. Legacy Teredo/6to4 ranges with non-affirmative global reachability are
conservatively excluded. Ordinary public IPv4/IPv6 remain supported.

## Release and verification gates

1. Apply the additive nullable-column migration through the existing staging
   deployment pipeline. It remains compatible with the preceding web release.
2. Pass focused server/native ownership tests, root/mobile typechecks, production
   web build, secret/migration checks, and all required PR workflows.
3. Run actual PostgreSQL lifecycle/source/consent tests in disposable CI storage.
   Do not treat their local skip without a database as a successful database test.
4. Run the Activity browser suite using synthetic data: registered, consented guest,
   operational guest, unlinked live guest and expired reference at six viewport
   widths. Verify filters, links, metrics and canonical redirect destinations.
5. Save the approved country settings for the staging service after gates pass,
   then let the existing preview-release worker own web deployment and any
   compatible iOS/Android OTA. Do not create manual native builds or edit its ledger.
6. Verify the actual served commit, migration, health and safe country diagnostics.
   Check current presence only through Admin-safe output or aggregate read-only
   database queries. Do not inject fake platform presence into staging.

Old installed native bundles continue to work but cannot supply new history headers
until the compatible update is installed. A new server release alone does not prove
that every physical iOS/Android installation has updated. Report native update
publication separately from observed physical-device verification.

Rollback of country capture is setting both country flags to `false` for the next
staging deployment. No historical backfill must be undone. The nullable ownership
columns can remain when rolling web/client code back; older code does not read them
and normal presence retention removes inactive rows. Production activation requires
its own explicit rollout decision.

## References

- [Render public and private request paths](https://render.com/articles/host-pocketbase-on-render)
- [Render private networking](https://render.com/docs/private-network)
- [Render environment-variable deployment behavior](https://render.com/docs/configure-environment-variables)
- [IPinfo Lite](https://ipinfo.io/developers/lite-api)
- [IANA IPv4 special-purpose registry](https://www.iana.org/assignments/iana-ipv4-special-registry/)
- [IANA IPv6 special-purpose registry](https://www.iana.org/assignments/iana-ipv6-special-registry/)
