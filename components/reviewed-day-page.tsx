import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,CalendarDays,Clock3,ShieldCheck} from 'lucide-react';
import {
 approvedCityDay,approvedCityDays,CITY_GUIDES,indiaTime
} from '@/lib/public-panchang';

/** Shared renderer called from build-generated physical date routes.
 * Empty approval manifests produce zero pages, never placeholder dates.
 */
const localStamp=(utc:string)=>new Intl.DateTimeFormat('en-IN',{
 timeZone:'Asia/Kolkata',day:'2-digit',month:'short',
 hour:'2-digit',minute:'2-digit',hour12:false
}).format(new Date(utc))+' IST';
const title=(name:string,date:string)=>`${name} Panchang ${date} – Tithi, Nakshatra & Sunrise`;
export function reviewedDayMetadata(city:string,date:string):Metadata{
 const approved=approvedCityDay(city,date);
 if(!approved)return {robots:{index:false,follow:false}};
 const name=CITY_GUIDES[approved.cityId].label;
 return {
  title:title(name,date),
  description:`Reviewed ${name} Panchang for ${date}: sunrise ${indiaTime(approved.sun.sunriseUtc)} IST, Tithi ${approved.panchang.tithi}, Nakshatra ${approved.panchang.nakshatra} and local calendar context.`,
  alternates:{canonical:`https://panchavani.com/panchang/${city}/${date}/`},
  // Indexing requires the independent per-page SEO release manifest.
  robots:{index:false,follow:false}
 };
}
export function ReviewedDayPage({city,date}:{city:string;date:string}){
 const approved=approvedCityDay(city,date);
 if(!approved||!(city in CITY_GUIDES))notFound();
 const guide=CITY_GUIDES[approved.cityId];
 const prior=approvedCityDays()
   .filter(x=>x.cityId===city&&x.date<date)
   .sort((a,b)=>b.date.localeCompare(a.date))[0];
 const following=approvedCityDays()
   .filter(x=>x.cityId===city&&x.date>date)
   .sort((a,b)=>a.date.localeCompare(b.date))[0];
 const fields=[
  ['Tithi',approved.panchang.tithi],
  ['Nakshatra',approved.panchang.nakshatra],
  ['Yoga',approved.panchang.yoga],
  ['Karana',approved.panchang.karana],
  ['Vara',approved.panchang.vara],
  ['Paksha',approved.panchang.paksha]
 ];
 const timelineKinds=['tithi','karana','nakshatra','yoga'] as const;
 const firstSunrise=Date.parse(approved.sun.sunriseUtc);
 const sunset=Date.parse(approved.sun.sunsetUtc);
 const lastSunrise=Date.parse(approved.sun.nextSunriseUtc);
 const timeline=timelineKinds.flatMap(kind=>
  approved.transitions[kind].slice(0,-1).map((segment,index)=>({
    kind,from:segment.name,to:approved.transitions[kind][index+1].name,
    at:segment.endUtc,
    daylight:Date.parse(segment.endUtc)>=firstSunrise&&Date.parse(segment.endUtc)<sunset
  }))
 ).filter(x=>Date.parse(x.at)<lastSunrise).sort((a,b)=>
   Date.parse(a.at)-Date.parse(b.at));
 return <div className="page-width verified-hub approved-day">
  <Link className="back-link" href={`/panchang/${city}/`}>
   <ArrowLeft size={15}/> {guide.label} Panchang
  </Link>
  <p className="section-eyebrow">PANCHAVANI · REVIEWED CITY-DAY CALENDAR</p>
  <h1>{guide.label} Panchang</h1>
  <p className="verified-intro"><CalendarDays size={19}/> {date} ·
   {approved.timezone} · Calendar data reviewed for {guide.label}
  </p>
  <div className="verified-daily-grid">
   {fields.map(([name,value])=><article key={name}>
    <span>{name}</span><strong>{value}</strong>
   </article>)}
  </div>
  <section className="verified-release">
   <h2><Clock3 size={22}/> Local sunrise and sunset</h2>
   <p><strong>Sunrise:</strong> {indiaTime(approved.sun.sunriseUtc)} IST</p>
   <p><strong>Sunset:</strong> {indiaTime(approved.sun.sunsetUtc)} IST</p>
   <p><strong>Following sunrise:</strong> {localStamp(approved.sun.nextSunriseUtc)}</p>
   <p className="verified-muted">Times are expressed in India Standard Time using
    the reviewed city-specific methodology. A lunar transition and an observance
    date are not necessarily the same thing.</p>
  </section>
  <section className="verified-release">
   <h2>What changes between local sunrises?</h2>
   {timeline.length?
     <div className="verified-dates">{timeline.map((event,index)=>
       <article key={event.kind+event.at+index} className="verified-day-row">
         <strong>{event.kind.toUpperCase()} · {event.from} → {event.to}</strong>
         <span>{localStamp(event.at)} · {event.daylight?'During daylight':'Outside daylight'}</span>
       </article>)}</div>:
     <p>These four Panchang elements remain unchanged between this sunrise
      and the following local sunrise under the stated reviewed methodology.</p>}
   <p className="verified-muted">The lunar and sidereal transitions are astronomical
     instants expressed in IST. City-specific sunrise and the applicable observance
     rules determine how they are interpreted; a transition does not independently
     establish a festival, vrata or Muhurat date.</p>
  </section>
  <section className="verified-release">
   <h2>Understanding this Panchang date</h2>
   <p>{approved.editorial.body}</p>
   <h2>What this means in {guide.label}</h2>
   <p>{approved.editorial.localMeaning}</p>
   <h2>{approved.editorial.readerQuestion}</h2>
   <p>{approved.editorial.readerAnswer}</p>
  </section>
  <section className="verified-release">
   <h2>Verified local context and sources</h2>
   {approved.editorial.cityEvidence.map((e,i)=>
     <article key={e.factId+i}>
       <p>{e.localRelevance}</p>
       <p><a href={e.sourceUrl} rel="noopener noreferrer"
         target="_blank">Read supporting source ↗</a></p>
     </article>)}
  </section>
  <section className="verified-method">
   <ShieldCheck size={23}/><div>
    <p><strong>Evidence reviewed.</strong> This city/date was separately
     approved with scientific, local-calendar and editorial evidence.
     Source record: <code>{approved.sourceRecordHash.slice(0,16)}</code>.
     Source references are retained in its approved release package.</p>
   </div>
  </section>
  <nav className="verified-date-nav" aria-label="Other reviewed dates">
   {prior?<Link href={`/panchang/${city}/${prior.date}/`}>← {prior.date}</Link>:<span/>}
   <Link href={`/panchang/${city}/`}>All reviewed dates</Link>
   {following?<Link href={`/panchang/${city}/${following.date}/`}>{following.date} →</Link>:<span/>}
  </nav>
 </div>;
}
