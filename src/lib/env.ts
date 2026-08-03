export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "";
}

export function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "";
}


export type TravelProviderMode = "local" | "staging" | "production";
export type DuffelApiMode = "live" | "test";
export type ProviderApiMode = "live" | "sandbox" | "test";
const normalizedEnvValue=(value:string|undefined)=>value?.trim().toLowerCase();
function readEnum<T extends string>(name:string,allowed:readonly T[],fallback:T){const value=normalizedEnvValue(process.env[name]);return value&&allowed.includes(value as T)?value as T:fallback;}
export function getTravelProviderMode():TravelProviderMode{return readEnum("TRAVEL_PROVIDER_MODE",["local","staging","production"] as const,process.env.NODE_ENV==="production"?"production":"local");}
export function isProductionProviderMode(){return getTravelProviderMode()==="production";}
export function allowSandboxProviders(){return !isProductionProviderMode()&&process.env.ALLOW_SANDBOX_PROVIDERS==="true";}
export function getDuffelApiMode():DuffelApiMode{return readEnum("DUFFEL_API_MODE",["live","test"] as const,"live");}
export function assertSandboxProviderAllowed(providerName:string){if(!allowSandboxProviders())throw new Error(`${providerName} sandbox provider is not allowed in this environment.`);}
export function assertProductionLiveProvider(providerName:string,apiMode:ProviderApiMode){if(isProductionProviderMode()&&apiMode!=="live")throw new Error(`${providerName} must use live provider mode in production.`);}
export function hasTravelProviderKeys(){return Boolean(process.env.DUFFEL_API_KEY);}
export function isProductionRuntime(){return process.env.NODE_ENV==="production";}

export function getHomepageFaresCronSecret() {
  return process.env.HOMEPAGE_FARES_CRON_SECRET?.trim() || "";
}

export function getAdminEmails() {
  return (
    process.env.ADMIN_EMAILS || ""
  )
    .split(",")
    .map((email) =>
      email.trim().toLowerCase()
    )
    .filter(Boolean);
}

export function requireServerEnv(
  name: string
) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}
