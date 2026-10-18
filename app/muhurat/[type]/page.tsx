import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ExternalLink,MapPin,ShieldAlert} from 'lucide-react';
import {muhuratCards,ASSET} from '@/lib/site';
import {CITY_GUIDES,CITY_GUIDE_IDS} from '@/lib/public-panchang';
import guides from '@/data/muhurat-guides.json';

export function generateStaticParams(){return muhuratCards.map(card=>({type:card.slug}));}
type Props={params:Promise<{type:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {type}=await params;
 const item=muhuratCards.find(x=>x.slug===type);
 if(!item)return {robots:{index:false,follow:false}};
 const copy=guides[item.slug];
 return {
  title:item.title+' — Rules, Local Timing and Source Guide',
  description:copy.summary,
  robots:{index:false,follow:false},
  alternates:{canonical:'https://panchavani.com/muhurat/'+type+'/'},
 };
}
export default async function MuhuratDetails({params}:Props){
 const {type}=await params;
 const card=muhuratCards.find(x=>x.slug===type);
 if(!card)notFound();
 const guide=guides[card.slug];
 return <div className="interior-page">
  <div className="interior-hero" style={{backgroundImage:`linear-gradient(90deg,#080e17,rgba(6,10,16,.87),rgba(6,10,16,.12)),url('${ASSET(card.img)}')`}}>
   <div className="page-width interior-hero-content">
    <Link className="back-link" href="/muhurat/"><ArrowLeft size={15}/> All Muhurat types</Link>
    <span className="section-eyebrow">PANCHAVANI · {guide.eyebrow}</span>
    <h1>{card.title}</h1>
    <p>{guide.lead}</p>
    <span className="research-note">Educational methodology · No unreviewed auspicious dates</span>
   </div>
  </div>
  <div className="page-width interior-body">
   <div className="interior-feature">
    <span>THE PRACTICAL QUESTION</span>
    <h2>What makes a date eligible?</h2><p>{guide.summary}</p>
   </div>
   <div className="verified-explain">
    {guide.sections.map((section,index)=><article key={section.title}>
      <span className="section-eyebrow">STEP {index+1} OF 3</span>
      <h2>{section.title}</h2><p>{section.body}</p>
    </article>)}
   </div>
   <section className="verified-release">
    <div><p className="section-eyebrow">EVIDENCE BEFORE A RECOMMENDATION</p>
     <h2>What a real {card.title.toLowerCase()} calculation must verify</h2></div>
    <ul>{guide.checklist.map(text=><li key={text}>
     <CheckCircle2 size={16} aria-hidden="true"/> {text}
    </li>)}</ul>
    <div className="verified-method"><ShieldAlert size={22}/><p>{guide.state}</p></div>
   </section>
   <section className="verified-release">
    <div><p className="section-eyebrow">FREQUENTLY ASKED QUESTION</p><h2>{guide.question}</h2></div>
    <p>{guide.answer}</p>
   </section>
   <section className="verified-release">
    <div><p className="section-eyebrow">COMPARE SOURCES</p><h2>Published astronomical and rule references</h2></div>
    <p>The following independent publications describe astronomical components or traditional selection criteria. They do not certify PANCHAVANI's provisional research results or authorize the dates on this page.</p>
    <ul>{guide.references.map(source=><li key={source.url}>
     <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={14}/></a>
    </li>)}</ul>
   </section>
   <section className="verified-release">
    <div><p className="section-eyebrow">LOCATION IS PART OF THE QUESTION</p>
     <h2>Choose a city to understand the local Panchang</h2></div>
    <p>India Standard Time is shared nationally, but local sunrise calculations depend on the chosen city. Select the location of the event before comparing any proposed Muhurat window.</p>
    <div className="verified-city-grid">{CITY_GUIDE_IDS.map(id=><Link
     className="verified-city-card" href={`/panchang/${id}/`} key={id}>
     <MapPin size={18}/><h2>{CITY_GUIDES[id].label}</h2>
     <span className="verified-link">City guide <ArrowRight size={15}/></span>
    </Link>)}</div>
   </section>
   <div className="interior-links"><h2>Learn the underlying Panchang</h2>
    <Link href="/panchang/"><BookOpen size={17}/> Explore ten city guides <ArrowRight size={16}/></Link>
    <Link href="/learn/">Understand the five Angas <ArrowRight size={17}/></Link>
   </div>
  </div>
 </div>;
}
