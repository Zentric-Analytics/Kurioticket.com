import { HotelDetailsScreen } from "../src/features/search/HotelDetailsScreen";
import { ProfileThemeProvider } from "../src/theme/AppTheme";

export default function HotelDetails() {
  return (
    <ProfileThemeProvider>
      <HotelDetailsScreen />
    </ProfileThemeProvider>
  );
}
