import Link from 'next/link';
import {ArrowRight,MapPin,ShieldCheck} from 'lucide-react';
import {CITY_GUIDES,PILOT_CITY_IDS} from '@/lib/public-panchang';
export default function PanchangDirectory(){
 return <div className="page-width verified-hub">
  <p className="section-eyebrow">PANCHAVANI · LOCAL PANCHANG</p>
  <h1>Panchang by City</h1>
  <p className="verified-intro">Choose Delhi, Mumbai or Chennai to understand local sunrise, Tithi transitions and the calendar conventions that can change how a date is read. Daily timing records will appear when their sources and calculations are independently reviewed.</p>
  <div className="verified-city-grid">{PILOT_CITY_IDS.map(id=>{
   const city=CITY_GUIDES[id];
   return <Link href={`/panchang/${id}/`} key={id} className="verified-city-card">
    <MapPin size={20}/><span className="section-eyebrow">{city.region}</span>
    <h2>{city.label}</h2><p>{city.tagline}</p><span className="verified-link">Explore city <ArrowRight size={16}/></span>
   </Link>;
  })}</div>
  <div className="verified-method"><ShieldCheck size={23}/><p>We separate independently reviewed astronomical measurements from traditional observance rules. No unapproved calculation or AI draft is represented as public calendar advice.</p></div>
 </div>;
}
