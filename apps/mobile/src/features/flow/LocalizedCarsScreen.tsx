import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { CarSearchPanel } from "./CarSearchPanel";
import { UnavailableNotice } from "./FlowPrimitives";
import { FlowIcon } from "./FlowIcon";
import { useFlowTheme } from "./flowStyles";
import { ResponsiveHero } from "./ResponsiveHero";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { carText } from "../search/carMobileLocalization";

export function LocalizedCarsScreen() {
  const params = useLocalSearchParams<{
    pickupLocation?: string | string[];
    dropoffLocation?: string | string[];
    pickupDate?: string | string[];
    pickupTime?: string | string[];
    dropoffDate?: string | string[];
    dropoffTime?: string | string[];
    driverAge?: string | string[];
  }>();
  const ft=useFlowTheme();
  const insets=useSafeAreaInsets();
  const {locale}=useMobileLocalization();
  const {availability,loading}=useFeatureAvailability();
  const productTitle=carText(locale,"cars","Cars");
  const heroTitle=carText(locale,"carsDesktopHeroTitle","Find the perfect car for your next trip");
  if(loading)return <SafeAreaView style={ft.styles.safe}><View style={ft.styles.scroll}><Text accessibilityRole="header" style={ft.styles.title}>{productTitle}</Text><UnavailableNotice text={carText(locale,"carsSearch.checkingAvailability","Checking car search availability…")}/></View></SafeAreaView>;
  if(!availability.carSearch)return <SafeAreaView style={ft.styles.safe}><View style={ft.styles.scroll}><Text accessibilityRole="header" style={ft.styles.title}>{productTitle}</Text><UnavailableNotice text={carText(locale,"carsSearch.unavailable","Car search is temporarily unavailable. Flights and hotels remain available.")}/></View></SafeAreaView>;
  return <SafeAreaView style={ft.styles.safe} edges={[]}>
    <StatusBar style={ft.theme.dark?"light":"dark"} translucent backgroundColor="transparent"/>
    <ScrollView alwaysBounceVertical={false} bounces={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" overScrollMode="never">
      <View style={styles.heroShell}>
        <ResponsiveHero source={require("../../../assets/heroes/cars-suv.png")} sourceWidth={308} sourceHeight={596} height={290} focalY={0.66} accessibilityLabel={carText(locale,"carsHeroImageAlt","Cars hero image")}/>
        <View style={[styles.heroHeader,{paddingTop:insets.top+4}]}>
          <View style={styles.heroActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={carText(locale,"back","Go back")} onPress={()=>router.back()} style={ft.styles.iconButton}><FlowIcon name="back"/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={carText(locale,"notifications","Notifications")} onPress={()=>router.push("/notifications")} style={ft.styles.iconButton}><FlowIcon name="bell"/></Pressable>
          </View>
          <Text accessibilityRole="header" style={styles.heroTitle}>{heroTitle}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={[ft.styles.sectionTitle,styles.productTitle]}>{productTitle}</Text>
        <CarSearchPanel params={params} requireManualDetails/>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  page:{paddingHorizontal:9,paddingBottom:28},
  heroShell:{height:290,marginHorizontal:-9,overflow:"hidden"},
  heroHeader:{...StyleSheet.absoluteFillObject,paddingHorizontal:5},
  heroActions:{flexDirection:"row",justifyContent:"space-between"},
  heroTitle:{color:"white",fontSize:25,lineHeight:31,fontWeight:"800",marginHorizontal:9,marginTop:8,maxWidth:330},
  body:{marginTop:-22,gap:12},
  productTitle:{paddingHorizontal:8,paddingTop:4},
});
