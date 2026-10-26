import Link from 'next/link';
import type {Metadata} from 'next';
import {CalendarDays,FlaskConical,ArrowRight,ShieldAlert} from 'lucide-react';
import {publicResearchPilotDays} from '@/lib/research-pilot';
export const metadata:Metadata={
 title:'Delhi Seven-Day Panchang Research Pilot',
 description:'Seven-day Delhi Panchang educational research preview with date-scoped reproducible JPL calculations and explicit scientific limitations.',
 robots:{index:false,follow:true},
 alternates:{canonical:'https://panchavani.com/research/panchang/'}
};
export default function ResearchPilotDirectory(){
 const days=publicResearchPilotDays();
 return <div className="page-width verified-hub research-pilot research-directory">
  <p className="section-eyebrow">PANCHAVANI · RESEARCH AND PRODUCT QA</p>
  <h1>Seven days of Delhi Panchang</h1>
  <p className="verified-intro">A limited public preview of the daily publishing workflow.
   New research articles appear one at a time during 27 October — 2 November 2026.
   These are provisional calculations, not independently certified religious advice.</p>
  <section className="research-warning" role="note">
   <ShieldAlert size={24}/><div><strong>Not a verified ritual calendar</strong>
    <p>The pages are excluded from Google's index while we test calculation continuity,
     originality, page quality, accessibility and technical SEO. A future SEO release
     requires a separate source-backed decision.</p></div>
  </section>
  <section aria-labelledby="pilot-list">
   <p className="section-eyebrow">DATE-BY-DATE RESEARCH RELEASE</p>
   <h2 id="pilot-list">Research diary</h2>
   {days.length?<div className="research-daily-list">{days.map(d=>
    <Link href={'/research/panchang/delhi/'+d.date+'/'} key={d.date}>
     <CalendarDays size={19}/>
     <span><strong>{d.date} · {d.titleAngle}</strong>
      <small>Tithi at provisional sunrise: {d.panchang.tithi}</small></span>
     <ArrowRight size={16}/>
    </Link>)}</div>:<p>First Delhi research entry has not been released. The publication
     schedule begins on 27 October 2026 India Standard Time.</p>}
  </section>
  <section className="research-method">
   <FlaskConical size={22}/><div><h2>Why we are running the pilot</h2>
    <p>We are measuring accuracy against method-defined source data, comparing
     page structure and written explanations across dates, and verifying that
     no unapproved research result enters our verified public calendar or sitemap.</p>
    <p>There are no DeepSeek calls or independent scientist signatures in this preview pipeline.
     The model-derived values come from reproducible astronomy code with known limitations.</p>
    <Link href="/learn/what-is-tithi/">Understand the Panchang method <ArrowRight size={15}/></Link>
   </div>
  </section>
 </div>;
}
