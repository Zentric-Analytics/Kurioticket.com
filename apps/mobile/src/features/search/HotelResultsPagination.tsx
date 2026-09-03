import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildHotelResultsPaginationItems } from "../../../../../src/lib/hotels/hotelResultsPagination";
import { useAppTheme } from "../../theme/AppTheme";

export function HotelResultsPagination({ page, pages, disabled, onPage }: { page:number; pages:number; disabled:boolean; onPage:(page:number)=>void }) {
  const { theme } = useAppTheme();
  if (pages <= 1) return null;
  const button = (label:string, target:number, inactive:boolean, current=false) => <Pressable key={`${label}-${target}`} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: inactive, selected: current }} disabled={inactive} onPress={()=>onPage(target)} style={[styles.target,{borderColor:theme.border,backgroundColor:current?theme.background:theme.surface}]}><Text style={{color:inactive?theme.textSecondary:theme.textPrimary}}>{label}</Text></Pressable>;
  return <View accessibilityLabel="Hotel results pages" style={styles.row}>
    {button("Previous",page-1,disabled||page===1)}
    {buildHotelResultsPaginationItems(page,pages).map((item,index)=>item==="ellipsis"?<Text key={`ellipsis-${index}`} style={{color:theme.textSecondary}}>…</Text>:button(String(item),item,disabled,item===page))}
    {button("Next",page+1,disabled||page===pages)}
  </View>;
}
const styles=StyleSheet.create({row:{flexDirection:"row",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:6,paddingVertical:12},target:{minWidth:44,height:44,borderWidth:1,borderRadius:9,alignItems:"center",justifyContent:"center",paddingHorizontal:8}});
