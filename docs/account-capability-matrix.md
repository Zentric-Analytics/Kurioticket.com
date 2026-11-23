# Travel account capability matrix

This matrix is the authoritative statement of durable account behavior. A blank capability is not implied by another product.

| Capability | Flight | Hotel | Car | Package |
| --- | --- | --- | --- | --- |
| Saved result | Supported | Supported | Supported | Not supported: no canonical package-offer identity exists |
| Saved search | Supported | Supported | Supported | Supported for complete search context |
| Recent search | Supported | Supported | Supported | Supported for complete search context |
| Price alerts | Target-price alerts | Target-price alerts | `NOT_SUPPORTED_BY_CURRENT_PRODUCT_CONTRACT` | `NOT_SUPPORTED_BY_CURRENT_PRODUCT_CONTRACT` |
| Preferences | Home airport and preferred airlines | Existing general travel preferences only | Existing general travel preferences only | Existing general travel preferences only |
| Notifications | Price-alert notifications | Price-alert notifications | No product-specific price notification | No product-specific price notification |
| Reopen behavior | Complete search to results; incomplete legacy context to form | Complete search to results; incomplete legacy context to form | Complete search to results; incomplete legacy context to form | Complete search to results; incomplete context to form |
| Guest/auth behavior | Search is available to guests; durable state and alerts require sign-in | Search is available to guests; durable state and alerts require sign-in | Search is available to guests; durable state requires sign-in | Search is available to guests; durable state requires sign-in |

Hotel alerts preserve destination, check-in, check-out, guests, rooms, target, currency, and canonical query context. Creation is offered only when a canonical result supplies a comparable price and currency; the processor re-runs the same Hotel search before comparing price.

Package persistence records search intent only. It never treats an assembled presentation candidate as a provider-backed package offer. Car and Package alert controls must remain absent until a real comparable-offer contract and re-search processor exist.

All durable reads and writes are authenticated and user-scoped. Client caches are scoped to the authenticated user; sign-out and identity changes invalidate account state. Server uniqueness constraints reject duplicate durable records, and failed optimistic mutations must restore the prior presentation state.
