import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { BottomNavigation } from "./components/BottomNavigation";
import { FlightSearchCard } from "./components/FlightSearchCard";
import { HeroSection } from "./components/HeroSection";
import { HomeHeader } from "./components/HomeHeader";
import { PopularDestinations } from "./components/PopularDestinations";
import { PromoBanner } from "./components/PromoBanner";

export function HomeScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <HomeHeader />
        <HeroSection />
        <FlightSearchCard />
        <PromoBanner />
        <PopularDestinations />
        <BottomNavigation />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingBottom: 8 },
});
