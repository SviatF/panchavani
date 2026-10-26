import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowRight,BookOpen,Clock3,ExternalLink,Info,CheckCircle2} from 'lucide-react';
import {learningGuides,learningSlugs,type LearningSlug} from '@/lib/learning-guides';
import {isIndexableLearningGuide} from '@/lib/seo-release-manifest';

type Props={params:Promise<{topic:string}>};
function isTopic(v:string):v is LearningSlug{return learningSlugs.some(x=>x===v);}
export function generateStaticParams(){return learningSlugs.map(topic=>({topic}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {topic}=await params;
 if(!isTopic(topic))return {robots:{index:false,follow:false}};
 const article=learningGuides[topic];
 return {
  title:article.title,
  description:article.description,
  alternates:{canonical:'https://panchavani.com/learn/'+topic+'/'},
  robots:{index:isIndexableLearningGuide(topic),follow:isIndexableLearningGuide(topic)},
  openGraph:{type:'article',title:article.title,description:article.description,
   url:'https://panchavani.com/learn/'+topic+'/'}
 };
}
export default async function LearningArticle({params}:Props){
 const {topic}=await params;
 if(!isTopic(topic))notFound();
 const article=learningGuides[topic];
 const related=learningSlugs.filter(slug=>slug!==topic);
 return <article className="learning-article">
  <div className="page-width learning-article-head">
   <Link href="/learn/" className="back-link"><ArrowLeft size={16}/> Learning library</Link>
   <p className="section-eyebrow">{article.eyebrow} · {article.readTime}</p>
   <h1>{article.title}</h1>
   <p className="learning-dek">{article.lead}</p>
   <div className="learning-disclosure"><Info size={18} aria-hidden="true"/>
    <p>Educational explainer. This page does not provide verified city/date astronomy,
    festival dates or Muhurat recommendations. Indexing is controlled separately
    by an independently reviewed editorial and SEO release.</p>
   </div>
  </div>
  <div className="page-width learning-layout">
   <div className="learning-copy">
    <section className="learning-summary" aria-labelledby="guide-summary">
     <p className="section-eyebrow">THE ESSENTIAL IDEA</p>
     <h2 id="guide-summary">{article.summary}</h2>
     <p>{article.keyPoint}</p>
    </section>
    {article.sections.map((s,i)=><section className="learning-chapter" key={s.title} aria-labelledby={'chapter-'+i}>
     <p className="section-eyebrow">CHAPTER {String(i+1).padStart(2,'0')}</p>
     <h2 id={'chapter-'+i}>{s.title}</h2>
     {s.paragraphs.map((p,j)=><p key={j}>{p}</p>)}
     {'list' in s&&s.list&&<ul>{s.list.map(x=><li key={x}><CheckCircle2 size={16}/>{x}</li>)}</ul>}
    </section>)}
    <section className="learning-example" aria-labelledby="worked-example">
     <p className="section-eyebrow">PRACTICAL EXAMPLE · ILLUSTRATIVE, NOT LIVE DATA</p>
     <h2 id="worked-example">{article.workedExample.title}</h2>
     <p>{article.workedExample.setup}</p>
     <ol>{article.workedExample.steps.map(step=><li key={step}>{step}</li>)}</ol>
     <strong>{article.workedExample.conclusion}</strong>
    </section>
    <section className="learning-chapter" aria-labelledby="common-errors">
     <p className="section-eyebrow">READING SAFELY</p>
     <h2 id="common-errors">Three mistakes to avoid</h2>
     <ul>{article.commonMistakes.map(x=><li key={x}><Info size={16}/>{x}</li>)}</ul>
    </section>
    <section className="learning-chapter learning-faq" aria-labelledby="questions">
     <p className="section-eyebrow">READER QUESTIONS</p>
     <h2 id="questions">Frequently asked questions</h2>
     {article.faqs.map(f=><div key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></div>)}
    </section>
    <section className="learning-sources" aria-labelledby="sources">
     <p className="section-eyebrow">REFERENCE MATERIAL</p>
     <h2 id="sources">Methods and sources</h2>
     <p>These references explain the mathematical and publishing conventions.
     They are not independent certification of PANCHAVANI’s daily research calculations.</p>
     {article.references.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
      <span><strong>{s.label}</strong><small>{s.detail}</small></span><ExternalLink size={15}/></a>)}
    </section>
   </div>
   <aside className="learning-aside" aria-label="Further reading">
    <div className="learning-sidebox">
     <BookOpen size={22} aria-hidden="true"/>
     <p className="section-eyebrow">LEARN THE METHOD</p>
     <h2>Explore further</h2>
     <p>Understand the astronomical quantities before reading date-specific results.</p>
     {related.map(slug=><Link href={'/learn/'+slug+'/'} key={slug}>
      <span>{learningGuides[slug].title}</span><ArrowRight size={16}/>
     </Link>)}
     <Link href="/panchang/" className="learning-city-link">Browse city guides <ArrowRight size={16}/></Link>
    </div>
    <div className="learning-sidebox learning-method-note">
     <Clock3 size={20}/><h2>What is not claimed</h2>
     <p>No computed Tithi, sunrise, festival or Muhurat result on this educational page is presented as scientifically verified.</p>
    </div>
   </aside>
  </div>
 </article>;
}
