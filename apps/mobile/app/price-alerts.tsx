import { PriceAlertsScreen } from "../src/features/flow/AccountDataScreens";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><PriceAlertsScreen /></ProfileThemeProvider>;
}
