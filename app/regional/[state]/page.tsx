import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowRight,BookOpen,MapPin} from 'lucide-react';
import {regionalCards,ASSET} from '@/lib/site';
import {CITY_GUIDES} from '@/lib/public-panchang';

type Props={params:Promise<{state:string}>};
const details={
 'uttar-pradesh':{
  intro:'Read the local sunrise first, then consider the calendar tradition used for the observance. A state alone is not a precise astronomical location.',
  cities:['varanasi'],
  question:'Why is a Varanasi sunrise not interchangeable with a different city?',
  answer:'The country shares India Standard Time, but sunrise depends on latitude, longitude and the observation convention. A Tithi may change close to that sunrise, affecting the day label.'},
 'maharashtra':{
  intro:'Compare the Mumbai and Pune local-sunrise guides and keep a lunar transition separate from the observance rule used by a particular community.',
  cities:['mumbai','pune'],
  question:'Can Mumbai and Pune have a different sunrise-day Tithi?',
  answer:'Yes, when a Tithi transition falls between the local sunrises. Its astronomical event time remains one instant, while the two dawns can differ.'},
 'tamil-nadu':{
  intro:'Start with the Chennai city reference and verify the month and observance convention when reading a Tamil-calendar festival.',
  cities:['chennai'],
  question:'Why might a regional month label differ?',
  answer:'Calendar traditions can use different month-naming and observance rules. Local sunrise and lunar transitions are astronomical inputs; they do not alone determine every festival label.'},
 'karnataka':{
  intro:'Use the Bengaluru sunrise and verify the rule used by the actual family, community or calendar source. Do not assume one state-wide ritual rule.',
  cities:['bengaluru'],
  question:'Which timestamps should I compare?',
  answer:'Compare sunrise for the chosen city and the exact Tithi or Nakshatra transition on the same IST clock, then identify the observance rule.'},
 'gujarat':{
  intro:'Keep Ahmedabad sunrise, lunar month convention and observance dates distinct. One regional label is not enough to certify a date.',
  cities:['ahmedabad'],
  question:'Can the same lunar event carry different month labels?',
  answer:'Yes. Some calendar systems differ in the way lunar months are identified. First align the calendar system, then compare time boundaries and local observances.'},
} as const;
export function generateStaticParams(){return regionalCards.map(region=>({state:region.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {state}=await params;
 const card=regionalCards.find(x=>x.slug===state);
 if(!card)return {robots:{index:false,follow:false}};
 return {title:card.name+' Panchang — Regional Calendar Guide',
  description:'Understand local sunrise, lunar-day boundaries and the calendar questions to check for '+card.name+'.',
  robots:{index:false,follow:false},
  alternates:{canonical:'https://panchavani.com/regional/'+state+'/'}
 };
}
export default async function RegionPage({params}:Props){
 const {state}=await params;
 const card=regionalCards.find(r=>r.slug===state);
 if(!card||!(state in details))notFound();
 const info=details[state as keyof typeof details];
 return <div className="interior-page editorial-hub">
  <header className="interior-hero" style={{backgroundImage:`linear-gradient(90deg,#080d14,rgba(8,13,20,.87),rgba(8,13,20,.25)),url('${ASSET(card.img)}')`}}>
   <div className="page-width interior-hero-content">
    <Link className="back-link" href="/regional/"><ArrowLeft size={15}/> All regions</Link>
    <p className="section-eyebrow">REGIONAL CALENDAR GUIDE</p>
    <h1>{card.name}</h1><p className="editorial-hero-intro">{info.intro}</p>
    <p className="editorial-status"><BookOpen size={15}/> Educational guide · Unverified observance dates are not shown</p>
   </div>
  </header>
  <div className="page-width editorial-region-layout">
   <section className="editorial-intro-block">
    <p className="section-eyebrow">A USEFUL STARTING POINT</p>
    <h2>{info.question}</h2><p>{info.answer}</p>
   </section>
   <section className="editorial-chapter">
    <p className="section-eyebrow">CITY-LEVEL REFERENCES</p>
    <h2>Explore the local Panchang</h2>
    <p>Choose a city to read its sunrise and calendar method. These are educational guides, not unreviewed date predictions.</p>
    <div className="editorial-region-cities">
     {info.cities.map(city=><Link key={city} href={`/panchang/${city}/`}>
      <MapPin size={20} aria-hidden="true"/>
      <span><strong>{CITY_GUIDES[city].label}</strong><small>{CITY_GUIDES[city].tagline}</small></span>
      <ArrowRight size={18} aria-hidden="true"/>
     </Link>)}
    </div>
   </section>
   <section className="editorial-region-footer">
    <h2>What about regional festivals and fasting dates?</h2>
    <p>An event date needs a named calendar tradition and a reviewed observance rule. We do not infer those rules from geography alone.</p>
    <Link href="/festivals/">Understand festivals <ArrowRight size={17}/></Link>
    <Link href="/vrat/">Understand Vrat rules <ArrowRight size={17}/></Link>
   </section>
  </div>
 </div>;
}
