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
 return <div className="page-width verified-hub">
  <Link className="back-link" href="/panchang/"><ArrowLeft size={15}/> All locations</Link>
  <p className="section-eyebrow">PANCHAVANI · {guide.region.toUpperCase()}</p>
  <h1>{guide.label} Panchang</h1><p className="verified-intro">{guide.tagline}</p>
  <div className="verified-explain">
   <article><BookOpen size={21}/><h2>What local dawn means</h2><p>{guide.introduction}</p></article>
   <article><Clock3 size={21}/><h2>Why two sources can differ</h2><p>{guide.insight}</p></article>
   <article><CalendarDays size={21}/><h2>How to check an entry</h2><p>{guide.method}</p></article>
  </div>
  <section className="verified-release">
   <div><p className="section-eyebrow">PRACTICAL READER QUESTION</p><h2>{guide.question}</h2></div>
   <p>{guide.answer}</p>
   <div className="verified-method"><MapPin size={22}/><p>{guide.example}</p></div>
  </section>
  <section className="verified-release">
   <div><p className="section-eyebrow">CHECK THE REFERENCE</p><h2>Source and method references</h2></div>
   <p>These explain national timekeeping and astronomical calendar conventions. They do not certify an unreviewed city/day calculation or festival date.</p>
   <ul>{guide.sources.map(source=><li key={source.url}>
    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={13}/></a>
   </li>)}</ul>
  </section>
  <section className="verified-release"><div><p className="section-eyebrow">REVIEWED DAILY PANCHANG</p><h2>Available dates</h2></div>
  {releases.length?
   <div className="verified-dates">{releases.map(day=><div key={day.date} className="verified-day-row">
     <Link href={`/panchang/${city}/${day.date}/`} className="verified-day-link">{day.date} · {day.panchang.tithi} · {day.panchang.nakshatra}</Link>
     <span>Sunrise {indiaTime(day.sun.sunriseUtc)} IST</span>
    </div>)}</div>:
   <p className="verified-muted">Daily astronomical timings and ritual dates are not listed until their calculation method and observation points are independently approved. This city guide explains how to interpret and verify them.</p>}
  </section>
 </div>;
}
