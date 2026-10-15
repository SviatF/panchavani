'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';

export type PilotCityId='delhi'|'mumbai'|'chennai';
export const PILOT_CITIES=Object.freeze([
 {id:'delhi' as const,label:'Delhi',region:'NCT'},
 {id:'mumbai' as const,label:'Mumbai',region:'Maharashtra'},
 {id:'chennai' as const,label:'Chennai',region:'Tamil Nadu'},
]);
const key='panchavani-research-city';
type CitySelection={cityId:PilotCityId;setCityId:(id:PilotCityId)=>void};
const Context=createContext<CitySelection|null>(null);
const isPilotCity=(x:string|null):x is PilotCityId=>PILOT_CITIES.some(c=>c.id===x);
export function CitySelectionProvider({children}:{children:ReactNode}){
 const [cityId,setCityIdState]=useState<PilotCityId>('delhi');
 useEffect(()=>{
  try{const stored=window.localStorage.getItem(key);if(isPilotCity(stored))setCityIdState(stored);}catch{/* optional preference */}
 },[]);
 const value=useMemo(()=>({cityId,setCityId:(id:PilotCityId)=>{
  if(!isPilotCity(id))return;
  setCityIdState(id);
  try{window.localStorage.setItem(key,id);}catch{/* optional preference */}
 }}),[cityId]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useResearchCity():CitySelection{
 const value=useContext(Context);
 if(!value)throw new Error('Research city selection requires its provider');
 return value;
}
export function currentIndiaDate(now=new Date()):string{
 return new Intl.DateTimeFormat('en-IN',{
  timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'
 }).format(now);
}
