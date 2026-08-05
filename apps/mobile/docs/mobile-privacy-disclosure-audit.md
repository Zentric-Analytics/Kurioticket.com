# Mobile data-safety and App Privacy evidence audit

Audit date: 2026-08-04

Repository source audited: `3495609287678a3659f43b65c4978ec2c92579a9` plus the corrective changes in this PR.

Released artifacts in scope:

- Android Production `com.kurioticket.app` 0.3.0 (`versionCode` 2), runtime/channel `production-0.3.0` / `production`, EAS build `c84c196e-7928-4f26-8b7c-a15f37f031db`.
- iOS Preview `com.kurioticket.app.preview` 0.3.0 (3), runtime/channel `preview-0.3.0` / `preview`, EAS build `5f537da8-356d-453b-9bf8-47623286657c`.

This is technical evidence for owner review. It is not a legal conclusion and has not been submitted to Google or Apple. “Shared” in the Google draft is conditional on the owner confirming that each vendor is contractually limited to service-provider processing; transfers to a provider outside that exception must instead be declared as sharing.

## 1. Verified data-flow inventory

| Data | Source and destination | Storage / retention evidence | Required? | Linked? | Purpose / disclosure consequence |
| --- | --- | --- | --- | --- | --- |
| Email address | User or Google ID token → Kurioticket API/PostgreSQL; Resend receives recipient address for codes, security, support, deletion and optional emails | `User.email`, support/deletion/newsletter records; no complete retention period encoded | Required for an account; optional for guest search | Yes | Account management, authentication, security, support, developer communications |
| Name | User registration/profile or Google → PostgreSQL | `User.name` and `UserProfile.fullName`; cascades with user only if an actual user deletion is performed | Required by mobile registration; Google name optional | Yes | Account management and personalization |
| Phone number | Optional registration/profile → PostgreSQL | `UserProfile.phoneNumber` and country code; no retention period encoded | Optional | Yes | Account/profile functionality |
| Physical address | Optional profile → PostgreSQL | `UserProfile.address`; no retention period encoded | Optional | Yes | Account/profile functionality; current UI permits it even though it is not required at signup |
| Date of birth, gender, nationality | Optional profile → PostgreSQL | `UserProfile`; no retention period encoded | Optional | Yes | Account/profile functionality and potential personalization |
| Password | User → Kurioticket API | bcrypt hash only in `User.passwordHash`; raw password is not stored by application code | Required only for password authentication | Yes | Authentication/security |
| Verification codes and proofs | Generated server-side; code sent through Resend; submitted by user | SHA-256 code token/proof with expiry in `VerificationToken`; deleted on success/replacement | Required only for code flow; short-lived | Yes, by email identifier | Authentication/security; ephemerally used but temporarily stored |
| Session token | Kurioticket API → app SecureStore → Kurioticket API | Raw server token in `Session`; device copy in SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; 30-day expiry | Required for authenticated functions | Yes | Authentication/account management |
| Google account data | Google Sign-In → app ID token → Kurioticket API and Google verification endpoint | Google subject ID, email, optional name and profile-image URL; app config requests no offline access | Optional alternative login | Yes | Authentication/account creation; Google is a third-party recipient/provider |
| Profile photo | Google profile picture URL only; no device photo picker | `User.image` URL; image binary is not uploaded by this client | Optional and Google-flow-only | Yes | Account profile. Conservatively disclose Photos/Profile Photo unless the store’s current guidance excludes remote profile-image URLs |
| Searches and travel inputs | User → Kurioticket APIs → flight provider for live flight/place searches | Flight/hotel queries and results metadata in `SearchHistory`; first-party `AnalyticsEvent`; saved/recent/alert records when user selects those features | Search required to obtain results; saving/alerts optional | Sometimes: search logging uses a web session and can be anonymous for the released mobile calls; saved records/alerts are linked | App functionality, personalization, first-party analytics |
| Approximate location and IP address | Request IP → Kurioticket/hosting; default-origin endpoint may send IP to IPinfo or MaxMind | No database persistence found in the default-origin route; in-memory/provider/hosting retention is not established in code | Automatic for optional default-origin suggestion; no GPS permission | Not intentionally linked to account in this request, but infrastructure could correlate it | App functionality, security/rate limiting. Google: Approximate location; Apple: Coarse Location, unless provider configuration is confirmed disabled |
| Precise location | No location permission, GPS API or precise-device-location flow found | Not collected | No | No | Declare not collected |
| IP/user-agent/security signals | Requests → hosting/Kurioticket; authentication rate limiter; web session/admin audit code can store masked IP, IP, user agent, browser/OS/device label | Mobile auth rate-limit state is transient; hosting log retention unknown; database models exist for session/admin activity, but mobile-session creation does not write `UserSessionActivity` | Automatic | Potentially linked in web/admin flows; not deliberately linked in mobile session creation | Fraud prevention, security, service operation |
| First-party product interactions | Search, redirect, save, alert, signup and support events → PostgreSQL | `AnalyticsEvent`, `SearchHistory`, `RedirectLog`, provider logs; no encoded deletion schedule | Automatic when relevant actions occur | Sometimes linked through `userId`; mobile search endpoints currently generally log without a NextAuth cookie | App functionality, first-party analytics, fraud/security. No third-party analytics SDK is installed |
| Saved travel/preferences | User → Kurioticket API/PostgreSQL; some device-only currency/theme/onboarding/favorite state → SecureStore | Saved flights/hotels/searches/trips, recent searches, price alerts, travel/customization preferences; device preferences in SecureStore | Optional | Yes when server-saved; device-only settings are local | App functionality and personalization |
| Trip/booking history | The released client can read `TripBooking` records but no repository route creates them | Database model includes booking reference, provider, route/dates, passenger count, currency/amount and optional raw payload; source and retention are not established | Optional/not created by released client | Yes | Treat as an owner question. Do not declare Purchase History as actively collected until the production ingestion source is confirmed; if populated, disclose it |
| Provider redirect data | User selection → Kurioticket → external travel provider | Production `RedirectLog` stores provider, route, price/currency, destination URL, source page and optional user ID | Optional; only when continuing to a provider | Sometimes | App functionality, affiliate attribution, first-party analytics; external provider independently collects data after redirect |
| Support requests/messages | User web support form → PostgreSQL and Resend | Email, subject, category, message body and source context in support tables; Resend receives confirmation/reply content | Optional | Linked when signed in, otherwise linked by submitted email | App functionality, customer support, developer communications |
| Account-deletion requests | Account settings/mobile correction → PostgreSQL, support record and Resend | Email, dates/status, reason/notes, support ticket and admin audit evidence. Seven-day grace period is encoded; final retention/deletion is not | Optional user request | Yes | Account management/legal compliance |
| Email communications | Kurioticket → Resend → user; delivery webhooks → Kurioticket | Recipient, subject/template metadata and delivery status; content for verification/support/deletion and opted-in alerts | Transactional required for selected flows; optional campaigns depend on preferences | Yes | Authentication, security, support, developer communications |
| Diagnostics/crashes | No Sentry, Crashlytics or comparable mobile SDK | No device crash/diagnostic upload implemented. Server provider latency/errors are operational logs, not device crash reports | No | No device diagnostic linkage | Google Crash logs/Diagnostics and Apple Diagnostics: not collected by the app based on code/artifact evidence; platform/store diagnostics may be separately available to account owners |
| Push tokens/notifications | No `expo-notifications`, FCM sender or APNs token flow | No push token model or client collection | No | No | Not collected. Database “Notification” records are in-app/email domain records, not push tokens |
| Advertising/device identifiers | No advertising SDK, ATT prompt, Ad ID permission or IDFA/AAID API found | Not stored | No | No | Device or Other IDs: not collected by app code; no tracking |
| Files/documents/audio/video/contacts/calendar/SMS | No picker, capture, contacts, calendar, SMS or microphone flow/permission found | Not collected | No | No | Declare not collected |
| Payment card/bank/credit data | Final transactions occur on external provider pages; app/API do not request or store card/bank data | Not stored by Kurioticket application code | No | No | Declare not collected. External provider privacy applies after redirect |

All release API origins are HTTPS. The app does not implement certificate pinning; it relies on platform TLS validation. Secrets are server-side; OAuth client IDs and the public EAS project ID are identifiers, not secrets.

## 2. Third-party SDK and provider inventory

| Provider/package | Verified data path and purpose | Linked/retained | Store disclosure treatment |
| --- | --- | --- | --- |
| Expo runtime, `expo-updates`, EAS Update | Project ID, platform/runtime/channel, update/build request metadata and network identifiers to Expo for app delivery | Not deliberately tied to a Kurioticket user ID; Expo retention/contracts not in repo | Service provider; disclose relevant collection if Expo documentation says update request/device data is collected |
| Google Sign-In / `react-native-nitro-google-signin`, Google Identity | Google subject, email, verification status, optional name/photo, nonce and ID token for authentication | Linked to account; Google retention governed by Google and account configuration | Contact Info, User ID, optional profile photo; app functionality/account management; no tracking |
| Resend (`resend`) | Recipient email, transactional/optional email content, template metadata, delivery identifiers/status | Linked; retention/processor terms not in repo | Contact Info and support/user content for app functionality, security and developer communications |
| Duffel API | Flight/place search criteria, dates, travelers/cabin and request/network metadata; no payment card from Kurioticket | Search data may not carry Kurioticket user ID, but provider can retain request/IP metadata; contract unknown | Search History/Other Usage Data for app functionality; sharing answer depends on processor/controller terms |
| IPinfo and MaxMind GeoIP | Request IP for country/city/default-origin resolution when enabled | Not linked by application identifier; vendor retention unknown | Approximate Location for app functionality; sharing answer contract-dependent |
| Render/hosting/CDN/network infrastructure | All API request contents plus IP, headers and operational logs | Can be linked through auth token/user request; log retention unknown | Service-provider processing of every applicable category; owner must confirm retention and contracts |
| PostgreSQL/Prisma database provider | Every stored account, profile, search, preference, support and security record | Linked according to schema; provider and retention configuration are not named in repository evidence | Service-provider processing; no independent “sharing” if contractually restricted |
| Apple App Store/TestFlight and Google Play services | Store account, installation, purchase/download and platform diagnostics managed by Apple/Google | Platform-controlled; exact account settings not in repo | Platform disclosures are generally handled by Apple/Google, but owner must include any app-accessed data |
| Remote image hosts, including Unsplash and provider image URLs | Device IP/user agent and requested image URL when remote images load | Not linked by Kurioticket user ID; host retention unknown | Network service/provider; no photo upload by the user |

No third-party advertising, behavioral analytics, crash-reporting or push-notification SDK is installed.

## 3. Corrected category answers

| Store category | Current technical answer |
| --- | --- |
| Name | Collected, linked, required for mobile registration; app functionality/account management |
| Email address | Collected, linked, required for accounts; authentication, security, support and communications |
| Phone number | Collected optionally, linked; profile/account functionality |
| Physical address | Collected optionally, linked through profile; not required at signup |
| Other contact info | No additional mobile contact category verified |
| Date of birth | Collected optionally, linked |
| Gender | Collected optionally, linked |
| Government ID | Not collected |
| Other personal info | Nationality and travel preferences are collected optionally and linked |
| Payment card/bank/credit score/other financial info | Not collected by Kurioticket |
| Purchase history | A read-only linked database model/API exists, but no released ingestion/write path was found. Owner must confirm whether Production contains or imports booking records before selecting this category |
| Approximate location | Collected automatically through IP-based default-origin resolution when GeoIP is configured; not GPS and not intentionally account-linked |
| Precise location | Not collected |
| Emails/SMS/in-app messages | Kurioticket does not read the user’s mailbox or SMS. Support message content is collected when submitted through support; verification/support emails are developer communications, not mailbox collection |
| Photos/videos | No device library/camera access. Optional Google profile-image URL is stored; conservatively treat profile photo as collected pending store-guidance confirmation |
| Audio/files/documents/calendar/contacts | Not collected |
| App interactions | Collected through first-party analytics, saves, redirects and feature records; sometimes linked |
| In-app search history | Collected and stored; linked for saved/recent/alert features and sometimes anonymous for raw mobile search logs |
| Installed apps/user-generated public content/web browsing | Not collected. External-provider destinations are logged as redirect activity, not general browsing history |
| Crash logs/device diagnostics/performance data | No mobile collection SDK. Server-side request/provider latency and errors are collected as operational/product activity, not device diagnostics |
| Device or other identifiers | No advertising ID, IDFA, AAID or push token. IP and session tokens are handled for networking/security but are not advertising identifiers |

No collected data is used for third-party advertising or cross-company tracking. First-party personalization exists through saved travel and `personalizeRecommendations`. Some collection is optional (profile fields, saves, alerts, support, Google login); email/name/session handling is required only when the user chooses to create/use an account. Guest search is supported.

## 4. Google Play Data Safety draft

### Top-level answers

1. **Does the app collect or share user data?** Yes, the app collects user data. “Shares user data” should be **No only if** Render/database, Resend, Duffel, GeoIP and Expo transfers all meet Google’s service-provider exception; otherwise answer Yes and disclose the affected types.
2. **Is all user data collected by the app encrypted in transit?** Yes for repository-controlled release endpoints and verified third-party endpoints; all are HTTPS. Confirm infrastructure has no non-TLS termination path before submission.
3. **Can users request that data be deleted?** A request workflow exists, and this PR adds in-app initiation. The correct store answer cannot be finalized until actual deletion/anonymization after review is implemented and the public deletion-request URL is verified.

### Data-type selections

| Google Play type | Collected | Shared | Required/optional | Ephemeral | Purpose |
| --- | --- | --- | --- | --- | --- |
| Personal info — Name | Yes | Conditional service-provider answer | Required for registration | No | App functionality; Account management; Personalization |
| Personal info — Email address | Yes | Conditional service-provider answer | Required for account | No | App functionality; Account management; Fraud prevention/security/compliance; Developer communications |
| Personal info — User IDs | Yes | Conditional service-provider answer | Required for account/Google login | No | App functionality; Account management; Fraud prevention/security/compliance |
| Personal info — Address | Yes | Conditional service-provider answer | Optional | No | App functionality; Account management |
| Personal info — Phone number | Yes | Conditional service-provider answer | Optional | No | App functionality; Account management |
| Personal info — Other info | Yes: DOB, gender, nationality, travel preferences | Conditional service-provider answer | Optional | No | App functionality; Personalization; Account management |
| Location — Approximate location | Yes when GeoIP enabled | Conditional service-provider answer | Automatic for default-origin feature | Kurioticket route does not persist it; provider retention unknown | App functionality; Fraud prevention/security where IP is rate-limited |
| Financial info — Purchase history | Owner confirmation required | Owner confirmation required | Optional | No | App functionality if Production booking records are populated |
| Messages — Other in-app messages | Yes: support request/reply content | Conditional service-provider answer | Optional | No | App functionality; Developer communications |
| Photos and videos — Photos | Conservative Yes for Google profile photo URL | Google/service-provider path | Optional | No | App functionality; Account management |
| App activity — App interactions | Yes | Conditional service-provider answer | Automatic for relevant actions | No | App functionality; Analytics; Fraud prevention/security |
| App activity — In-app search history | Yes | Duffel/service-provider conditional | Search required for results; persistence/saves optional | Live provider request transient; Kurioticket logs persist | App functionality; Analytics; Personalization |
| App activity — Other user-generated content | Yes: saved trips/preferences/alerts and support content where not classified above | Conditional service-provider answer | Optional | No | App functionality; Personalization; Account management |
| Device or other IDs | No advertising/device ID. Do not select solely for the Kurioticket session token without confirming current Google guidance | — | — | — | — |
| App info and performance — Crash logs/Diagnostics/Other performance | No device telemetry SDK | — | — | — | — |

All unlisted Google categories are **not collected** based on current evidence: precise location, contacts, emails read from mailbox, SMS/MMS, videos, audio, files/documents, calendar, installed apps, web browsing history, payment card/bank/credit information, government ID and health/fitness data.

## 5. Apple App Privacy draft

No data is used for tracking as Apple defines it: there is no advertising SDK, data broker, cross-company advertising profile or ATT/IDFA access.

| Apple category/type | Linked to user | Tracking | Purpose | Collector / optionality / retention |
| --- | --- | --- | --- | --- |
| Contact Info — Name | Yes | No | App Functionality; Personalization | Kurioticket/hosting/database; required for mobile registration; retained without encoded period |
| Contact Info — Email Address | Yes | No | App Functionality; Account Management; Developer Communications | Kurioticket, Google where chosen, Resend; required for accounts |
| Contact Info — Phone Number | Yes | No | App Functionality; Account Management | Kurioticket/database; optional |
| Contact Info — Physical Address | Yes | No | App Functionality; Account Management | Kurioticket/database; optional |
| Identifiers — User ID | Yes | No | App Functionality; Account Management; Fraud Prevention/Security | Kurioticket and Google for Google sign-in; account-only |
| Location — Coarse Location | No deliberate account link | No | App Functionality | IP-derived via Kurioticket/IPinfo/MaxMind; automatic when default origin is requested; provider retention unknown |
| User Content — Customer Support | Yes or email-linked | No | App Functionality; Developer Communications | Kurioticket/Resend; optional; retained without encoded period |
| User Content — Photos | Yes | No | App Functionality | Optional Google profile-image URL only; no device photo access |
| Usage Data — Product Interaction | Sometimes | No | App Functionality; Analytics; Personalization | First-party database and service providers; automatic for relevant actions |
| Usage Data — Search History | Sometimes | No | App Functionality; Analytics; Personalization | Kurioticket and Duffel for live flight/place searches; persisted by Kurioticket |
| Other Data — Profile/travel preferences | Yes | No | App Functionality; Personalization; Account Management | Optional, retained without encoded period |
| Purchases — Purchase History | Owner confirmation required | No | App Functionality | Read-only schema/API exists; no released write/ingestion path found |

Diagnostics, precise location, contacts, browsing history, sensitive health data, payment information, audio and device ID are not collected by current app code. Apple/Google may independently make store diagnostic reports available; this draft covers app/SDK behavior, not platform-controlled reporting that the app does not access.

## 6. Account-deletion compliance audit

### Released behavior

- Web account settings can create an authenticated deletion request; support can also receive a request.
- The released Android/iOS mobile Profile has no deletion entry and its Contact us row is a placeholder. Apple’s in-app initiation requirement is therefore not met by the released binaries.
- A request immediately changes the user to `PENDING_DELETION`, creates a support ticket, sends user/admin emails and establishes a seven-day grace period.
- After seven days, code only changes the request to `READY_FOR_REVIEW`.
- The admin “mark completed” action changes request metadata only and explicitly records `hardDeleteTriggered: false`; it does not delete or anonymize the user, sessions, profile, searches, support content or linked records.

### Corrective PR behavior

- Adds a bearer-authenticated mobile deletion endpoint using the existing reviewed service.
- Adds an in-app destructive confirmation, disables the account through the existing service, clears the device session and provides deletion/retention information.
- Makes Contact us open the actual HTTPS support page.
- Does **not** invent a deletion/anonymization algorithm or retention rules.

### Compliance result

- **Apple:** initiation is corrected in this PR, but end-to-end deletion remains unproven until retained/deleted fields and the completion procedure are implemented and tested.
- **Google:** `/legal/data-deletion-policy` is a public information page and `/support` supplies a request channel, but the owner must verify the Play account-deletion URL field and the final deletion procedure. The current “completed” state alone is not proof of deletion.

## 7. Privacy-policy and documentation mismatches

1. The policy says deletion can be requested from account settings or support. That is true on the web, but false in the released mobile UI; this PR corrects mobile initiation/support navigation.
2. The web deletion API says “scheduled for permanent deletion in 7 days,” while code schedules review and never performs deletion. Public/API wording must be corrected after the owner approves the actual retention/deletion design.
3. The policy says first-party analytics events and feature usage are collected, which matches code. The internal `legalProfile.tracking.activeAnalytics: false` must be understood as “no third-party analytics”; otherwise it conflicts with `AnalyticsEvent`, `SearchHistory` and redirect logging.
4. The legal account profile says password is a required signup field, but mobile verification-code registration creates an account without setting a password.
5. The legal optional-profile list omits gender, although the API/schema collects it, and includes profile photo while the mobile editor does not upload one; Google sign-in can still store a profile-image URL.
6. Terms say an account is required for support tickets, but the support API accepts a guest ticket with an email.
7. Retention descriptions are qualitative only. No durations exist for account/profile, search, analytics, redirect, support, hosting logs or vendor-held data.

No legal text is changed in this PR. These are proposed corrections for owner/legal review.

## 8. Artifact and permission verification

Android AAB verification:

- File: accepted EAS build artifact, 65,305,828 bytes.
- SHA-256: `01F5A4B97264100169D9D942BB7647C95DD96322F586B7D9F697446DE6300E7A`.
- Manifest identity: `com.kurioticket.app`, 0.3.0, versionCode 2, target SDK 36, production EAS Update channel.
- Declared permissions: INTERNET, ACCESS_NETWORK_STATE, VIBRATE, USE_BIOMETRIC, USE_FINGERPRINT, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW.
- No location, camera, microphone, contacts, calendar, notifications or advertising-ID permission was found.
- Native Google Sign-In and Expo modules are embedded; no Firebase Analytics, Crashlytics or Sentry native library was found.
- READ/WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW have no app use and are blocked in this corrective PR. A new Android native build greater than versionCode 2 is required for that manifest correction.

iOS verification:

- The accepted build’s identity, signing, source and IPA digest are recorded in `preview-testflight-readiness.md`; the IPA itself is not retained in this workspace for renewed binary extraction.
- Repository configuration declares no location, camera, microphone, contacts, calendar, push or tracking usage description/entitlement; it declares `ITSAppUsesNonExemptEncryption: false` and the Preview Google callback scheme.
- No app-level privacy manifest is present in the repository. Whether every embedded Apple-required-reason API declaration was supplied by generated dependency manifests must be rechecked on the next retained IPA; App Store Connect accepted build 3.

## 9. Minimum owner questions

1. Which exact records must be deleted, anonymized or retained after the seven-day grace period, for how long, and under which verified legal/business basis? This is required before implementing actual completion.
2. Are Render, the database host, Resend, Duffel, IPinfo, MaxMind and Expo contractually restricted processors/service providers under Google’s “sharing” exception, and what are their retention periods?
3. Are `TripBooking` records populated in Production by any process outside this repository? If yes, identify the source and retention so Purchase History can be disclosed.
4. Is IPinfo or MaxMind enabled in the current Production environment, and what provider/log retention applies?
5. Does Production send optional marketing, travel-inspiration, price-alert or reminder emails today, and which consent/legal basis has been approved?
6. What are the approved retention periods for search/analytics/redirect logs, support tickets, security/hosting logs and inactive accounts?

## 10. Release blockers and required next actions

Technical blockers for the currently released binaries:

- No in-app mobile deletion initiation.
- No proven deletion/anonymization execution after the review period.
- Unnecessary Android storage/overlay permissions in versionCode 2.

Next actions:

1. Review this PR’s mobile initiation, support-link and Android permission corrections; do not merge automatically.
2. Obtain owner/legal answers for retention and vendor roles, then implement and test a separate fail-safe deletion/anonymization completion design.
3. After approved fixes merge, create Android Production versionCode greater than 2 and iOS Preview build number greater than 3 as required; refresh artifact evidence and internal QA before changing store declarations.
4. Update privacy/legal wording through separately approved legal review.
5. Enter the Google/Apple drafts only after vendor-role, purchase-history and retention questions are resolved.

**Audit recommendation: TECHNICAL PRIVACY FIX REQUIRED.**
