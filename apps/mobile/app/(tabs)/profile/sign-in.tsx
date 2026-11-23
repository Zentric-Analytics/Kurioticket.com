import { Redirect, useLocalSearchParams } from "expo-router";
import { signInHref, validateSignInIntent } from "../../../src/features/auth/signInIntent";

/** Compatibility for old deep links and restored navigation state. */
export default function ProfileSignIn() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <Redirect href={signInHref(validateSignInIntent(returnTo))} />;
}
