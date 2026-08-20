import { Linking } from "react-native";
export async function openSafeExternalUrl(url:string){try{const parsed=new URL(url);if(parsed.protocol!=="https:"&&parsed.protocol!=="http:")return false;if(!await Linking.canOpenURL(parsed.toString()))return false;await Linking.openURL(parsed.toString());return true}catch{return false}}
