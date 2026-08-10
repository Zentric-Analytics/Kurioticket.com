# Canonical customer travel systems

> Kurioticket is a metasearch and referral platform. Travel transactions are completed and managed by external providers. Kurioticket does not create, sell, fulfill, modify, cancel, refund, or service travel bookings.

Kurioticket has four canonical travel systems, exposed according to each platform's established capabilities:

1. **My Trips** is a read-only itinerary/reference system containing only externally completed, partner-confirmed trips linked to the signed-in user. A My Trip is not a Kurioticket booking.

Outbound search or provider clicks never create My Trips. New records enter only through a trusted backend partner confirmation or verified confirmation import, and management actions always lead to a validated external provider destination. Migrated legacy records without a trustworthy destination remain visible without a fake action.
2. **Saved & Recent** at `/saved` contains intentionally saved flights, hotels, and searches alongside a distinct recent-search history.
3. **Price Alerts** supports `TARGET` alerts and `AUTOMATIC` meaningful-drop tracking. Both are processed by the single price-alert worker and create `PRICE_ALERT` notification events.
4. **Notifications** is the authoritative backend and mobile inbox for travel, account, security, support, and system updates.

Web travel navigation exposes My Trips, Saved & Recent, and Price Alerts. Kurioticket does not provide a web Notification Center. Mobile exposes all four systems, including its existing Notification Center.

The consolidation migration copies legacy retained travel into `SavedSearch`, converts automatic monitoring state into `PriceAlert`, maps legacy monitoring notifications to `PRICE_ALERT`, maps legacy saved-item reminders to `TRAVEL_INSIGHT`, merges explicit price-monitoring email consent, deletes obsolete feature rows, and only then drops legacy tables and enum values. Historical IDs, ownership, event keys, read state, and timestamps remain in place.
