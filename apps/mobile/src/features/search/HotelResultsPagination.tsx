import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildHotelResultsPaginationItems } from "../../../../../src/lib/hotels/hotelResultsPagination";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";

export function HotelResultsPagination({ page, pages, disabled, onPage }: { page:number; pages:number; disabled:boolean; onPage:(page:number)=>void }) {
  const { theme } = useAppTheme();
  if (pages <= 1) return null;
  const button = (label:string, target:number, inactive:boolean, current=false, accessibilityLabel=label) => <Pressable key={`${label}-${target}`} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: inactive, selected: current }} disabled={inactive} onPress={()=>onPage(target)} style={[styles.target,{borderColor:theme.border,backgroundColor:current?theme.background:theme.surface}]}><Text style={[styles.targetText,{color:inactive?theme.textSecondary:theme.textPrimary},current&&styles.currentText]}>{label}</Text></Pressable>;
  const pagesToShow = buildHotelResultsPaginationItems(page,pages,true);
  return <View accessibilityLabel="Hotel results pages" style={styles.row}>
    {button("Previous",page-1,disabled||page===1,false,"Previous hotel results page")}
    {pagesToShow.map(item=>button(String(item),item,disabled,item===page,`Hotel results page ${item}`))}
    {button("Next",page+1,disabled||page===pages,false,"Next hotel results page")}
  </View>;
}
const styles=StyleSheet.create({row:{flexDirection:"row",flexWrap:"nowrap",justifyContent:"center",alignItems:"center",gap:6,paddingHorizontal:8,paddingVertical:12},target:{minWidth:40,height:40,borderWidth:1,borderRadius:9,alignItems:"center",justifyContent:"center",paddingHorizontal:8},targetText:{fontSize:12,lineHeight:16,fontWeight:"500",fontFamily:appFonts.medium},currentText:{fontWeight:"700",fontFamily:appFonts.bold}});
