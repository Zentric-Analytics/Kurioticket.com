# Results refresh and Preview audit

Date: 2026-09-04  
Scope: flight results refresh behavior, flight/hotel/car results presentation, and Preview native loading. Production was not changed or exercised.

## Implemented contracts

- A matching flight-results snapshot remains usable for up to 30 minutes. When its provider-owned freshness expires, cards remain rendered while an exact-search background request refreshes them.
- Background refresh does not clear results, reset URL-owned filters or pagination, navigate, focus the blocking loader, or scroll the page. A refresh failure leaves the stale cards visible instead of replacing them with a blocking error.
- The selected mobile nearby-fare date is aligned only for the exact canonical search/date. Alignment retries while layout geometry is unavailable and rechecks visibility after resize, page restore, or document resume.
- The mobile compact results header now fades without translating, so its fixed geometry remains stable, and it cannot intercept input while Edit Search is open.
- The mobile-web audit helper selects the visible results heading when responsive layouts contain a hidden duplicate.

## Verification evidence

- Targeted Node tests: 38 passed, 0 failed.
- Mobile TypeScript and case-insensitive path validation: passed.
- Staging Chromium at 393 px: repeated Edit Search, overlay geometry, overflow, and scroll restoration passed for cars, flights, and hotels. Cars and flights passed the initial combined run; hotels passed after the audit selector was corrected.
- After PR #5026 merged, the Preview worker reported `COMPLETE` for merge `108ece645`, staging rendered that build identity, and the complete three-product Chromium 393 px audit passed again (3/3).
- Physical Moto g play (2023), Preview build 49, runtime `e7f1fa95934875ebe882fde5453fc924ca1846d1`, OTA `01a06ed2-6805-7566-b499-57d3cddd953c`:
  - cold direct flight results showed the branded loader and reached 10 live IAH–LAX results;
  - cold direct hotel results showed the branded stay loader and reached a live Los Angeles result;
  - cold direct car results showed the branded rental-car loader and reached 30 live LAX Airport results;
  - no cold direct-results launch remained stuck on a white or splash-only screen;
  - with Android animation scales disabled, loader screenshots three seconds apart had identical SHA-256 hashes; settings were restored afterward;
  - offline flight search exposed Try again and Edit search; after connectivity was restored, Try again returned to the branded loader and recovered to live results.
- Local screenshots are retained under ignored QA artifacts at `qa/mobile-web/artifacts/physical-preview-2026-09-04/`.

## Repository-wide baseline findings

The full suites are not currently green outside this change scope:

- Web Node suite: 2,753 passed and 215 failed. Failures span pre-existing admin, Cars/homepage, localization, delivery-contract, and other unrelated source-contract tests.
- Web `tsc --noEmit`: failed in existing test fixtures and unrelated domain types, including Deals provider diagnostics, recent-search fixtures, travel-inspiration mocks, and destination editorial tests.
- Mobile suite: 1,620 passed and 6 failed. Four failures are Windows absolute-path construction in tests; two are unrelated Personal Details source-contract assertions.

These failures were recorded rather than weakened or silently treated as passing. The focused results-refresh tests and physical/staging checks above are green.

