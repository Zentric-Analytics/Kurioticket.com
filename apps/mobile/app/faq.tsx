import { MobileFaqScreen } from "../src/features/account/MobileFaqScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><MobileFaqScreen /></ProfileThemeProvider>;
}
