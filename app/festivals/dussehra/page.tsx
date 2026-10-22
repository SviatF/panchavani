import Link from 'next/link';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowRight,BookOpen,Info} from 'lucide-react';
import {ASSET} from '@/lib/site';

export const metadata:Metadata={
 title:'Dussehra (Vijayadashami) — Meaning and Calendar Traditions',
 description:'Learn about Vijayadashami, its stories and why local observance dates require a documented calendar rule.',
 robots:{index:false,follow:false},
 alternates:{canonical:'https://panchavani.com/festivals/dussehra/'}
};
const stories=[
 {title:'Rama and Ravana',body:'In many communities, Dussehra remembers the victory of Rama over Ravana. Performances of the Ramayana and the symbolic burning of Ravana effigies are among the better-known celebrations.'},
 {title:'Durga and Mahishasura',body:'Other communities associate Vijayadashami with the victory of the goddess Durga over Mahishasura, following the days of Durga Puja or Navratri observance.'},
 {title:'Different local practices',body:'Public celebrations, family customs and the day’s ritual activities vary by community and location. One region’s celebration is not a universal rule for another.'},
];
export default function DussehraPage(){
 return <div className="interior-page editorial-hub">
  <header className="interior-hero" style={{backgroundImage:`linear-gradient(90deg,#070d14,rgba(7,11,17,.82),rgba(7,11,17,.25)),url('${ASSET('festival-dussehra')}')`}}>
   <div className="page-width interior-hero-content">
    <Link className="back-link" href="/festivals/"><ArrowLeft size={15}/> Festival guides</Link>
    <p className="section-eyebrow">VIJAYADASHAMI · FESTIVAL GUIDE</p>
    <h1>Dussehra</h1>
    <p className="editorial-hero-intro">A festival associated with the victory of good over evil and celebrated through different stories and local traditions.</p>
    <p className="editorial-status"><Info size={15}/> Educational background · No unverified festival date</p>
   </div>
  </header>
  <div className="page-width editorial-region-layout">
   <section className="editorial-intro-block">
    <p className="section-eyebrow">THE ESSENTIAL IDEA</p>
    <h2>What does Vijayadashami celebrate?</h2>
    <p>Vijayadashami is often associated with the triumph of dharma over adharma. Its meaning is expressed through distinct regional stories and observances. Understanding the event is different from determining its exact date in a given calendar tradition.</p>
   </section>
   <section className="editorial-chapter">
    <div className="editorial-section-heading">
     <span className="editorial-index">01</span>
     <div><p className="section-eyebrow">TRADITIONS</p><h2>How Dussehra is observed</h2></div>
    </div>
    <div className="editorial-basics-grid">
     {stories.map((story,index)=><article className="editorial-basic-card" key={story.title}>
      <span className="editorial-card-number">{String(index+1).padStart(2,'0')}</span>
      <h3>{story.title}</h3><p>{story.body}</p>
     </article>)}
    </div>
   </section>
   <section className="editorial-chapter editorial-checklist">
    <div className="editorial-section-heading">
     <span className="editorial-index">02</span>
     <div><p className="section-eyebrow">BEFORE READING A DATE</p><h2>What a date source should specify</h2></div>
    </div>
    <ul>
     <li><BookOpen size={17}/> The tradition or observance being dated</li>
     <li><BookOpen size={17}/> The lunar month, Tithi and relevant observance rule</li>
     <li><BookOpen size={17}/> Local reference city, time and calendar convention</li>
     <li><BookOpen size={17}/> A verified source for the final civil date</li>
    </ul>
   </section>
   <section className="editorial-region-footer">
    <h2>Continue exploring</h2>
    <p>Learn how regional traditions and lunar-calendar dates relate before comparing festival dates.</p>
    <Link href="/regional/">Regional calendar traditions <ArrowRight size={17}/></Link>
    <Link href="/calendar/">Understanding the lunar calendar <ArrowRight size={17}/></Link>
   </section>
  </div>
 </div>;
}
