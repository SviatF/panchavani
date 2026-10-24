'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,MapPin,ShieldAlert,Sun} from 'lucide-react';
import {CITY_OPTIONS,useResearchCity} from '@/components/city-selection';
import type {ApprovedCityDay} from '@/lib/public-panchang';
import guides from '@/data/city-guides.json';

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
 const [focusedDate,setFocusedDate]=useState<string|null>(null);
 const firstAllowed=monthShift(initialMonth,-12);
 const lastAllowed=monthShift(initialMonth,18);
 const days=useMemo(()=>monthCells(month,allApproved.filter(x=>x.cityId===cityId)),[month,allApproved,cityId]);
 const published=days.filter(x=>x?.reviewed).length;
 const label=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})
   .format(new Date(month+'-01T12:00:00Z'));
 const selected=CITY_OPTIONS.find(x=>x.id===cityId)??CITY_OPTIONS[0];
 const localGuide=guides[cityId as keyof typeof guides]??guides.delhi;
 const focusedDay=focusedDate?.startsWith(month+'-')?focusedDate:null;
 const civilDate=focusedDay?new Intl.DateTimeFormat('en-IN',{
   timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'
 }).format(new Date(focusedDay+'T12:00:00Z')):null;
 const move=(step:number)=>{
  const target=monthShift(month,step);
  if(target>=firstAllowed&&target<=lastAllowed){setMonth(target);setFocusedDate(null);}
 };
 return <section className="calendar-explorer" aria-labelledby="calendar-explorer-heading">
  <div className="calendar-explorer-heading">
   <div>
    <p className="section-eyebrow">CITY · MONTH · DATE</p>
    <h2 id="calendar-explorer-heading">Explore the calendar</h2>
    <p>Choose a city, explore its calendar and read practical local context. Verified dates will open full scientific Panchang values as they are independently released.</p>
   </div>
   <span className="calendar-count"><CheckCircle2 size={15}/>{published} verified days</span>
  </div>
  <div className="calendar-toolbar">
   <label className="calendar-city-label"><MapPin size={16}/> City
    <select value={cityId} onChange={e=>{
      const next=CITY_OPTIONS.find(x=>x.id===e.target.value);
      if(next){setCityId(next.id);setFocusedDate(null);}
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
      if(!cell.reviewed)return <button type="button"
        className={`calendar-cell is-unreviewed calendar-day-select${focusedDay===cell.date?' is-focused':''}`}
        key={cell.date} onClick={()=>setFocusedDate(cell.date)}
        aria-pressed={focusedDay===cell.date}
        aria-label={`Explore ${cell.date} in ${selected.label}: civil date only; Panchang values pending review`}>
       <strong>{cell.day}</strong><span>Explore date</span></button>;
      return <Link className="calendar-cell is-reviewed" key={cell.date}
        href={`/panchang/${cityId}/${cell.date}/`}
        aria-label={`Open verified ${selected.label} Panchang on ${cell.date}`}>
       <strong>{cell.day}</strong>
       <span>{cell.reviewed.panchang.tithi}</span>
       <small><Sun size={12}/> Reviewed</small>
      </Link>;
    })}
  </div>
  <section className="calendar-local-context" aria-live="polite">
   <p className="section-eyebrow">CITY-BASED READING GUIDE · {selected.region.toUpperCase()}</p>
   <h3>{civilDate?civilDate+' · '+selected.label:selected.label+' in '+label}</h3>
   <p className="calendar-local-lead">{localGuide.introduction}</p>
   <div className="calendar-local-question">
    <strong>{localGuide.question}</strong>
    <p>{localGuide.answer}</p>
   </div>
   <p>{localGuide.example}</p>
   {civilDate&&<p className="calendar-day-uncertainty">
    <ShieldAlert size={15} aria-hidden="true"/> Gregorian weekday and date are known; lunar Panchang, fasting, festival and Muhurat conclusions for this day are not yet independently released.
   </p>}
   <div className="calendar-source-links">
    {localGuide.sources.map(source=><a href={source.url} key={source.url}
       target="_blank" rel="noopener noreferrer">{source.label} <ArrowRight size={12}/></a>)}
    <Link href={`/panchang/${cityId}/`}>Read full {selected.label} guide <ArrowRight size={13}/></Link>
   </div>
  </section>
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
