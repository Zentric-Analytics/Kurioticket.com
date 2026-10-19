import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import esbuild from 'esbuild';
const harness=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(harness,'../../..'), scratch=process.env.PREVIEW_CACHE_DIR??path.join(os.tmpdir(),'kurioticket-native-flight-preview');
const require=createRequire(path.join(root,'package.json'));
const ts=require('typescript');
if(!process.env.BEFORE_CHECKOUT) throw new Error('Set BEFORE_CHECKOUT to a checkout/archive of starting dev 0a9a4b9ab9c32de6e853dddc7cbf9d0867775910');
const roots={before:path.resolve(process.env.BEFORE_CHECKOUT),after:root};
fs.mkdirSync(scratch,{recursive:true});
const select=(source,names)=>{
 const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 return ast.statements.filter(n=>names.includes(n.name?.text)||n.declarationList?.declarations.some(d=>names.includes(d.name.text))).map(n=>n.getText(ast)).join('\n');
};
const theme=fs.readFileSync(root+'/apps/mobile/src/theme/AppTheme.tsx','utf8');
fs.writeFileSync(scratch+'/theme.tsx',select(theme,['lightTheme'])+'\nexport function useAppTheme(){return {theme:lightTheme,darkMode:false,setDarkMode:async()=>{}}}');
fs.writeFileSync(scratch+'/localization.ts',`export function useMobileLocalization(){return {locale:'en-us', t:(key)=>({cancel:'Cancel',save:'Save'})[key]??key}}`);
fs.writeFileSync(scratch+'/router.ts',`export const router={back(){},push(){}};export const useFocusEffect=()=>{};`);
fs.writeFileSync(scratch+'/safe.tsx',`import React from 'react';import {View} from 'react-native';export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaProvider=({children})=><View style={{flex:1}}>{children}</View>;`);
fs.writeFileSync(scratch+'/blur.tsx',`import React from 'react';import {View} from 'react-native';export const BlurView=({intensity,tint,experimentalBlurMethod,...props})=><View {...props}/>;export const GlassView=BlurView;export const isGlassEffectAPIAvailable=()=>false;export const isLiquidGlassAvailable=()=>false;`);
fs.writeFileSync(scratch+'/svg.tsx',`import React from 'react';export default function Svg({children,...p}){return <svg {...p}>{children}</svg>};export const Path=p=><path {...p}/>;export const Circle=p=><circle {...p}/>;export const Rect=p=><rect {...p}/>;export const Line=p=><line {...p}/>;export const Ellipse=p=><ellipse {...p}/>;export const G=p=><g {...p}/>;export const Text=p=><text {...p}/>;export const SvgUri=()=>null;`);
for(const [version,base] of Object.entries(roots)){
 const dir=base+'/apps/mobile/src/features/search';
 const screen=fs.readFileSync(dir+'/ApprovedResultsScreen.tsx','utf8');
 const funcs=select(screen,['FlightResultsHeader','FlightCard','FlightJourneyRow','FlightResultsSummaryRow','s0','flightSupportText','one']);
 const hook=version==='after'?`import {useFlightResultsTheme as useAppTheme,useFlightResultsUi,FlightResultsPresentationProvider} from '${dir}/FlightResultsPresentationContext';import {flightResultsColors} from '${dir}/flightResultsPresentation';`:`import {useAppTheme} from '${scratch}/theme';`;
 const imports=`import React,{useEffect} from 'react';import {View,Text,Pressable,StyleSheet,Platform} from 'react-native';import {router} from 'expo-router';import {useSafeAreaInsets} from 'react-native-safe-area-context';import {ArrowLeft,SquarePen,Luggage,Armchair,FileText,ChevronRight,PlaneTakeoff} from 'lucide-react-native';
 import {ui as sharedUi,clock} from '${dir}/SearchUi';const ui=sharedUi;
 import {DetailGlassSurface} from '${dir}/DetailGlassSurface';import {AirlineLogo} from '${dir}/AirlineLogo';
 import {appFonts} from '${base}/apps/mobile/src/theme/typography';import {colors} from '${base}/apps/mobile/src/theme/tokens';
 import {formatCabinClass,summarizeBaggage,summarizeFareRules} from '${dir}/flightCardSummaries';
 import {flightCardJourneys,flightCardJourneyAccessibility} from '${dir}/flightCardLegs';
 import {flightOperatingCarrierPresentation} from '${dir}/flightOperatingCarrier';
 import {flightMainPriceBasis,flightProviderFarePresentation} from '${dir}/flightPriceBasis';
 import {buildFlightDetailParams} from '${dir}/flightDetailNavigation';
 import {flightResultsCopy} from '${dir}/flightResultsSummary';
 import {flightResultCountLabel} from '${dir}/flightResultCount';
 import {providerLocalFlightDate} from '${dir}/flightArrivalDayOffset';
 import {mobileLocales} from '${base}/apps/mobile/src/localization/mobileLocalizationCatalog';
 const logFlightSearchCheckpoint=()=>{};\n`;
 fs.writeFileSync(scratch+`/components-${version}.tsx`,imports+hook+'\n'+funcs+'\nexport {FlightResultsHeader,FlightCard,FlightResultsSummaryRow,s0};');
 const alert=fs.readFileSync(dir+'/HotelPriceAlert.tsx','utf8');
 const begin=alert.indexOf('  return (\n    <View\n      accessibilityLabel={alertTitle}');
 const end=alert.indexOf('      <Modal',begin);
 fs.writeFileSync(scratch+`/alert-${version}.tsx`,`import React from 'react';import {View,Text,Switch,StyleSheet,Platform,ActivityIndicator} from 'react-native';import {Bell} from 'lucide-react-native';import {appFonts} from '${base}/apps/mobile/src/theme/typography';import {ui as sharedUi} from '${dir}/SearchUi';const ui=sharedUi;${hook}\n${select(alert,['styles'])}\nexport function AlertPreview(){const {theme}=useAppTheme();const flight=true,alertTitle='Track this flight price',pending=false,isTracking=false,toggleDisabled=false,loadingAlert=false;const handleToggle=()=>{};${alert.slice(begin,end)}</View>);}`);
 const after=version==='after';
 const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {View,Text} from 'react-native';
 import {FlightResultsHeader,FlightCard,FlightResultsSummaryRow,s0} from './components-${version}';import {AlertPreview} from './alert-${version}';
 import {DateStrip} from '${dir}/SearchUi';import {FlightResultsQuickControls} from '${dir}/FlightResultsQuickControls';
 import {FlightFilterSheet} from '${dir}/FlightFilterSheet';import {FlightSortSheet} from '${dir}/FlightSortSheet';
 import {emptyFlightFilters,flightFilterOptions,filterAndSortFlights,clearFlightQuickFilterGroup} from '${roots.after}/apps/mobile/src/features/search/flightFilters';
 import {visualFlights} from '${dir}/visualFixtures';
 ${after?`import {FlightResultsPresentationProvider} from '${dir}/FlightResultsPresentationContext';`:''}
 const flights=visualFlights.map((f,i)=>({...f,departureTime:f.departureTime.replace('2026-08-20','2026-11-21'),arrivalTime:f.arrivalTime.replace('2026-08-21','2026-11-22'),legs:f.legs?.slice(0,1).map(l=>({...l,departureTime:l.departureTime.replace('2026-08-20','2026-11-21'),arrivalTime:l.arrivalTime.replace('2026-08-21','2026-11-22')}))}));
 const query=new URLSearchParams(location.search);const selected=query.get('selected')==='1';
 function Preview(){const [filters,setFilters]=useState({...emptyFlightFilters(),airlines:selected?['Delta Air Lines']:[],stops:selected?['nonstop']:[]});const [sheet,setSheet]=useState(query.get('sheet'));const prices=Object.fromEntries(['18','19','20','21','22','23','24','25','26','27'].map((d,i)=>['2026-11-'+d,{amount:510+i*10,formatted:'$'+(510+i*10)}]));
 const dates=<DateStrip date='2026-11-21' priceByDate={prices} flightResults nearbyIntelligence currency='USD' displayCurrency='USD' searchIdentity='preview-fixture' onSelect={()=>{}}/>;
 const visibleFlights=filterAndSortFlights(flights,filters,'best',f=>f.price);const rail=<FlightResultsQuickControls sort='best' activeFilterCount={filters.airlines.length+filters.stops.length} airlineCount={filters.airlines.length} airportCount={0} stopsCount={filters.stops.length} openSheetKind={sheet} openSheet={setSheet} clearGroup={g=>setFilters(f=>clearFlightQuickFilterGroup(f,g))}/>;
 return <View style={{backgroundColor:'#F5F7FB',minHeight:'100%'}}><FlightResultsHeader route='JFK → LHR' secondaryLine='One-way · Sat, Nov 21, 2026 · 1 adult · Economy' onEdit={()=>{}} backgroundColor='#F5F7FB'/>
 ${after?`{rail}<View style={s0.flightResultsIntro}>{dates}`:`{dates}{rail}<View style={s0.flightResultsIntro}>`}
 <View style={s0.flightAlertOuter}><AlertPreview/></View><FlightResultsSummaryRow count={visibleFlights.length}/></View>
 {visibleFlights.map((r,i)=><View key={r.id} style={s0.flightCardItem}><FlightCard result={r} displayPrice={{formatted:'$'+r.price+'.00',amount:r.price,currency:'USD'}} params={{tripType:'one-way'}} locale='en-us' logInitialMount={false} highlight={i===0?'Best':undefined}/></View>)}
 <FlightFilterSheet visible={Boolean(sheet)&&sheet!=='sort'} section={sheet??'all'} filters={filters} options={flightFilterOptions(flights,{currency:'USD',valueForResult:f=>f.price})} priceValue={f=>f.price} results={flights} currency='USD' priceFilteringReady onChange={setFilters} onClose={()=>setSheet(null)} onComplete={()=>setSheet(null)}/>
 <FlightSortSheet visible={sheet==='sort'} sort='price' onApply={()=>setSheet(null)} onClose={()=>setSheet(null)}/>
 </View>};
 createRoot(document.getElementById('root')).render(${after?'<FlightResultsPresentationProvider><Preview/></FlightResultsPresentationProvider>':'<Preview/>'});`;
 fs.writeFileSync(scratch+`/entry-${version}.tsx`,entry);
 const plugin={name:'preview-platform-adapters',setup(build){
  build.onResolve({filter:/^(react|react-dom\/client|react-native|lucide-react-native)$/},args=>({path:args.path==='react-native'?harness+'/node_modules/react-native-web/dist/index.js':args.path==='lucide-react-native'?root+'/node_modules/lucide-react/dist/esm/lucide-react.mjs':args.path==='react-dom/client'?harness+'/node_modules/react-dom/client.js':harness+'/node_modules/react/index.js'}));
  build.onResolve({filter:/AppTheme$/},()=>({path:scratch+'/theme.tsx'}));
  build.onResolve({filter:/MobileLocalizationProvider$/},()=>({path:scratch+'/localization.ts'}));
  for(const [name,file] of [['expo-router','router.ts'],['react-native-safe-area-context','safe.tsx'],['expo-blur','blur.tsx'],['expo-glass-effect','blur.tsx'],['react-native-svg','svg.tsx']])build.onResolve({filter:new RegExp('^'+name+'$')},()=>({path:scratch+'/'+file}));
 }};
 await esbuild.build({entryPoints:[scratch+`/entry-${version}.tsx`],outfile:scratch+`/dist/${version}.js`,bundle:true,format:'iife',jsx:'automatic',plugins:[plugin],nodePaths:[harness+'/node_modules',root+'/node_modules'],loader:{'.png':'file','.jpg':'file'},define:{'process.env.NODE_ENV':'"development"','process.env.EXPO_PUBLIC_DISABLE_REMOTE_AIRLINE_SVG':'"1"'},logLevel:'warning'});
}
