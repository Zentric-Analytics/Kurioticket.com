# Activity tracking foundation

Phase 1 uses the existing customer page-view writer, Visitor consent records, journey and business event stores, Admin Audit Logs and authorized Users Directory readers. The audit at `598bef7cbe9dc51aade5923023f7483c479c9a91` contains 1,085 coverage rows across admin web, customer web, iOS and Android. The coverage registry records that revision and the three source sheet digests.

## Event contract

| Category | Authority and purpose | History handling |
| --- | --- | --- |
| Page and screen visits | Consent-scoped observation of an approved destination on customer desktop web, mobile web, iOS or Android. The current writer resolves the account or eligible Visitor and validates the key for the transport. | Existing `PAGE_VIEW` storage and readers. The original identity is recorded. |
| Subsections and behavioral interactions | An approved committed control on the same page, such as a native Home product selection or an eligible product filter. | Use the existing page or journey producer according to the meaning of the event. New capture remains deferred. |
| Business actions | The service that owns the action decides whether it succeeded, failed or was rejected. Existing essential search and handoff accounting has its own limited scope. | Keep existing records, journey correlations and deduplication. A payment, external provider outcome or account action can only be credited if its source establishes it. |
| Administrative actions and security audit | Use an authorized session and the existing audit authority. Actor, subject, action and outcome are distinct. | Preserve the existing Audit Logs reader and access controls. Behavioral monitoring requires a separate approval and activation. |
| Device and access evidence | Existing authorized session, consented device evidence or operational observation. | Retain Device & Access. Access evidence does not add an intentional navigation or action to the chronology. |

A navigation occurrence has a stable UUID reused on retry. The page or section identifier is a closed key, distinct from the occurrence. A committed destination and previous key describe navigation only when supported by the adapter. The current pathname observers and previous-key fields are observations, so stronger commitment and provenance assertions require Phase 2. Each event belongs to the receiving deployment. Search and journey identifiers require the existing server validation against exact identity, product, environment and recorded source. User-provided targets, raw URLs, request headers, device similarity, times, location and IP addresses cannot determine ownership.

The server-verified account is the actor on both interfaces. A verified administrator's customer visits retain the same account ID and the Customer interface. A future administrative observation obtains the admin actor through the admin guard. A customer ID from the route is a subject. It carries no actor authority. Stable registered and guest identities are scoped to the existing app and consent protections. Guest-at-occurrence provenance remains guest if that record later becomes visible through a verified exclusive link. Retain legacy original ownership columns and leave rows that cannot be safely reconciled outside the registered page reader.

## Implemented changes

- The registered page writer verifies the same active, verified account, consented Visitor and exclusive claim that its reader requires. The client consent flows already establish that claim before enabling registered capture. A request with an incomplete or conflicting claim creates no page row and cannot start a claim on its own.
- Existing row locks serialize duplicate delivery. Lookup uses the Visitor, deployment and occurrence UUID. A replay from the same actor is idempotent. A replay crossing guest-to-account context with the same UUID cannot recreate or enrich the previous occurrence. Existing valid search enrichment and visitor lifecycle locking are retained.
- Customer page rows retain Customer and original registered/guest provenance. Older page rows use the original event owner, including in linked Journey Details. These changes do not rewrite historical rows. The previous page and safe click-through rules remain closed to approved keys. The previous key must match the current transport.
- Visitor-backed analytics require current consent and an exclusive account link in the registered timeline. Visitor-free essential and compatible historical business records remain eligible. Explicit optional records and legacy optional types or names require their Visitor evidence. The Directory’s period count, listing and Last Seen use the same rule for direct account events. Essential search, handoff and session evidence still use their existing sources.
- Withdrawal suppresses optional visibility and new collection. No new retention duration, purge, retroactive association, migration, event producer, product integration or employee monitoring was added.

## Coverage review

`config/activity-tracking/definitions.json` declares the route inventory, existing event families and exclusions. An observed route has a source path into an existing observer. Deferred entries and proposed event families do not activate capture. The dynamic legal web route is partially mapped through three approved literal keys.

Run these locally and in the required PR gate.

```bash
node --test scripts/check-activity-coverage.test.mjs
node scripts/check-activity-coverage.mjs
```

The check detects source routes and recognizable navigation, subsection, action and audit candidates. On a route addition, declare its disposition and give an explicit reason for any exclusion. On an action or navigation addition, use the emitted file and candidate ID in `reviews` with either the applicable activity definition or the reason for exclusion. This includes additional occurrences of an audited expression in the same file.

The guard checks the declared revision and sheet metadata against the original Phase 1 values and reconstructs the signal inventory directly from the pinned Git objects. It rejects a missing audited commit or any difference in the checked-in manifest. Run it from a clone that contains the audited commit. The required `Validate mobile preview` job uses a full-history checkout and invokes coverage validation even when mobile tests are skipped.

A PR can also change validation code, dependencies or the workflow itself. The required status check alone does not authenticate those files. Protect changes to those inputs through repository review rules or require a workflow maintained outside the proposed revision.

A search for unrecognized navigation and comparison with the 1,085-row inventory still belong in review for dynamic routes, custom event wrappers, permission states and in-app behavior. The check establishes that discovered surfaces have coverage declarations. Live capture requires separate verification.

## Reliability and database baseline

The local benchmark used a fresh PostgreSQL 16 container with the repository's 81 existing migrations and refreshed statistics, 41 synthetic registered accounts, one verified Visitor and 10,000 AnalyticsEvent rows. It exercised the real page handler, identity resolver, consent lock and database adapter, with an injected verified session for the account and no HTTP network transport. The reader benchmark used the actual SQL and Prisma readers with 20-row pages. Sixteen timed repetitions followed one warmup per operation. Single-host synthetic measurements do not set a production service objective.

| Synthetic operation | Audited p50 / p95 (ms) | Phase 1 p50 / p95 (ms) | SQL reads / writes |
| --- | ---: | ---: | ---: |
| Eligible page POST | 11.00 / 14.08 | 8.44 / 16.93 | 6 / 2 |
| Same-ID page replay | 7.19 / 9.36 | 5.98 / 8.27 | 6 / 1 |
| Cross-site rejected POST | 0.07 / 0.16 | 0.07 / 0.19 | 0 / 0 |
| Users Directory first 20 | 5.70 / 19.87 | 8.53 / 9.88 | 1 / 0 |
| Users Directory second 20 | 5.84 / 14.20 | 8.98 / 12.39 | 1 / 0 |
| All Activity first 20 | 61.92 / 70.37 | 61.12 / 76.64 | 15 / 0 |
| All Activity second 20 | 57.45 / 64.06 | 61.80 / 83.54 | 15 / 0 |
| Pages Visited at offset 80 | 33.06 / 39.42 | 33.73 / 38.05 | 4 / 0 |

Both runs accepted all eligible deliveries and rejected all 16 cross-site deliveries. The Phase 1 concurrency check returned one persisted row for repeated deliveries. In the same disposable database, the withdrawal check retained the synthetic historical rows and suppressed their optional projections. Directory query planning initially crossed PostgreSQL's JIT threshold with the correlated visibility predicate. The final eligible-Visitor join and refreshed fixture statistics avoided that cost in the measured plan. The sample shows mixed tail latency and a higher Directory median, so include larger and cold-statistics histories in staging measurements before increasing collection.

On the local production Next.js builds, the FAQ HTML response p50/p95 was 21.4/27.1 ms before and 17.2/22.3 ms after. Its RSC navigation response was 9.1/38.6 ms before and 15.3/22.6 ms after over 16 requests per arm. These timings measure local server responses. The mounted Chromium fixtures verify the disclosure UI. Full browser navigation timing was unavailable because the app's bot ingress correctly identified the headless runtime.

The database has single-field analytics indexes for type, user, Visitor, name and timestamp. The existing unique expression index covers any stored event ID, including page visits. Phase 1 uses that expression for the scoped page lookup. There is no new index or schema change. The new page write remains a Visitor last-seen update plus the insert, and a same-ID replay retains only the existing last-seen update. No new client wait, polling or delivery worker was introduced. A verified browser navigation latency comparison and deployed delivery-rate baseline still require an approved isolated run.

## Staging verification before Phase 2

Use a disposable environment with a staging-equivalent database, dedicated test sessions and provider/email side effects disabled. Verify the exact web SHA and adopted Preview binaries/OTA before recording results. Use seeded active accounts, a separate administrator and customer, independent guest sessions, and both eligible and declined analytics. Browser refresh and app foreground can generate their normal existing optional activity only for these test identities.

1. Open the customer homepage, product results/detail and mapped customer account/support screens with fresh eligible web and native sessions. Verify a page appears in the actor's Activity and Pages Visited. Check exact journey matching by an eligible search reference and use a mismatched reference as a negative control.
2. Race registered page capture with a not-yet-linked Visitor in the fixture. Confirm no pre-link row, one post-link row, and stable same-ID replay while requests are concurrent. Verify a guest visit predating claim still displays as guest and the old occurrence cannot be replayed as registered after claim. Switch to another account on the same browser and confirm no cross-account rows.
3. Use the same verified administrator on a customer mapped page. Verify the event appears under that account with customer provenance. Open another person's Activity as the administrator and verify no navigation event is attributed to the customer. Admin navigation observation remains disabled. On an approved disposable admin action, confirm the audit records the session actor and separate subject. Confirm an unprivileged session is rejected and creates no audit row.
4. Seed opted-in page, journey and optional account interaction evidence plus a confirmed essential save or alert. Withdraw consent. Confirm optional rows and optional-derived Last Seen disappear from applicable Activity, Pages, Journeys and Directory reads. Verify the essential account record remains exactly once. Confirm historical storage and deletion semantics follow the existing policy. Repeat with a declined guest to confirm only approved essential accounting is eligible.
5. Compare dated Directory totals and listing identifiers, cursor continuation in All Activity, separate Pages Visited offset pages, Device & Access, Online Users and existing journey counts. Include mixed environments and equal timestamps. Confirm an exact source in the other environment cannot link or display.
6. Check desktop, mobile web, iOS and Android separately. Use fixture provider inventory for existing flight, hotel, car and package search, edits, saves, sharing, alerts and handoffs. Verify established account and admin navigation with no new event sources. Measure click-to-destination and event response/rejection under the same synthetic data before and after. Record adopted build IDs and distinguish real application evidence from fixture results.

## Phase 2 gates

The next phase needs approval for new route/action collection, including a written employee monitoring purpose, communication, viewer permissions and applicable retention restrictions before enabling any admin navigation observation. Document policy for historical optional visibility and automated retention separately from this visibility fix. No retention duration is imposed here. Reconcile scope for admin Audit Logs projection by actor and verify restricted subject fields remain behind their current authorization.

Known remaining work includes the customer web Price Alerts mapping, unmapped package and account sections, same-template occurrence capture on web and native, reliable web page-view delivery, stronger route commitment and previous-section evidence, and new meaningful-action coverage. Existing tracker tests and CI do not substitute for the isolated end-to-end staging checks above.
