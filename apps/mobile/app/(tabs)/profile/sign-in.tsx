import { useLocalSearchParams } from "expo-router";
import { AuthFlow } from "../../../src/features/auth/AuthFlow";
import { validateSignInIntent } from "../../../src/features/auth/signInIntent";
export default function ProfileSignIn() { const { returnTo } = useLocalSearchParams<{ returnTo?: string }>(); return <AuthFlow successRoute={validateSignInIntent(returnTo)} />; }
