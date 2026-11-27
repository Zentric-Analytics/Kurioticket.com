# Stage 1 car image readiness

Validated car inventory no longer awaits initial image prefetch before publishing ready state. A background microtask starts the same bounded optional prefetch and isolates rejected downloads or synchronous native image errors. It owns no inventory or readiness state and cannot overwrite a later search.

All vehicle groups/rates, stable placeholders and card geometry, accessibility, virtualized list settings, filters, currency, selected rates, details, Back navigation and supplier configuration are unchanged. No additional supplier search is introduced. The historical long device interval is not declared resolved; this unit removes only the confirmed image-readiness dependency.

Tests cover indefinitely pending images, failed downloads, native exceptions and the actual controller's non-awaited call and ownership guards; full native tests preserve presentation/navigation. Rollback is a scoped revert of this unit, with no settings or schema changes. Genuine performance and native update activation remain gated on owner-authorized staging delivery.
