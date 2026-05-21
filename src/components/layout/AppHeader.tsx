const cookieStore = await cookies();
const headerStore = await headers();

const cookieRegion = normalizeRegion(
  cookieStore.get(REGION_COOKIE_KEY)?.value,
);

const headerRegion = normalizeRegion(
  headerStore.get("x-curioticket-region"),
);

const ipRegion = countryToRegion(
  headerStore.get("x-vercel-ip-country") ||
    headerStore.get("cf-ipcountry"),
);

const initialRegion = (
  cookieRegion ||
  headerRegion ||
  ipRegion ||
  "GLOBAL"
) as RegionMode;