import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,CalendarDays,Clock3,Info,ExternalLink,FlaskConical,ArrowRight} from 'lucide-react';
import {IST,publicResearchPilotDays,researchPilotDay} from '@/lib/research-pilot';

type Params={params:Promise<{city:string;date:string}>};
const KINDS=['tithi','karana','nakshatra','yoga'] as const;
const NAME:Record<string,string>={tithi:'Tithi',karana:'Karana',nakshatra:'Nakshatra',yoga:'Yoga'};
const DESC:Record<string,string>={
 tithi:'One lunar day represents a successive 12° interval of the geocentric Sun–Moon separation.',
 karana:'Each 6° half of a Tithi has its own boundary; the physical crossing is geocentric.',
 nakshatra:'Moon position in the sidereal 27-sector circle, subject to the adopted ayanamsa.',
 yoga:'Combination of solar and lunar sidereal longitudes under the provisional reference frame.'
};
export const dynamicParams=false;
export function generateStaticParams(){
 return publicResearchPilotDays().map(row=>({city:row.cityId,date:row.date}));
}
export async function generateMetadata({params}:Params):Promise<Metadata>{
 const {city,date}=await params;
 const row=researchPilotDay(city,date);
 if(!row)return {robots:{index:false,follow:false}};
 const title='Delhi Panchang research preview — '+date;
 const description='Research-only Delhi Panchang lunar and sunrise calculation for '+date+
 '. Provisional model, unreviewed city coordinates, no festival or ceremony recommendations.';
 return {title,description,robots:{index:false,follow:true},
  alternates:{canonical:'https://panchavani.com/research/panchang/delhi/'+date+'/'},
  openGraph:{title,description,type:'article',
   url:'https://panchavani.com/research/panchang/delhi/'+date+'/'}};
}
export default async function ResearchPanchang({params}:Params){
 const {city,date}=await params;
 const d=researchPilotDay(city,date);
 if(!d)notFound();
 const changes=KINDS.map(kind=>({
  kind,entries:d.transitions[kind].slice(0,-1).map((x,i)=>({
   from:x.name,to:d.transitions[kind][i+1].name,when:x.endUtc
  }))
 }));
 const other=publicResearchPilotDays().filter(x=>x.date!==date);
 return <article className="page-width verified-hub research-pilot">
  <Link href="/research/panchang/" className="back-link"><ArrowLeft size={16}/> Seven-day research pilot</Link>
  <p className="section-eyebrow">PANCHAVANI · DAILY RESEARCH SERIES · DELHI</p>
  <h1>Delhi Panchang Research Preview</h1>
  <p className="research-day-date"><CalendarDays size={18}/>{date} · {d.panchang.vara}</p>
  <div className="research-warning" role="note">
   <FlaskConical size={25} aria-hidden="true"/>
   <div><strong>Unverified astronomy — public research preview</strong>
    <p>This is a live test of our calculation and publishing pipeline, NOT an independently
    certified daily Panchang. Ayanamsa, city reference elevation and atmospheric conventions
    remain under review. Do not use these results to choose fasting, festival, worship,
    marriage, Muhurat or other ritual dates. Times are rounded to the minute for readability.</p>
   </div>
  </div>
  <section className="research-day-solar" aria-labelledby="research-sun">
   <p className="section-eyebrow">LOCAL SOLAR DAY · PROVISIONAL</p><h2 id="research-sun">Sunrise anchors</h2>
   <div className="research-solar-grid">
    <div><span>Delhi sunrise</span><strong>{IST(d.sun.sunriseUtc)}</strong></div>
    <div><span>Delhi sunset</span><strong>{IST(d.sun.sunsetUtc)}</strong></div>
    <div><span>Next sunrise</span><strong>{IST(d.sun.nextSunriseUtc)}</strong></div>
   </div>
   <p className="research-note">Times are calculated for an estimated city reference point,
    not an independently checked observing station or a measured local horizon.</p>
  </section>
  <section className="research-day-panchang" aria-labelledby="research-limbs">
   <p className="section-eyebrow">SIX PANCHANG COMPONENTS · AT RESEARCH SUNRISE</p>
   <h2 id="research-limbs">What the model calculates</h2>
   <div className="research-limb-grid">
    {KINDS.map(k=><div key={k}><span>{NAME[k]}</span><strong>{d.panchang[k]}</strong>
     <p>{DESC[k]}</p></div>)}
    <div><span>Vara</span><strong>{d.panchang.vara}</strong><p>Weekday by the local civil and solar reference.</p></div>
    <div><span>Paksha</span><strong>{d.panchang.paksha}</strong><p>Research lunar half of the current cycle.</p></div>
   </div>
  </section>
  <section className="research-day-timeline" aria-labelledby="research-timeline">
   <p className="section-eyebrow">CHANGES UNTIL THE FOLLOWING SUNRISE</p>
   <h2 id="research-timeline">Astronomical transition timeline</h2>
   {changes.every(v=>!v.entries.length)?
    <p>None of the four lunar components changes before the following researched sunrise.</p>:
    changes.map(layer=><div className="research-timeline-kind" key={layer.kind}>
     <h3>{NAME[layer.kind]}</h3>
     {layer.entries.length?layer.entries.map(event=><div className="research-event" key={event.when}>
      <time dateTime={event.when}>{IST(event.when)}</time>
      <span>{event.from} <ArrowRight size={13}/> {event.to}</span>
     </div>):<p>No transition before the next sunrise.</p>}
    </div>)}
  </section>
  <section className="research-day-story" aria-labelledby="research-story">
   <p className="section-eyebrow">READING THE SCIENCE · ORIGINAL EXPLANATION</p>
   <h2 id="research-story">{d.titleAngle}</h2>
   {d.editorialParagraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </section>
  <section className="research-method" aria-labelledby="research-provenance">
   <Info size={22} aria-hidden="true"/><div>
    <h2 id="research-provenance">Calculation provenance and limitations</h2>
    <p><strong>Ephemeris:</strong> NASA/JPL DE440s. <strong>Sunrise model:</strong> {d.solarModel}.
     <strong> Sidereal convention:</strong> {d.siderealModel}.
    </p>
    <p>Reference latitude {d.cityReference.latitude}°, longitude {d.cityReference.longitude}°.
     Source record SHA-256 <code>{d.researchSourceRecordSha256}</code>.</p>
    <p>The model is reproducible but NOT independently calibrated, scientifically signed,
     or approved for ritual instructions. No AI was asked to invent the times or reference facts.</p>
    <div className="research-links">
     <a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp"
      rel="noopener noreferrer" target="_blank">NASA/JPL DE440s source <ExternalLink size={15}/></a>
     <a href="https://packolkata.imd.gov.in/panchang/en/explanation" rel="noopener noreferrer" target="_blank">
      Government PAC methodology (not an approval of this date) <ExternalLink size={15}/></a>
    </div>
   </div>
  </section>
  <section className="research-other-days">
   <p className="section-eyebrow">ONE RESEARCH PAGE PER RELEASED DAY</p>
   <h2>Read the rest of the pilot</h2>
   <div>{other.map(x=><Link key={x.date} href={'/research/panchang/delhi/'+x.date+'/'}>
    <CalendarDays size={15}/>{x.date} · {x.titleAngle}</Link>)}</div>
   <Link href="/panchang/delhi/" className="research-back-city">
    <Clock3 size={16}/> Return to the Delhi guide
   </Link>
  </section>
 </article>;
}
