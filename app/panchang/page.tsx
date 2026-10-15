import Link from 'next/link';
import {ArrowRight,MapPin,ShieldCheck} from 'lucide-react';
import {CITY_GUIDES,PILOT_CITY_IDS} from '@/lib/public-panchang';
export default function PanchangDirectory(){
 return <div className="page-width verified-hub">
  <p className="section-eyebrow">PANCHAVANI · LOCAL PANCHANG</p>
  <h1>Time belongs to a place.</h1>
  <p className="verified-intro">Explore how Hindu timekeeping combines the five Angas with sunrise at a specific location. The first three city guides are live; day-specific numbers appear only once scientific and editorial checks are complete.</p>
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
