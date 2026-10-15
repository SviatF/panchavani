import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,BookOpen,CalendarDays,Clock3} from 'lucide-react';
import {approvedCityDays,CITY_GUIDES,PILOT_CITY_IDS,indiaTime} from '@/lib/public-panchang';
type Props={params:Promise<{city:string}>};
export function generateStaticParams(){return PILOT_CITY_IDS.map(city=>({city}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {city}=await params;
 if(!(city in CITY_GUIDES))return {robots:{index:false,follow:false}};
 const guide=CITY_GUIDES[city as keyof typeof CITY_GUIDES];
 return {title:guide.label+' Panchang — Local Calendar Guide',
  description:guide.metaDescription,robots:{index:false,follow:false},
  alternates:{canonical:`https://panchavani.com/panchang/${city}/`}};
}
export default async function CityPanchang({params}:Props){
 const {city}=await params;
 if(!(city in CITY_GUIDES))notFound();
 const guide=CITY_GUIDES[city as keyof typeof CITY_GUIDES];
 const releases=approvedCityDays().filter(x=>x.cityId===city).sort((a,b)=>b.date.localeCompare(a.date));
 return <div className="page-width verified-hub">
  <Link className="back-link" href="/panchang/"><ArrowLeft size={15}/> All locations</Link>
  <p className="section-eyebrow">PANCHAVANI · {guide.region.toUpperCase()}</p>
  <h1>{guide.label} Panchang</h1><p className="verified-intro">{guide.tagline}</p>
  <div className="verified-explain"><article><BookOpen size={21}/><h2>Start with local sunrise</h2><p>{guide.introduction}</p></article>
   <article><Clock3 size={21}/><h2>Why times can differ</h2><p>{guide.insight}</p></article>
   <article><CalendarDays size={21}/><h2>How to check a calendar date</h2><p>{guide.method}</p></article></div>
  <section className="verified-release"><div><p className="section-eyebrow">REVIEWED DAILY PANCHANG</p><h2>Available dates</h2></div>
  {releases.length?
   <div className="verified-dates">{releases.map(day=><div key={day.date} className="verified-day-row">
     <Link href={`/panchang/${city}/${day.date}/`} className="verified-day-link">{day.date} · {day.panchang.tithi} · {day.panchang.nakshatra}</Link>
     <span>Sunrise {indiaTime(day.sun.sunriseUtc)} IST</span>
    </div>)}</div>:
   <p className="verified-muted">There are no independently approved daily timing records for this city yet. Our research process is running; unpublished results are not presented as calendar facts.</p>}
  </section>
 </div>;
}
