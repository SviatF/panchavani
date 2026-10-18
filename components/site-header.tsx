'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Menu, X, Settings2, ChevronDown, ArrowUpRight } from 'lucide-react';
import { primaryNav, muhuratCards } from '@/lib/site';
import {CITY_OPTIONS,isGuideCity,useResearchCity} from '@/components/city-selection';
const targets = [
  ...primaryNav.map(n=>({label:n.title,href:n.href,detail:'Explore section'})),
  ...muhuratCards.map(n=>({label:n.title,href:`/muhurat/${n.slug}/`,detail:'Muhurat planning'})),
  {label:'Dussehra',href:'/festivals/dussehra/',detail:'Festival story'},
  ...CITY_OPTIONS.map(city=>({label:city.label+' Panchang',href:'/panchang/'+city.id+'/',detail:city.region+' · Local city guide'})),
];
export function SiteHeader() {
 const pathname = usePathname();const router = useRouter();
 const {cityId,setCityId}=useResearchCity();
 const city=CITY_OPTIONS.find(item=>item.id===cityId)??CITY_OPTIONS[0];
 const [menu,setMenu]=useState(false);const [query,setQuery]=useState('');const [focused,setFocused]=useState(false);const [cityHelp,setCityHelp]=useState(false);const [scrolled,setScrolled]=useState(false);
 const searchRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMenu(false);setCityHelp(false);
  const pathCity=pathname?.match(/^\/panchang\/([a-z-]+)\/(?:$|\d{4}-\d{2}-\d{2}\/)/)?.[1];
  if(pathCity&&isGuideCity(pathCity))setCityId(pathCity);
 },[pathname]);
 useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>28);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[]);
 useEffect(()=>{function onKey(e:KeyboardEvent){if(e.key==='Escape'){setFocused(false);setMenu(false);setCityHelp(false)}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 const found=targets.filter(x=>`${x.label} ${x.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0,6);
 const submit=()=>{if(found.length){router.push(found[0].href);setFocused(false);setQuery('')}};
 return <header className={`site-header ${pathname==='/'?'site-header--home':'site-header--interior'} ${scrolled?'is-scrolled':''}`}><div className="header-inner">
 <Link href="/" className="brand" aria-label="Panchavani home"><span className="brand-mark"><img src="/imgs/logo.webp" width="48" height="48" alt="" decoding="async"/></span><span className="brand-lines"><span className="brand-name">PANCHAVANI</span><span className="brand-tagline">HARMONY WITH COSMIC TIME</span></span></Link>
 <nav className="desktop-nav" aria-label="Main navigation">{primaryNav.map(item=><Link key={item.href} className={pathname===item.href?'active':''} href={item.href}>{item.title}</Link>)}</nav>
 <div className="header-actions"><div className="header-search" ref={searchRef}><Search size={16} aria-hidden="true"/><input aria-label="Search pages" value={query} onChange={e=>{setQuery(e.target.value);setFocused(true)}} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)} onKeyDown={e=>{if(e.key==='Enter')submit()}} placeholder="Search sections and guides..."/><button className="search-submit" aria-label="Search" onClick={submit}><ArrowUpRight size={14}/></button>
 {focused&&query.length>0&&<div className="search-results" role="listbox">{found.length?found.map(target=><button key={target.href} onMouseDown={e=>e.preventDefault()} onClick={()=>{router.push(target.href);setFocused(false);setQuery('')}}><span>{target.label}</span><small>{target.detail}</small></button>):<p>No matching pages.</p>}</div>}</div>
 <div className="city-wrap"><button className="city-control" onClick={()=>setCityHelp(!cityHelp)} aria-expanded={cityHelp} aria-label={`Choose city, currently ${city.label}`}><MapPin size={16}/><span>{city.label}, {city.region}</span><ChevronDown size={13}/></button>{cityHelp&&<div className="city-tooltip" role="group" aria-label="Research city selector"><strong>Select city</strong><p className="city-picker-hint">Choose any of our ten city guides. Only independently reviewed daily values are published.</p>{CITY_OPTIONS.map(item=><button className={`city-option ${item.id===cityId?'is-active':''}`} type="button" key={item.id} aria-pressed={item.id===cityId} onClick={()=>{setCityId(item.id);setCityHelp(false);if(pathname?.startsWith('/panchang/'))router.push('/panchang/'+item.id+'/')}}><span>{item.label}</span><small>{item.region}</small></button>)}<p className="city-picker-disclaimer">Scientific date calculations remain separate from the city guides until reviewed.</p></div>}</div>
 <Link className="icon-control header-settings" aria-label="Explore astronomy tools" href="/tools/"><Settings2 size={18}/></Link><button className="mobile-menu-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu}>{menu?<X size={24}/>:<Menu size={24}/>}</button></div>
 </div>{menu&&<nav className="mobile-nav" aria-label="Mobile navigation">{primaryNav.map(item=><Link key={item.href} className={pathname===item.href?'active':''} href={item.href}>{item.title}<ArrowUpRight size={15}/></Link>)}</nav>}</header>
}
