# Feature Controls

The active registry contains six travel controls: `FLIGHT_SEARCH_ENABLED`, `HOTEL_SEARCH_ENABLED`, `CAR_SEARCH_ENABLED`, `DEALS_ENABLED`, `PRICE_ALERTS_ENABLED`, and `PRICE_ALERT_PROCESSING_ENABLED`.

`PRICE_ALERTS_ENABLED` blocks creation of both Automatic and Target alerts and blocks reactivation, while preserving view and delete access. `PRICE_ALERT_PROCESSING_ENABLED` causes the single processor for both strategies to return successfully before candidate reads, provider calls, notifications, email, or state mutation.

Production changes retain the existing authorization, reason, and immutable `AdminAuditLog` requirements.
