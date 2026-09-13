# Checklist five — desktop and mobile-browser journeys

Scope: KAYAK sandbox staging website. Responsive Chromium browser checks, not
physical iPhone/Android or Safari certification. No production/native changes.

## Reproduced defect and correction

The normal mobile flight filter drawer stayed mounted off-screen after closure,
with role=dialog and aria-modal=true. Its existing focus-management refs were
also missing. Reproduced at 390 x 844: closed drawer y=844 and a second dialog
present when Edit flight search opened.

PR 5303 conditionally mounts the drawer and connects its dialog/close-button refs.
All 3,143 tests pass; full build passes. Focused lint has zero errors and 19
pre-existing warnings in FlightResultsClient. Unrelated AGENTS.md/next-env edits
were excluded.

Merge: 8dc7c055a554c1cb1c6b4323923899897dc8a65a.
Render deployment: dep-daj16sgu01pc738o33m0, live 2026-09-13 03:12:16 UTC.

## Browser evidence

Viewport dimensions were read from the DOM after overrides settled: mobile
390 x 844 (375px content width with scrollbar), desktop 1440 x 900 (1425px
content width). Document scroll width equals client width in sampled result
and expanded-detail states: no horizontal overflow.

- Flights, BOS–JFK round trip Oct 12–17, one adult: ordinary results show KAYAK
  plus other-provider cards. Mobile JetBlue filter changes 401 to 397; apply
  closes the drawer, pagination reaches 21–40, clear restores 401 and page one.
  Mobile search editor resubmits the same criteria. Expanded itinerary/cabin/
  baggage/original pricing fit mobile and desktop. Test clickout opens KAYAK's
  explicit nonfunctional sandbox landing page; temporary clickout tab closed.
- Final-release flight retest: 347 KAYAK + four other offers (351 total; sandbox
  inventory varies). Closed drawer count zero; opening count one and focus on
  Close filters. Shift+Tab wraps to result button and Tab wraps back to Close.
  Escape removes drawer. Edit flight search is then the only mounted dialog.
  Search resubmission succeeds; desktop card/detail layout remains intact.
- Hotels, London Oct 12–17, one guest/room: ordinary search requires choosing
  London, England from ambiguous destination matches, then supplies 143 KAYAK
  + eight other results. On mobile and desktop, Hux name filter returns 11;
  clear restores 151. Search sheet resubmission works. Desktop pagination reaches
  21–40 and returns to page one. Images, ratings, original amount and expanded
  readable amenities fit both layouts; provider sandbox placeholders preserved.
- Cars, BOS Oct 12–17 at 10:00, any driver age: ordinary mobile search submission
  returns 116 KAYAK + 30 other results. Medium cars yields 55 on mobile and
  desktop; clearing restores 146. Lowest-total-price sort brings KAYAK cards into
  view; regular card and expanded specs fit both layouts. Desktop Compare prices
  exposes a labeled sandbox offer and disabled Not bookable action.

Hotel/car checks were on 7541599df169 or its unchanged predecessor from checklist
four; PR 5303 changes only the flight drawer. Final flight browser errors absent;
hotel/car error checks also returned no browser errors. Health HTTP 200. Render
error query 03:12:16–03:20:13 UTC returned no errors.

Planned checklist-five responsive coverage passed. This does not cover every
route/date/device or replace native-device testing. Items six through eight
(failure cases, broader safeguards, final consolidated sign-off) remain separate.
Test filters cleared and expanded details collapsed. Saved JPY preference retained.
