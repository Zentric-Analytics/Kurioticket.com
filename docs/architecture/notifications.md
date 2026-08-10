# Notification architecture

`Notification` is the canonical event inbox. Price changes from both Automatic and Target Price Alerts use `PRICE_ALERT` with deterministic event keys and safe internal action paths. Email is independently preference-controlled through the delivery ledger; an email failure never rolls back the canonical event. Account, security, support, system, and travel insight behavior is unchanged.
