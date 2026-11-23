import { RecentSearchesScreen } from "../src/features/recent/RecentSearchesScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function ProfilePage() {
  return <ProfileThemeProvider><RecentSearchesScreen /></ProfileThemeProvider>;
}
