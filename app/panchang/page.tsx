import Link from 'next/link';
import {ArrowRight,BookOpen,MapPin,ShieldCheck} from 'lucide-react';
import {CITY_GUIDES,CITY_GUIDE_IDS} from '@/lib/public-panchang';

export default function PanchangDirectory(){
 return <div className="page-width verified-hub editorial-city editorial-directory">
  <p className="section-eyebrow">PANCHAVANI · LOCAL PANCHANG</p>
  <h1>Choose your city</h1>
  <p className="verified-intro">The daily Panchang starts with a location. Select a city to understand local sunrise, Tithi transitions and which sources to compare.</p>
  <div className="editorial-directory-help">
   <BookOpen size={21} aria-hidden="true"/>
   <p><strong>Looking for a particular date?</strong> Only independently reviewed day records are published. Current city guides explain the method while day-by-day results complete verification.</p>
   <Link href="/learn/">The five Angas <ArrowRight size={15}/></Link>
  </div>
  <section aria-labelledby="city-list-title">
   <div className="editorial-directory-heading">
    <div><p className="section-eyebrow">TEN CITY GUIDES</p>
     <h2 id="city-list-title">Browse by location</h2></div>
    <span>India Standard Time (IST)</span>
   </div>
   <div className="verified-city-grid editorial-directory-grid">
    {CITY_GUIDE_IDS.map(id=>{
      const city=CITY_GUIDES[id];
      return <Link href={`/panchang/${id}/`} key={id} className="verified-city-card">
       <MapPin size={19} aria-hidden="true"/>
       <span className="section-eyebrow">{city.region}</span>
       <h3>{city.label}</h3>
       <span className="verified-link">Read the guide <ArrowRight size={16}/></span>
      </Link>;
    })}
   </div>
  </section>
  <div className="verified-method">
   <ShieldCheck size={21}/>
   <p>Local sunrise and astronomical events are separate from festival and Muhurat eligibility rules. Unapproved research results are not represented as verified daily advice.</p>
  </div>
 </div>;
}
