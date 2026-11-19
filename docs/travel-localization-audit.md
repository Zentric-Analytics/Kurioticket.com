# Travel localization audit

The travel platform uses the current canonical public locale registry rather than a hard-coded locale count. At the Task 7 baseline (`c506857e`), that registry exposed 18 selectable locales and the route audit mapped all 82 discovered routes.

## Permanent rules

- API and route dates remain ISO values; visible dates use the selected locale.
- Currency remains an ISO code internally and provider prices are never altered by translation.
- Provider legal names, airport codes, hotel names, car models, and flight numbers are not translated.
- Counts must use locale-aware number/plural presentation rather than concatenated English singulars.
- Arabic keeps document/app direction `rtl`; individual travel screens must not force the app to LTR.
- New travel keys must resolve to non-empty values for every selectable locale and may not contain `TODO`, `TRANSLATE`, or key-shaped placeholders.

## Program surfaces

The audit covers Home travel content; Flight, Hotel, Car, and Package forms/results/details; Explore; Saved; Recent; Price Alerts; Travel Preferences; errors; empty/loading/retry states; and provider handoff disclosure. Existing translations continue through the web `LocaleProvider` and native `MobileLocalizationProvider`.

Task 7 explicitly localizes the newly added Hotel-alert and Package-account actions, localizes visible Package summary dates, and adds a cross-locale completeness/RTL contract. The repository-wide audit also records inherited historical copy as debt; inherited English is not represented as an explicit translation.
