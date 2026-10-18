'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import cityGuides from '@/data/city-guides.json';

// One canonical set for every part of the public site, including the header
// selector, search, homepage and the ten-city SEO release.
export const CITY_OPTIONS=Object.freeze([
 {id:'delhi',label:cityGuides.delhi.label,region:cityGuides.delhi.region},
 {id:'mumbai',label:cityGuides.mumbai.label,region:cityGuides.mumbai.region},
 {id:'kolkata',label:cityGuides.kolkata.label,region:cityGuides.kolkata.region},
 {id:'chennai',label:cityGuides.chennai.label,region:cityGuides.chennai.region},
 {id:'bengaluru',label:cityGuides.bengaluru.label,region:cityGuides.bengaluru.region},
 {id:'hyderabad',label:cityGuides.hyderabad.label,region:cityGuides.hyderabad.region},
 {id:'ahmedabad',label:cityGuides.ahmedabad.label,region:cityGuides.ahmedabad.region},
 {id:'pune',label:cityGuides.pune.label,region:cityGuides.pune.region},
 {id:'jaipur',label:cityGuides.jaipur.label,region:cityGuides.jaipur.region},
 {id:'varanasi',label:cityGuides.varanasi.label,region:cityGuides.varanasi.region}
] as const);
export type CityGuideId=typeof CITY_OPTIONS[number]['id'];
/** Legacy compatibility; this list is TEN site cities, not 3 research sites. */
export const PILOT_CITIES=CITY_OPTIONS;
export type PilotCityId=CityGuideId;
const STORAGE_KEY='panchavani-research-city';
type CitySelection={cityId:CityGuideId;setCityId:(id:CityGuideId)=>void};
const Context=createContext<CitySelection|null>(null);
export const isGuideCity=(id:string|null):id is CityGuideId=>
  CITY_OPTIONS.some(city=>city.id===id);
export function CitySelectionProvider({children}:{children:ReactNode}){
 const [cityId,setCityIdState]=useState<CityGuideId>('delhi');
 useEffect(()=>{
  try{
   const stored=window.localStorage.getItem(STORAGE_KEY);
   if(isGuideCity(stored))setCityIdState(stored);
  }catch{/* Client preferences are optional. */}
 },[]);
 const value=useMemo<CitySelection>(()=>({
  cityId,
  setCityId:(id:CityGuideId)=>{
   if(!isGuideCity(id))return;
   setCityIdState(id);
   try{window.localStorage.setItem(STORAGE_KEY,id)}catch{/* Nonessential. */}
  }
 }),[cityId]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useResearchCity():CitySelection{
 const value=useContext(Context);
 if(!value)throw new Error('City selector requires the provider');
 return value;
}
export function currentIndiaDate(now=new Date()):string{
 return new Intl.DateTimeFormat('en-IN',{
  timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'
 }).format(now);
}
