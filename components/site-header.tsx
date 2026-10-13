'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Flower2, Search, MapPin, Menu, X, Settings2, ChevronDown, ArrowUpRight } from 'lucide-react';
import { primaryNav, muhuratCards } from '@/lib/site';
const targets = [
  ...primaryNav.map(n=>({label:n.title,href:n.href,detail:'Explore section'})),
  ...muhuratCards.map(n=>({label:n.title,href:`/muhurat/${n.slug}/`,detail:'Muhurat planning'})),
  {label:'Dussehra',href:'/festivals/dussehra/',detail:'Festival story'},
];
export function SiteHeader() {
 const pathname = usePathname();const router = useRouter();
 const [menu,setMenu]=useState(false);const [query,setQuery]=useState('');const [focused,setFocused]=useState(false);const [cityHelp,setCityHelp]=useState(false);
 const searchRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMenu(false);setCityHelp(false)},[pathname]);
 useEffect(()=>{function onKey(e:KeyboardEvent){if(e.key==='Escape'){setFocused(false);setMenu(false);setCityHelp(false)}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 const found=targets.filter(x=>`${x.label} ${x.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0,6);
 const submit=()=>{if(found.length){router.push(found[0].href);setFocused(false);setQuery('')}};
 return <header className="site-header"><div className="header-inner">
 <Link href="/" className="brand" aria-label="Panchavani home"><span className="brand-mark"><Flower2 size={33} strokeWidth={1.55}/></span><span className="brand-lines"><span className="brand-name">PANCHAVANI</span><span className="brand-tagline">HARMONY WITH COSMIC TIME</span></span></Link>
 <nav className="desktop-nav" aria-label="Main navigation">{primaryNav.map(item=><Link key={item.href} className={pathname===item.href?'active':''} href={item.href}>{item.title}</Link>)}</nav>
 <div className="header-actions"><div className="header-search" ref={searchRef}><Search size={16} aria-hidden="true"/><input aria-label="Search pages" value={query} onChange={e=>{setQuery(e.target.value);setFocused(true)}} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)} onKeyDown={e=>{if(e.key==='Enter')submit()}} placeholder="Search city, festival, muhurat..."/><button className="search-submit" aria-label="Search" onClick={submit}><ArrowUpRight size={14}/></button>
 {focused&&query.length>0&&<div className="search-results" role="listbox">{found.length?found.map(target=><button key={target.href} onMouseDown={e=>e.preventDefault()} onClick={()=>{router.push(target.href);setFocused(false);setQuery('')}}><span>{target.label}</span><small>{target.detail}</small></button>):<p>No preview pages match this search.</p>}</div>}</div>
 <div className="city-wrap"><button className="city-control" onClick={()=>setCityHelp(!cityHelp)} aria-expanded={cityHelp} aria-label="Preview location: Delhi"><MapPin size={16}/><span>Delhi, NCT</span><ChevronDown size={13}/></button>{cityHelp&&<div className="city-tooltip"><strong>Delhi design preview</strong><p>City-specific astronomical data will be enabled after the calculation engine has passed validation.</p><button onClick={()=>setCityHelp(false)}>Got it</button></div>}</div>
 <button className="icon-control header-settings" aria-label="Preview settings" onClick={()=>setCityHelp(!cityHelp)}><Settings2 size={18}/></button><button className="mobile-menu-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu}>{menu?<X size={24}/>:<Menu size={24}/>}</button></div>
 </div>{menu&&<nav className="mobile-nav" aria-label="Mobile navigation">{primaryNav.map(item=><Link key={item.href} className={pathname===item.href?'active':''} href={item.href}>{item.title}<ArrowUpRight size={15}/></Link>)}</nav>}</header>
}
