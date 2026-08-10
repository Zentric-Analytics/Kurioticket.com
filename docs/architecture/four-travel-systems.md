# Canonical customer travel systems

Kurioticket has four canonical travel systems, exposed according to each platform's established capabilities:

1. **My Trips** contains only real partner reservations linked to the signed-in user. Kurioticket does not issue, modify, cancel, or refund them.
2. **Saved & Recent** at `/saved` contains intentionally saved flights, hotels, and searches alongside a distinct recent-search history.
3. **Price Alerts** supports `TARGET` alerts and `AUTOMATIC` meaningful-drop tracking. Both are processed by the single price-alert worker and create `PRICE_ALERT` notification events.
4. **Notifications** is the authoritative backend and mobile inbox for travel, account, security, support, and system updates.

Web travel navigation exposes My Trips, Saved & Recent, and Price Alerts. Kurioticket does not provide a web Notification Center. Mobile exposes all four systems, including its existing Notification Center.

The consolidation migration copies legacy retained travel into `SavedSearch`, converts automatic monitoring state into `PriceAlert`, maps legacy monitoring notifications to `PRICE_ALERT`, maps legacy saved-item reminders to `TRAVEL_INSIGHT`, merges explicit price-monitoring email consent, deletes obsolete feature rows, and only then drops legacy tables and enum values. Historical IDs, ownership, event keys, read state, and timestamps remain in place.
