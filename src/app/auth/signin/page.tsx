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

function getSafeCallbackUrl(
  callbackUrl?: string
) {
  if (!callbackUrl) {
    return "/";
  }

  if (
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//")
  ) {
    return callbackUrl;
  }

  try {
    const appOrigin = new URL(
      getBaseUrl()
    ).origin;

    const parsed = new URL(
      callbackUrl,
      appOrigin
    );

    if (parsed.origin !== appOrigin) {
      return "/";
    }

    const relative = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    return relative.startsWith("/")
      ? relative
      : "/";
  } catch {
    return "/";
  }
}

function getGoogleAuthErrorMessage(
  error?: string
) {
  switch (error) {
    case "AccountUnavailable":
      return "This account is not available. Please contact support.";
    case "OAuthCallback":
      return "Google sign-in was interrupted during callback. Please try again.";
    case "OAuthAccountNotLinked":
      return "This email is already associated with another sign-in method. Continue with your original method, or reset your password.";
    case "AccessDenied":
      return "Access was denied by Google. Please allow access and try again.";
    case "Configuration":
      return "Google sign-in is temporarily unavailable. Please try again shortly, or use email login.";
    case "Callback":
      return "Google sign-in callback failed. Please try again, or use email login.";
    default:
      return error
        ? "Google sign-in could not be completed. Please try again, or use email login."
        : "";
  }
}

export default async function SigninPage({
  searchParams,
}: SigninPageProps) {
  const params = await searchParams;

  const callbackUrl =
    getSafeCallbackUrl(
      params?.callbackUrl
    );

  const initialError =
    getGoogleAuthErrorMessage(
      params?.error
    );

  const initialMessage =
    params?.reset === "success"
      ? "Your password was reset. Log in with your new password."
      : params?.reason === "inactive"
        ? "You were signed out after 30 minutes of inactivity. Log in again to continue."
        : "";

  const googleEnabled = Boolean(
    getGoogleClientId().trim() &&
      getGoogleClientSecret().trim()
  );

  console.error(
    `Google OAuth enabled: ${googleEnabled}`
  );

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center pt-24 pb-10 sm:pt-28 lg:pt-28">
        <SigninForm
          callbackUrl={callbackUrl}
          googleEnabled={googleEnabled}
          initialError={initialError}
          initialMessage={initialMessage}
        />
      </main>

      <Footer />
    </>
  );
}
