import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SigninForm } from "@/components/auth/SigninForm";
import {
  getBaseUrl,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login",
};

type SigninPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
    reset?: string;
    reason?: string;
  }>;
};

function getSafeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl) {
    return "/";
  }

  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  try {
    const appOrigin = new URL(getBaseUrl()).origin;

    const parsed = new URL(callbackUrl, appOrigin);

    if (parsed.origin !== appOrigin) {
      return "/";
    }

    const relative = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    return relative.startsWith("/") ? relative : "/";
  } catch {
    return "/";
  }
}

function getGoogleAuthErrorKey(error?: string) {
  switch (error) {
    case "AccountUnavailable":
      return "loginErrorAccountUnavailable";
    case "OAuthCallback":
      return "loginErrorOAuthCallback";
    case "OAuthAccountNotLinked":
      return "loginErrorOAuthAccountNotLinked";
    case "AccessDenied":
      return "loginErrorAccessDenied";
    case "Configuration":
      return "loginErrorConfiguration";
    case "Callback":
      return "loginErrorCallback";
    default:
      return error ? "loginErrorGoogleGeneric" : "";
  }
}

export default async function SigninPage({ searchParams }: SigninPageProps) {
  const params = await searchParams;

  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl);

  const initialErrorKey = getGoogleAuthErrorKey(params?.error);

  const initialMessageKey =
    params?.reset === "success"
      ? "loginPasswordResetSuccess"
      : params?.reason === "inactive"
        ? "loginInactiveMessage"
        : "";

  const googleEnabled = Boolean(
    getGoogleClientId().trim() && getGoogleClientSecret().trim(),
  );

  console.error(`Google OAuth enabled: ${googleEnabled}`);

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center pt-24 pb-10 sm:pt-28 lg:pt-28">
        <SigninForm
          callbackUrl={callbackUrl}
          googleEnabled={googleEnabled}
          initialErrorKey={initialErrorKey}
          initialMessageKey={initialMessageKey}
        />
      </main>

      <Footer />
    </>
  );
}
