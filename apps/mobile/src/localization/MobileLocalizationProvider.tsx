import { createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from "react";
import { AppState,Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { resolveMarketplaceContext,type MarketplaceContext } from "../../../../src/shared/marketplace/marketplaceContext";
import { travelApi,type CustomizationPreferences } from "../api/travelApi";
import { readGuestCurrencyPreference,writeCurrency,writeGuestCurrency } from "../storage/preferenceStorage";
import { readSession,subscribeSession } from "../storage/sessionStorage";
import { dictionaries,mobileLocales,normalizeMobileLocale,type MobileLocale,type MobileTranslationKey } from "./mobileLocalizationCatalog";
import { translatedMobileValue } from "./mobileTranslationCorrections";
import { CustomizationCoordinator,type PreferenceValue } from "./customizationCoordinator";

const LOCALE_KEY="kurioticket.locale.guest.v1",MARKET_KEY="kurioticket.market.guest.v1";
const accountKey=(userId:string)=>`kurioticket.customization.v1.${encodeURIComponent(userId)}`;
const get=async(key:string)=>Platform.OS==="web"?(globalThis as {localStorage?:Storage}).localStorage?.getItem(key)||null:SecureStore.getItemAsync(key);
const set=async(key:string,value:string)=>{if(Platform.OS==="web")(globalThis as {localStorage?:Storage}).localStorage?.setItem(key,value);else await SecureStore.setItemAsync(key,value);};

async function readGuest():Promise<PreferenceValue>{
  const locale=normalizeMobileLocale(await get(LOCALE_KEY));
  const selectedMarket=await get(MARKET_KEY),explicitCurrency=await readGuestCurrencyPreference();
  let detectedMarket:string|null=null;
  if(!selectedMarket)try{detectedMarket=(await travelApi.location()).countryCode;}catch{detectedMarket=null;}
  const marketplace=resolveMarketplaceContext({locale,selectedMarket,detectedMarket,explicitCurrency});
  return{locale,currency:marketplace.displayCurrency,region:marketplace.marketCountryCode,marketplaceSource:marketplace.source,hasExplicitMarket:marketplace.hasExplicitMarket,hasExplicitCurrency:marketplace.hasExplicitCurrency};
}
async function writeGuest(value:PreferenceValue){
  const writes:Promise<unknown>[]=[set(LOCALE_KEY,value.locale)];
  if(value.hasExplicitMarket&&value.region)writes.push(set(MARKET_KEY,value.region));
  if(value.hasExplicitCurrency)writes.push(writeGuestCurrency(value.currency));
  await Promise.all(writes);
}
async function readCache(userId:string){try{const raw=await get(accountKey(userId));return raw?JSON.parse(raw) as PreferenceValue:null;}catch{return null;}}

type Value={locale:MobileLocale;currency:string;direction:"ltr"|"rtl";marketplace:MarketplaceContext;t:(key:MobileTranslationKey)=>string;setLocale:(value:MobileLocale)=>Promise<void>;setCurrency:(value:string)=>Promise<void>;setMarket:(value:string)=>Promise<void>;refresh:()=>Promise<void>};
const Context=createContext<Value|null>(null);

export function MobileLocalizationProvider({children}:{children:ReactNode}){
  const[state,setState]=useState<PreferenceValue>({locale:"en-us",currency:"USD",region:"US",marketplaceSource:"FALLBACK",hasExplicitMarket:false,hasExplicitCurrency:false});
  const coordinator=useRef<CustomizationCoordinator|null>(null);
  if(!coordinator.current)coordinator.current=new CustomizationCoordinator({
    readGuest,writeGuest,readAccountCache:readCache,writeAccountCache:async(userId,value)=>set(accountKey(userId),JSON.stringify(value)),
    fetchAccount:async()=>{const response=await travelApi.customizationPreferences();return{hasPreferences:response.hasPreferences,preferences:{locale:normalizeMobileLocale(response.preferences.locale),currency:response.preferences.currency,region:response.preferences.region,marketplaceSource:"ACCOUNT",hasExplicitMarket:true,hasExplicitCurrency:true}};},
    patchAccount:async patch=>{
      const accountPatch:Partial<CustomizationPreferences>={};
      if(patch.locale)accountPatch.locale=patch.locale;
      if(patch.currency)accountPatch.currency=patch.currency;
      if(patch.region)accountPatch.region=patch.region;
      const response=await travelApi.updateCustomizationPreferences(accountPatch);
      return{locale:normalizeMobileLocale(response.preferences.locale),currency:response.preferences.currency,region:response.preferences.region,marketplaceSource:"ACCOUNT",hasExplicitMarket:true,hasExplicitCurrency:true};
    }
  },value=>{setState(value);void writeCurrency(value.currency);});
  useEffect(()=>{const transition=(session:Awaited<ReturnType<typeof readSession>>)=>void coordinator.current!.transition({userId:session?.user.id||null});void readSession().then(transition);const unsubscribe=subscribeSession(transition);const appState=AppState.addEventListener("change",next=>{if(next==="active")void coordinator.current!.refresh();});return()=>{unsubscribe();appState.remove();};},[]);
  const marketplace=useMemo(()=>resolveMarketplaceContext({locale:mobileLocales.find(option=>option.code===state.locale)!.intl,accountMarket:state.marketplaceSource==="ACCOUNT"?state.region:null,selectedMarket:state.marketplaceSource==="USER"?state.region:null,detectedMarket:state.marketplaceSource==="DETECTED"?state.region:null,accountCurrency:state.marketplaceSource==="ACCOUNT"?state.currency:null,explicitCurrency:state.hasExplicitCurrency?state.currency:null}),[state]);
  const value=useMemo<Value>(()=>({locale:state.locale,currency:marketplace.displayCurrency,direction:mobileLocales.find(option=>option.code===state.locale)!.direction,marketplace,t:key=>translatedMobileValue(state.locale,key,dictionaries[state.locale][key]),setLocale:async locale=>coordinator.current!.mutate({locale}),setCurrency:async currency=>coordinator.current!.mutate({currency,hasExplicitCurrency:true}),setMarket:async region=>{const next=resolveMarketplaceContext({locale:marketplace.locale,selectedMarket:region,explicitCurrency:state.hasExplicitCurrency?state.currency:null});await coordinator.current!.mutate({region:next.marketCountryCode,currency:next.displayCurrency,marketplaceSource:"USER",hasExplicitMarket:true});},refresh:()=>coordinator.current!.refresh()}),[marketplace,state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMobileLocalization(){const value=useContext(Context);if(!value)throw new Error("Missing MobileLocalizationProvider");return value;}
export function useMobileMarketplace(){return useMobileLocalization().marketplace;}
