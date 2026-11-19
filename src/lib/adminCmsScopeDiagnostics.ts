/**
 * Homepage CMS integrity has to account for scopes that have never been created.
 * Looking only at stored scopes makes a missing market invisible.
 *
 * Read-only diagnostic: do not automatically reseed an already-initialized CMS.
 */
export type CmsScopeIdentity = { type: string; market: string; locale: string };
export type ExpectedHomepageCmsScope = {
  type: "HOMEPAGE_DESTINATION" | "FLIGHT_ROUTE" | "HOTEL_DESTINATION";
  market: string;
  locale: string;
};

export function findMissingHomepageCmsScopes(
  existing: readonly CmsScopeIdentity[],
  markets: readonly string[],
  locale: string,
): ExpectedHomepageCmsScope[] {
  const key = ({ type, market, locale: scopeLocale }: CmsScopeIdentity) =>
    `${type}:${market}:${scopeLocale}`;
  const storedKeys = new Set(existing.map(key));

  const expected: ExpectedHomepageCmsScope[] = [];
  for (const market of new Set(markets)) {
    expected.push({ type: "HOMEPAGE_DESTINATION", market, locale });
    expected.push({ type: "FLIGHT_ROUTE", market, locale });
  }
  expected.push({ type: "HOTEL_DESTINATION", market: "GLOBAL", locale });

  return expected.filter((scope) => !storedKeys.has(key(scope)));
}
