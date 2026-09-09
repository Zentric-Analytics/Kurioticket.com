import { CurrencyScreen } from "../src/features/flow/SettingsScreens";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><CurrencyScreen /></ProfileThemeProvider>;
}
