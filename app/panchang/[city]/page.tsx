import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,BookOpen,CalendarDays,Clock3,ExternalLink,MapPin} from 'lucide-react';
import {approvedCityDays,CITY_GUIDES,CITY_GUIDE_IDS,indiaTime} from '@/lib/public-panchang';
import {approvedSeoRoutes} from '@/lib/seo-release-manifest';

type Props={params:Promise<{city:string}>};
const approved=new Set(approvedSeoRoutes().map(x=>x.path));
const isCity=(city:string):city is keyof typeof CITY_GUIDES =>
  (CITY_GUIDE_IDS as readonly string[]).includes(city)&&Object.hasOwn(CITY_GUIDES,city);
export function generateStaticParams(){return CITY_GUIDE_IDS.map(city=>({city}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {city}=await params;
 if(!isCity(city))return {robots:{index:false,follow:false}};
 const guide=CITY_GUIDES[city];
 const path='/panchang/'+city+'/';
 const indexable=approved.has(path);
 return {
  title:guide.label+' Panchang — Sunrise & Local Calendar Guide',
  description:guide.metaDescription,
  robots:{index:indexable,follow:indexable},
  alternates:{canonical:'https://panchavani.com'+path},
  openGraph:{title:guide.label+' Panchang — Local Calendar Guide',
   description:guide.metaDescription,url:'https://panchavani.com'+path,type:'article'},
 };
}
export default async function CityPanchang({params}:Props){
 const {city}=await params;
 if(!isCity(city))notFound();
 const guide=CITY_GUIDES[city];
 const releases=approvedCityDays().filter(x=>x.cityId===city).sort((a,b)=>b.date.localeCompare(a.date));
 return <div className="page-width verified-hub editorial-city">
  <Link className="back-link" href="/panchang/"><ArrowLeft size={15}/> All cities</Link>
  <p className="section-eyebrow">PANCHAVANI · {guide.region.toUpperCase()}</p>
  <h1>{guide.label} Panchang</h1>
  <p className="verified-intro">{guide.tagline}</p>
  <section className="editorial-city-release" aria-labelledby="city-dates-title">
   <div className="editorial-city-release-header">
    <div><p className="section-eyebrow">DAILY PANCHANG</p><h2 id="city-dates-title">Choose a date</h2></div>
    <span className={releases.length?'editorial-data-tag is-available':'editorial-data-tag'}>
     {releases.length?`${releases.length} reviewed dates`:'No reviewed dates yet'}
    </span>
   </div>
   {releases.length?
    <div className="verified-dates">{releases.map(day=><div key={day.date} className="verified-day-row">
     <Link href={`/panchang/${city}/${day.date}/`} className="verified-day-link">
      {day.date} · {day.panchang.tithi} · {day.panchang.nakshatra}
     </Link>
     <span>Sunrise {indiaTime(day.sun.sunriseUtc)} IST</span>
    </div>)}</div>:
    <div className="editorial-empty-state">
     <CalendarDays size={24} aria-hidden="true"/>
     <div><h3>Date-by-date values are in scientific review</h3>
      <p>We cannot yet show verified Tithi, Nakshatra or sunrise for a specific day in {guide.label}. Below you can read how the local calendar works and which references to compare. No dates are invented.</p>
      <Link href="/learn/">Understand the five Angas →</Link>
     </div>
    </div>}
  </section>
  <section className="editorial-city-explainer" aria-labelledby="city-explainer-title">
   <p className="section-eyebrow">UNDERSTANDING THE LOCAL CALENDAR</p>
   <h2 id="city-explainer-title">What makes {guide.label} different?</h2>
   <div className="verified-explain">
    <article><BookOpen size={21}/><h3>Begin with sunrise</h3><p>{guide.introduction}</p></article>
    <article><Clock3 size={21}/><h3>Compare like with like</h3><p>{guide.insight}</p></article>
    <article><CalendarDays size={21}/><h3>Check the method</h3><p>{guide.method}</p></article>
   </div>
  </section>
  <section className="editorial-city-question">
   <p className="section-eyebrow">YOUR PRACTICAL QUESTION</p>
   <h2>{guide.question}</h2>
   <p>{guide.answer}</p>
   <details className="editorial-details"><summary>See a practical comparison</summary>
    <div className="verified-method"><MapPin size={22}/><p>{guide.example}</p></div>
   </details>
  </section>
  <section className="editorial-city-sources">
   <p className="section-eyebrow">REFERENCES</p>
   <h2>Read the source methods</h2>
   <p>These references help explain astronomical timekeeping. They do not independently approve any unpublished city/day, festival or Muhurat result.</p>
   <ul>{guide.sources.map(source=><li key={source.url}>
    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>
   </li>)}</ul>
  </section>
 </div>;
}
