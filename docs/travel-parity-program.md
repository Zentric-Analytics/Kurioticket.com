# Travel platform parity program

`npm run travel:parity` is the authoritative deterministic semantic-parity gate for web, iOS, and Android. It tests contracts and policy—not screenshot equality—and does not call external providers.

| Matrix | Permanent evidence |
| --- | --- |
| Flights | One-way, round-trip, and multi-city request/readiness; canonical endpoint/result policy; IDs and details handoff |
| Hotels | Curated and manual intent; maintained destination coverage; strict incomplete-results boundary; canonical acceptance and false-empty protection; details/edit-search |
| Cars | Canonical LAX, JFK/Manhattan, and Heathrow/London location identities; request/results/details/bookability; Saved and Recent contracts |
| Packages | All four modes preserve each required component; canonical endpoint; no fabricated bundle price |
| Account | Saved Flight/Hotel/Car/Search, Recent product searches, Hotel alerts, truthful unsupported capability hiding, and sign-in gating |
| Discovery | Home cards, Explore Hotel actions, country-directory destinations, promos, and featured destinations retain maintained direct-search semantics |
| Result truth | Web and shared native clients consume server-owned canonical counts, IDs, eligibility, and actions; `canonicalCount > 0 && acceptedCount === 0` is a contract failure |

The root command owns the curated contract list. Adding or changing a travel surface requires updating that list and its deterministic tests. Network-dependent staging smoke tests remain separate from this PR gate.
