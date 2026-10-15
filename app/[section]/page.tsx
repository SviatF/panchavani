import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { ASSET, sectionData, type SectionSlug, muhuratCards, regionalCards } from '@/lib/site';

export function generateStaticParams(){return Object.keys(sectionData).filter(section=>section!=='panchang').map(section=>({section}));}
type Props={params:Promise<{section:string}>};
export default async function SectionPage({params}:Props){
 const {section}=await params;
 if(!Object.hasOwn(sectionData,section))notFound();
 const data=sectionData[section as SectionSlug];
 return <div className="interior-page"><div className="interior-hero" style={{backgroundImage:`linear-gradient(90deg,#070d14 14%,rgba(7,13,20,.76),rgba(7,13,20,.24)),url('${ASSET(data.image)}')`}}><div className="page-width interior-hero-content"><Link href="/" className="back-link"><ArrowLeft size={15}/> Back to today</Link><span className="section-eyebrow">{data.eyebrow}</span><h1>{data.title}</h1><p>{data.text}</p><span className="research-note">Day-specific timings will be displayed only after scientific verification.</span></div></div><div className="page-width interior-body"><div className="interior-feature"><span>BEHIND THE EXPERIENCE</span><h2>Clarity before complexity.</h2><p>{data.feature}</p><p>We will publish location-specific results only after method and accuracy checks. The educational content does not claim unverified daily timings.</p></div><div className="interior-links"><h2>Explore the experience</h2>{muhuratCards.map(card=><Link href={`/muhurat/${card.slug}/`} key={card.slug}>{card.title}<ArrowRight size={16}/></Link>)}{regionalCards.slice(0,2).map(card=><Link href={`/regional/${card.slug}/`} key={card.slug}>{card.name}<ArrowRight size={16}/></Link>)}</div></div></div>;
}
