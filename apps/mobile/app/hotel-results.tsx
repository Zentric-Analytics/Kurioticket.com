import { TravelResultsScreen } from "../src/features/flow/TravelResultsScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function HotelResults() {
  return (
    <ProfileThemeProvider>
      <TravelResultsScreen product="hotel" />
    </ProfileThemeProvider>
  );
}
