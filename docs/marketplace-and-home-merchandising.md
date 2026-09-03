# Marketplace and Home merchandising

Kurioticket has one marketplace resolution contract for Web and Native. Rendering and guest storage differ by client, but marketplace meaning does not.

## Resolution

Country/market resolves in this order:

1. authenticated account selection;
2. explicit guest/device selection;
3. canonical server country detection;
4. `US` as the global fallback.

Display currency resolves independently:

1. explicit account/user currency;
2. the resolved market's canonical currency;
3. `USD` only when the market has no supported currency.

Detection must never overwrite an explicit market or currency. Locale remains separately selectable. The platform-neutral contract lives in `src/shared/marketplace/marketplaceContext.ts` and records both the source and whether market/currency are explicit.

Authenticated Web and Native clients use the same account customization contract (`region`, `currency`, and `locale`). Guest clients persist locally and apply the same resolver semantics.

## Home source of truth

Home Hotel destinations, adventure routes, and regional routes are selected by the shared `getMarketplaceHomeMerchandising` entry point. That entry point delegates to the established Web market datasets; Native adapts only image URL shape and presentation types. Native must not copy market-specific arrays.

Home actions carry `marketCountryCode` and `displayCurrency` from the active marketplace context. These fields provide presentation and provider-market context only; they cannot change route identity, destination identity, inventory eligibility, or provider truth.

Static Hotel records remain planning inventory. A promoted Hotel destination requires verified property coverage; valid destinations without that coverage must produce a truthful unavailable/empty planning state rather than generated properties or prices.
