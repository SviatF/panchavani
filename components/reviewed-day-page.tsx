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
   <p className="verified-muted">Times are expressed in India Standard Time using
    the reviewed city-specific methodology. A lunar transition and an observance
    date are not necessarily the same thing.</p>
  </section>
  <section className="verified-release">
   <h2>Understanding this Panchang date</h2>
   <p>{approved.editorial.body}</p>
   <h2>What this means in {guide.label}</h2>
   <p>{approved.editorial.localMeaning}</p>
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
