import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowRight,ArrowLeft,BookOpen,Check,Compass,Info} from 'lucide-react';
import {ASSET,sectionData} from '@/lib/site';
import {sectionExperience} from '@/lib/section-experience';

type Section=keyof typeof sectionExperience;
type Props={params:Promise<{section:string}>};
const sections=Object.keys(sectionExperience) as Section[];
const isSection=(value:string):value is Section=>sections.some(x=>x===value);

export function generateStaticParams(){return sections.map(section=>({section}));}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {section}=await params;
 if(!isSection(section))return {robots:{index:false,follow:false}};
 const config=sectionData[section];
 return {
  title:config.title+' — Understand the Basics',
  description:config.text,
  robots:{index:false,follow:false},
  alternates:{canonical:'https://panchavani.com/'+section+'/'},
 };
}

export default async function SectionPage({params}:Props){
 const {section}=await params;
 if(!isSection(section))notFound();
 const config=sectionData[section];
 const content=sectionExperience[section];
 return <div className="interior-page editorial-hub">
  <header className="interior-hero" style={{
   backgroundImage:`linear-gradient(90deg,rgba(5,9,15,.96),rgba(7,10,15,.82) 47%,rgba(7,10,15,.32)),url('${ASSET(config.image)}')`
  }}>
   <div className="page-width interior-hero-content">
    <Link className="back-link" href="/"><ArrowLeft size={15}/> Home</Link>
    <p className="section-eyebrow">{config.eyebrow}</p>
    <h1>{config.title}</h1>
    <p className="editorial-hero-intro">{config.text}</p>
    <p className="editorial-status"><Info size={15} aria-hidden="true"/>{content.status}</p>
   </div>
  </header>
  <div className="page-width editorial-layout">
   <div className="editorial-main">
    <section className="editorial-intro-block" aria-labelledby="reading-question">
     <p className="section-eyebrow">START HERE</p>
     <h2 id="reading-question">{content.question}</h2>
     <p>{content.answer}</p>
    </section>
    <section aria-labelledby="basics-title" className="editorial-chapter">
     <div className="editorial-section-heading">
      <span className="editorial-index">01</span>
      <div><p className="section-eyebrow">QUICK EXPLANATIONS</p><h2 id="basics-title">Understand the essentials</h2></div>
     </div>
     <div className="editorial-basics-grid">
      {content.basics.map((block,index)=><article key={block.heading} className="editorial-basic-card">
       <span className="editorial-card-number">{String(index+1).padStart(2,'0')}</span>
       <h3>{block.heading}</h3>
       <p>{block.body}</p>
      </article>)}
     </div>
    </section>
    <section className="editorial-chapter editorial-checklist" aria-labelledby="checklist-title">
     <div className="editorial-section-heading">
      <span className="editorial-index">02</span>
      <div><p className="section-eyebrow">PRACTICAL CHECKLIST</p><h2 id="checklist-title">What to check</h2></div>
     </div>
     <ul>{content.checklist.map(item=><li key={item}><Check size={17} aria-hidden="true"/><span>{item}</span></li>)}</ul>
    </section>
    <section className="editorial-chapter editorial-faq" aria-labelledby="faq-title">
     <div className="editorial-section-heading">
      <span className="editorial-index">03</span>
      <div><p className="section-eyebrow">COMMON QUESTIONS</p><h2 id="faq-title">A clear answer</h2></div>
     </div>
     {content.faqs.map(faq=><article key={faq.question}>
      <h3>{faq.question}</h3><p>{faq.answer}</p>
     </article>)}
    </section>
   </div>
   <aside className="editorial-sidebar" aria-label="Continue exploring">
    <div className="editorial-sidebar-inner">
     <Compass size={21} aria-hidden="true"/>
     <p className="section-eyebrow">GO FURTHER</p>
     <h2>Explore this topic</h2>
     <p>Choose the next question you want to answer.</p>
     <div className="editorial-related-links">
      {content.links.map(item=><Link key={item.href} href={item.href}>
       <span><strong>{item.title}</strong><small>{item.description}</small></span>
       <ArrowRight size={17} aria-hidden="true"/>
      </Link>)}
     </div>
     <div className="editorial-sidebar-note"><BookOpen size={17} aria-hidden="true"/>
      <p>Astronomical timings and religious observance rules are different kinds of evidence. PANCHAVANI does not present research estimates as verified advice.</p>
     </div>
    </div>
   </aside>
  </div>
 </div>;
}
