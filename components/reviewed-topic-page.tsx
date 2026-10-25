import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowRight,CalendarDays,Clock3,ExternalLink,MapPin,ShieldCheck} from 'lucide-react';
import {approvedCityDays,CITY_GUIDES,indiaTime} from '@/lib/public-panchang';
import type {ApprovedCityDay} from '@/lib/public-panchang';
import {publishedTopic} from '@/lib/public-topics';

const byIst=(iso:string)=>new Intl.DateTimeFormat('en-IN',{
 timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',
 hour:'2-digit',minute:'2-digit',hour12:false
}).format(new Date(iso))+' IST';
const topicBase=(kind:string)=>kind==='calendar-month'?'/calendar/':
 kind==='festival'?'/festivals/':kind==='vrat'?'/vrat/':'/muhurat/';
export function reviewedTopicMetadata(path:string):Metadata{
 const article=publishedTopic(path);
 if(!article)return {robots:{index:false,follow:false}};
 return {title:article.editorial.headline,
  description:article.editorial.description,
  robots:{index:true,follow:true},
  alternates:{canonical:'https://panchavani.com'+article.path},
  openGraph:{title:article.editorial.headline,
   description:article.editorial.description,
   url:'https://panchavani.com'+article.path,type:'article'}};
}
export function ReviewedTopicPage({path}:{path:string}){
 const article=publishedTopic(path);
 if(!article)notFound();
 const city=CITY_GUIDES[article.cityId as keyof typeof CITY_GUIDES];
 if(!city)notFound();
 const released=approvedCityDays();
 const sourceRefs=article.sourceDays as {date:string;sourceRecordHash:string}[];
 const facts:ApprovedCityDay[]=sourceRefs.map(ref=>
  released.find((x:ApprovedCityDay)=>x.cityId===article.cityId&&x.date===ref.date&&x.sourceRecordHash===ref.sourceRecordHash)
 ).filter((x:ApprovedCityDay|undefined):x is ApprovedCityDay=>Boolean(x));
 if(facts.length!==article.sourceDays.length)notFound();
 const result=article.verifiedResult as null|{dates:string[];windows?:{
  date:string;startUtc:string;endUtc:string
 }[]};
 const rituals=article.ritualReview as null|{tradition:string;expertReviewer:string;
   sources:{label:string;url:string}[]};
 return <main className="page-width topic-verified-page">
  <header className="topic-verified-hero">
   <Link href={topicBase(article.kind)} className="back-link"><ArrowLeft size={14}/> Explore {article.kind.replace('-',' ')}</Link>
   <p className="section-eyebrow">PANCHAVANI · {city.region.toUpperCase()} · SCIENCE & SOURCE REVIEWED</p>
   <h1>{article.editorial.headline}</h1>
   <p className="topic-verified-dek">{article.editorial.description}</p>
   <div className="topic-verified-facts"><span><MapPin size={15}/>{city.label}</span>
    <span><CalendarDays size={15}/>{article.month}</span>
    <span><ShieldCheck size={15}/> Independently reviewed evidence</span></div>
  </header>
  <div className="topic-verified-grid">
   <article className="topic-verified-main">
    <p className="topic-verified-lead">{article.editorial.lead}</p>
    {result&&<section className="topic-verified-outcome">
     <p className="section-eyebrow">INDEPENDENTLY REVIEWED OBSERVANCE</p>
     <h2>{article.kind==='muhurat'?'Approved local ceremony windows':
       article.kind==='vrat'?'Reviewed fasting/Parana context':
       'Reviewed local festival date'}</h2>
     <p>Dates below come from a separately reviewed tradition-specific rule set, not from a language model.</p>
     <div className="topic-verified-tags">
      {result.dates.map((day:string)=><span key={day}>{day}</span>)}
     </div>
     {result.windows?.map((w,index:number)=><div key={index} className="topic-verified-window">
      <Clock3 size={16}/>
      <span>{byIst(w.startUtc)} – {byIst(w.endUtc)}</span>
     </div>)}
     <p className="topic-verified-small">Tradition: {rituals?.tradition}</p>
    </section>}
    {article.editorial.sections.map((section:{heading:string;body:string},i:number)=>
     <section className="topic-verified-chapter" key={section.heading}>
      <p className="section-eyebrow">CHAPTER {String(i+1).padStart(2,'0')}</p>
      <h2>{section.heading}</h2><p>{section.body}</p>
     </section>)}
    <section className="topic-verified-chapter">
     <p className="section-eyebrow">ACTUAL CITY-AND-DAY DATA</p>
     <h2>{article.kind==='calendar-month'?'Local solar days in this calendar month':'Astronomical inputs used for the reviewed result'}</h2>
     <p>These values are deterministic and sourced from the independently reviewed city/day release. Different cities may share geocentric lunar transitions while having different local sunrises.</p>
     <div className="topic-verified-scroll"><table className="topic-verified-table">
      <thead><tr><th>Local day</th><th>Sunrise · IST</th><th>Tithi</th><th>Nakshatra</th><th>Yoga</th><th>Karana</th></tr></thead>
      <tbody>{facts.map(x=><tr key={x.date}>
       <td><Link href={`/panchang/${article.cityId}/${x.date}/`}>{x.date} <ArrowRight size={12}/></Link></td>
       <td>{indiaTime(x.sun.sunriseUtc)}</td><td>{x.panchang.tithi}</td>
       <td>{x.panchang.nakshatra}</td><td>{x.panchang.yoga}</td><td>{x.panchang.karana}</td>
      </tr>)}</tbody>
     </table></div>
    </section>
    <section className="topic-verified-chapter">
     <p className="section-eyebrow">READER QUESTIONS</p><h2>Questions answered</h2>
     {article.editorial.faqs.map((faq:{question:string;answer:string})=>
       <div className="topic-verified-faq" key={faq.question}>
        <h3>{faq.question}</h3><p>{faq.answer}</p>
       </div>)}
    </section>
   </article>
   <aside className="topic-verified-aside">
    <div className="topic-verified-side-panel">
     <p className="section-eyebrow">LOCAL SOURCES & METHODOLOGY</p>
     <h2>Check the evidence</h2>
     <p>Scientific and regional source review precedes this article. Distinguish astronomy from observance rules when comparing other almanacs.</p>
     {article.editorial.sources.map((src:{url:string;label:string})=>
      <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer">{src.label} <ExternalLink size={13}/></a>)}
     {rituals?.sources?.map((src:{url:string;label:string})=>
      <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer">{src.label} <ExternalLink size={13}/></a>)}
    </div>
    <div className="topic-verified-side-panel">
     <p className="section-eyebrow">WHY THIS CITY MATTERS</p>
     {article.editorial.localEvidence.map((ref:{factId:string;localRelevance:string})=>
      <p key={ref.factId}>{ref.localRelevance}</p>)}
     <Link href={`/panchang/${article.cityId}/`}>Read {city.label} Panchang guide <ArrowRight size={14}/></Link>
    </div>
   </aside>
  </div>
 </main>;
}
