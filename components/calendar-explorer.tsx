'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,MapPin,ShieldAlert,Sun} from 'lucide-react';
import {CITY_OPTIONS,useResearchCity} from '@/components/city-selection';
import type {ApprovedCityDay} from '@/lib/public-panchang';

export type CalendarDay={date:string;day:number;inMonth:true;reviewed:ApprovedCityDay|null};
export type CalendarCell=CalendarDay|null;
export const monthId=(year:number,month:number)=>`${year}-${String(month).padStart(2,'0')}`;
export function monthShift(ym:string,offset:number){
 const [y,m]=ym.split('-').map(Number);
 const v=new Date(Date.UTC(y,m-1+offset,1));
 return monthId(v.getUTCFullYear(),v.getUTCMonth()+1);
}
export function monthCells(ym:string,approved:ApprovedCityDay[]):CalendarCell[]{
 const [y,m]=ym.split('-').map(Number);
 if(!Number.isInteger(y)||y<2020||y>2099||!Number.isInteger(m)||m<1||m>12)
   throw new Error('Invalid month for city calendar');
 const count=new Date(Date.UTC(y,m,0)).getUTCDate();
 const leading=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;
 const indexed=new Map(approved.map(x=>[x.date,x]));
 return [
  ...Array.from({length:leading},()=>null),
  ...Array.from({length:count},(_,i)=>{
    const d=i+1;
    const date=`${ym}-${String(d).padStart(2,'0')}`;
    return {date,day:d,inMonth:true as const,reviewed:indexed.get(date)??null};
  })
 ];
}
const weekDays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function CalendarExplorer({allApproved,initialMonth}:{
 allApproved:ApprovedCityDay[];initialMonth:string
}){
 const {cityId,setCityId}=useResearchCity();
 const [month,setMonth]=useState(initialMonth);
 const firstAllowed=monthShift(initialMonth,-12);
 const lastAllowed=monthShift(initialMonth,18);
 const days=useMemo(()=>monthCells(month,allApproved.filter(x=>x.cityId===cityId)),[month,allApproved,cityId]);
 const published=days.filter(x=>x?.reviewed).length;
 const label=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})
   .format(new Date(month+'-01T12:00:00Z'));
 const selected=CITY_OPTIONS.find(x=>x.id===cityId)??CITY_OPTIONS[0];
 const move=(step:number)=>{
  const target=monthShift(month,step);
  if(target>=firstAllowed&&target<=lastAllowed)setMonth(target);
 };
 return <section className="calendar-explorer" aria-labelledby="calendar-explorer-heading">
  <div className="calendar-explorer-heading">
   <div>
    <p className="section-eyebrow">CITY · MONTH · DATE</p>
    <h2 id="calendar-explorer-heading">Explore the calendar</h2>
    <p>Select a location and month. Verified day entries open a full Panchang; unreviewed days show no invented calculations.</p>
   </div>
   <span className="calendar-count"><CheckCircle2 size={15}/>{published} verified days</span>
  </div>
  <div className="calendar-toolbar">
   <label className="calendar-city-label"><MapPin size={16}/> City
    <select value={cityId} onChange={e=>{
      const next=CITY_OPTIONS.find(x=>x.id===e.target.value);
      if(next)setCityId(next.id);
    }} aria-label="Choose Panchang city">
      {CITY_OPTIONS.map(x=><option key={x.id} value={x.id}>{x.label} · {x.region}</option>)}
    </select>
   </label>
   <div className="calendar-month-controls">
    <button type="button" onClick={()=>move(-1)} disabled={month<=firstAllowed}
     aria-label="Previous month"><ArrowLeft size={18}/></button>
    <span aria-live="polite">{label}</span>
    <button type="button" onClick={()=>move(1)} disabled={month>=lastAllowed}
     aria-label="Next month"><ArrowRight size={18}/></button>
   </div>
  </div>
  <div className="calendar-grid" role="group" aria-label={`${selected.label} calendar, ${label}`}>
    {weekDays.map(day=><span key={day} className="calendar-weekday">{day}</span>)}
    {days.map((cell,i)=>{
      if(!cell)return <span aria-hidden="true" className="calendar-blank" key={'blank-'+i}/>;
      if(!cell.reviewed)return <div className="calendar-cell is-unreviewed" key={cell.date}
        aria-label={`${cell.date}: independently reviewed Panchang unavailable`}>
       <strong>{cell.day}</strong><span>Not yet reviewed</span></div>;
      return <Link className="calendar-cell is-reviewed" key={cell.date}
        href={`/panchang/${cityId}/${cell.date}/`}
        aria-label={`Open verified ${selected.label} Panchang on ${cell.date}`}>
       <strong>{cell.day}</strong>
       <span>{cell.reviewed.panchang.tithi}</span>
       <small><Sun size={12}/> Reviewed</small>
      </Link>;
    })}
  </div>
  <div className="calendar-legend">
    <span><i className="calendar-key is-reviewed"/> Reviewed data</span>
    <span><i className="calendar-key"/> Not yet verified</span>
  </div>
  <div className="calendar-explorer-note">
   <ShieldAlert size={19}/>
   <div><strong>Why are some dates unavailable?</strong>
    <p>Research calculations are generated automatically, but the required scientific, local and editorial verification has not been completed for those dates. This calendar never infers festivals, fasting or auspicious Muhurat from an unapproved Tithi.</p>
    <Link href={`/panchang/${cityId}/`}>Read the {selected.label} city guide <ArrowRight size={15}/></Link>
   </div>
  </div>
 </section>;
}
