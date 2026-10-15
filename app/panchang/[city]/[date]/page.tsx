import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft} from 'lucide-react';
import {approvedCityDay,approvedCityDays,cityDayRoute,indiaTime,CITY_GUIDES} from '@/lib/public-panchang';
type Props={params:Promise<{city:string;date:string}>};
export function generateStaticParams(){
 return approvedCityDays().map(x=>({city:x.cityId,date:x.date}));
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {city,date}=await params;
 const record=approvedCityDay(city,date);
 if(!record)return {robots:{index:false,follow:false}};
 return {title:`${CITY_GUIDES[record.cityId].label} Panchang for ${date}`,
  description:`Independently reviewed Tithi, Nakshatra, Yoga, Karana and local sunrise in ${CITY_GUIDES[record.cityId].label} on ${date}.`,
  alternates:{canonical:'https://panchavani.com'+cityDayRoute(record)},
  // Requires a separately authorized sitemap/release policy before index can turn true.
  robots:{index:false,follow:false}
 };
}
export default async function ApprovedDayPage({params}:Props){
 const {city,date}=await params,record=approvedCityDay(city,date);
 if(!record)notFound();
 const guide=CITY_GUIDES[record.cityId];
 return <div className="page-width verified-hub">
  <Link className="back-link" href={`/panchang/${record.cityId}/`}><ArrowLeft size={15}/>{guide.label} Panchang</Link>
  <p className="section-eyebrow">SCIENTIFICALLY & EDITORIALLY REVIEWED</p>
  <h1>{guide.label} Panchang · {date}</h1>
  <div className="verified-daily-grid">
   <article><span>Sunrise</span><strong>{indiaTime(record.sun.sunriseUtc)} IST</strong></article>
   <article><span>Sunset</span><strong>{indiaTime(record.sun.sunsetUtc)} IST</strong></article>
   {(['tithi','nakshatra','yoga','karana','vara','paksha'] as const).map(k=>
    <article key={k}><span>{k[0].toUpperCase()+k.slice(1)}</span><strong>{record.panchang[k]}</strong></article>)}
  </div>
  <section className="verified-release"><h2>Understanding this day</h2>
  <p>{record.editorial.localMeaning}</p><p>{record.editorial.body}</p>
  <p className="verified-muted">Methodological and source evidence reviewed. Ritual prescriptions are not inferred from astronomical values alone.</p></section>
 </div>;
}
