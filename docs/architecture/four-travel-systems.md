# Canonical customer travel systems

Kurioticket has four customer-facing travel systems:

1. **My Trips** contains only real partner reservations linked to the signed-in user. Kurioticket does not issue, cancel, or refund them.
2. **Saved & Recent** at `/saved` contains intentionally saved flights, hotels, and searches alongside a distinct recent-search history.
3. **Price Alerts** supports `TARGET` alerts and `AUTOMATIC` meaningful-drop tracking. Both are processed by the price-alert worker and create `PRICE_ALERT` notification events.
4. **Notifications** is the authoritative inbox for travel, account, security, support, and system updates.

The consolidation migration copies legacy retained travel into `SavedSearch`, converts automatic monitoring state into `PriceAlert`, normalizes price notification history without creating events, merges explicit price-email consent, deletes obsolete feature rows, and only then drops legacy tables.
