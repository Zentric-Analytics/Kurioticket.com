import { TravelPreferencesScreen } from "../src/features/account/NativeAccountScreens";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><TravelPreferencesScreen /></ProfileThemeProvider>;
}
